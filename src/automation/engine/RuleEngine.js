/**
 * Rule Engine Module
 * 
 * Integrates json-rules-engine (v6+) for evaluating AutomationRule instances
 * against runtime data from tasks, exercises, and journal modules.
 */

import { Engine } from 'json-rules-engine';
import { toJsonRulesEngineFormat } from '../models/AutomationRule.js';
import { getTasks } from '../../tasks/crud/index.js';
import { getExercises, getExerciseGoals, getExerciseLogs } from '../../exercises/crud/index.js';
import { getJournalEntries } from '../../journal/crud/index.js';

/**
 * Custom error class for rule engine operations
 */
export class RuleEngineError extends Error {
  constructor(message, code = 'RULE_ENGINE_ERROR') {
    super(message);
    this.name = 'RuleEngineError';
    this.code = code;
  }
}

/**
 * Rule Engine class for evaluating automation rules
 */
export class RuleEngine {
  constructor(options = {}) {
    this.engine = new Engine([], options);
    this.rules = new Map(); // Map of ruleId -> rule object
    this.factCache = new Map(); // Cache for fact values
    this.cacheTimeout = options.cacheTimeout || 5000; // 5 seconds default
    
    // Register custom fact providers
    this._registerFactProviders();
  }

  /**
   * Helper to get and cache a task by ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object|null>} Task object or null
   * @private
   */
  async _getTask(taskId) {
    if (!taskId) return null;
    
    const cacheKey = `task.${taskId}`;
    if (this._isCacheValid(cacheKey)) {
      return this.factCache.get(cacheKey).value;
    }
    
    try {
      const tasks = await getTasks({});
      const task = tasks.find(t => t.id === taskId) || null;
      this._setCache(cacheKey, task);
      return task;
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  }

  /**
   * Registers fact providers for task, exercise, and journal data
   * @private
   */
  _registerFactProviders() {
    // Task facts
    this.engine.addFact('task.status', async (params, almanac) => {
      let taskId = params?.taskId;
      if (!taskId) {
        try {
          taskId = await almanac.factValue('taskId');
        } catch (e) {
          return null;
        }
      }
      const task = await this._getTask(taskId);
      return task?.status || null;
    });

    this.engine.addFact('task.priority', async (params, almanac) => {
      let taskId = params?.taskId;
      if (!taskId) {
        try {
          taskId = await almanac.factValue('taskId');
        } catch (e) {
          return null;
        }
      }
      const task = await this._getTask(taskId);
      return task?.priority || null;
    });

    this.engine.addFact('task.context', async (params, almanac) => {
      let taskId = params?.taskId;
      if (!taskId) {
        try {
          taskId = await almanac.factValue('taskId');
        } catch (e) {
          return null;
        }
      }
      const task = await this._getTask(taskId);
      return task?.context || null;
    });

    this.engine.addFact('task.count', async (params, almanac) => {
      const filters = params?.filters || {};
      const cacheKey = `task.count.${JSON.stringify(filters)}`;
      
      if (this._isCacheValid(cacheKey)) {
        return this.factCache.get(cacheKey).value;
      }
      
      try {
        const tasks = await getTasks(filters);
        const count = tasks.length;
        this._setCache(cacheKey, count);
        return count;
      } catch (error) {
        console.error('Error counting tasks:', error);
        return 0;
      }
    });

    this.engine.addFact('task.completedToday', async (params, almanac) => {
      const cacheKey = 'task.completedToday';
      
      if (this._isCacheValid(cacheKey)) {
        return this.factCache.get(cacheKey).value;
      }
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const tasks = await getTasks({ status: 'completed' });
        const completedToday = tasks.filter(task => {
          if (!task.completedAt) return false;
          const completedDate = new Date(task.completedAt);
          return completedDate >= today && completedDate < tomorrow;
        }).length;
        
        this._setCache(cacheKey, completedToday);
        return completedToday;
      } catch (error) {
        console.error('Error counting completed tasks today:', error);
        return 0;
      }
    });

    // Exercise facts
    this.engine.addFact('exercise.logCount', async (params, almanac) => {
      let exerciseId = params?.exerciseId;
      if (!exerciseId) {
        try {
          exerciseId = await almanac.factValue('exerciseId');
        } catch (e) {
          return 0;
        }
      }
      if (!exerciseId) return 0;
      
      const cacheKey = `exercise.logCount.${exerciseId}`;
      if (this._isCacheValid(cacheKey)) {
        return this.factCache.get(cacheKey).value;
      }
      
      try {
        const logs = await getExerciseLogs({ exerciseId });
        const count = logs.length;
        this._setCache(cacheKey, count);
        return count;
      } catch (error) {
        console.error('Error counting exercise logs:', error);
        return 0;
      }
    });

    this.engine.addFact('exercise.goalProgress', async (params, almanac) => {
      let exerciseId = params?.exerciseId;
      let goalId = params?.goalId;
      
      if (!exerciseId) {
        try {
          exerciseId = await almanac.factValue('exerciseId');
        } catch (e) {
          // Fact not provided, continue
        }
      }
      
      if (!goalId) {
        try {
          goalId = await almanac.factValue('goalId');
        } catch (e) {
          // Fact not provided, continue
        }
      }
      
      if (!exerciseId && !goalId) return null;
      
      const cacheKey = `exercise.goalProgress.${goalId || exerciseId}`;
      if (this._isCacheValid(cacheKey)) {
        return this.factCache.get(cacheKey).value;
      }
      
      try {
        let goal;
        if (goalId) {
          const goals = await getExerciseGoals({});
          goal = goals.find(g => g.id === goalId);
        } else if (exerciseId) {
          const goals = await getExerciseGoals({ exerciseId });
          goal = goals[0]; // Get first goal for exercise
        }
        
        if (!goal) return null;
        
        const progress = goal.completed / goal.target;
        this._setCache(cacheKey, progress);
        return progress;
      } catch (error) {
        console.error('Error calculating goal progress:', error);
        return null;
      }
    });

    // Journal facts
    this.engine.addFact('journal.entryCount', async (params, almanac) => {
      const filters = params?.filters || {};
      const cacheKey = `journal.entryCount.${JSON.stringify(filters)}`;
      
      if (this._isCacheValid(cacheKey)) {
        return this.factCache.get(cacheKey).value;
      }
      
      try {
        const entries = await getJournalEntries(filters);
        const count = entries.length;
        this._setCache(cacheKey, count);
        return count;
      } catch (error) {
        console.error('Error counting journal entries:', error);
        return 0;
      }
    });

    this.engine.addFact('journal.hasEntryToday', async (params, almanac) => {
      const cacheKey = 'journal.hasEntryToday';
      
      if (this._isCacheValid(cacheKey)) {
        return this.factCache.get(cacheKey).value;
      }
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const entries = await getJournalEntries({ date: today });
        const hasEntry = entries.length > 0;
        this._setCache(cacheKey, hasEntry);
        return hasEntry;
      } catch (error) {
        console.error('Error checking journal entry today:', error);
        return false;
      }
    });

    // Time-based facts
    this.engine.addFact('time.hour', async (params, almanac) => {
      return new Date().getHours();
    });

    this.engine.addFact('time.dayOfWeek', async (params, almanac) => {
      return new Date().getDay(); // 0 = Sunday, 6 = Saturday
    });

    this.engine.addFact('time.isWeekend', async (params, almanac) => {
      const day = new Date().getDay();
      return day === 0 || day === 6;
    });
  }

  /**
   * Checks if cached fact value is still valid
   * @param {string} cacheKey - Cache key
   * @returns {boolean} True if cache is valid
   * @private
   */
  _isCacheValid(cacheKey) {
    const cached = this.factCache.get(cacheKey);
    if (!cached || !cached.timestamp) return false;
    
    const { timestamp } = cached;
    const now = Date.now();
    return (now - timestamp) < this.cacheTimeout;
  }

  /**
   * Sets a cached fact value with timestamp
   * @param {string} cacheKey - Cache key
   * @param {*} value - Value to cache
   * @private
   */
  _setCache(cacheKey, value) {
    this.factCache.set(cacheKey, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Clears the fact cache
   */
  clearCache() {
    this.factCache.clear();
  }

  /**
   * Adds a rule to the engine
   * @param {Object} rule - AutomationRule object
   * @throws {RuleEngineError} If rule is invalid
   */
  addRule(rule) {
    if (!rule || typeof rule !== 'object') {
      throw new RuleEngineError('Rule must be an object');
    }

    // Validate rule has required fields - check before normalization
    if (rule.conditions === null || rule.conditions === undefined) {
      throw new RuleEngineError('Rule must have conditions');
    }

    if (!rule.enabled) {
      // Remove rule if it exists but is disabled
      if (this.rules.has(rule.id)) {
        this.removeRule(rule.id);
      }
      return;
    }

    try {
      const engineRule = toJsonRulesEngineFormat(rule);
      this.engine.addRule(engineRule);
      this.rules.set(rule.id, rule);
    } catch (error) {
      throw new RuleEngineError(
        `Failed to add rule: ${error.message}`,
        'ADD_RULE_ERROR'
      );
    }
  }

  /**
   * Removes a rule from the engine
   * @param {string} ruleId - Rule ID to remove
   */
  removeRule(ruleId) {
    if (!ruleId) return;
    
    // json-rules-engine doesn't have a direct removeRule method
    // We need to rebuild the engine with remaining rules
    const remainingRules = Array.from(this.rules.values())
      .filter(rule => rule.id !== ruleId);
    
    this.rules.delete(ruleId);
    this._rebuildEngine();
  }

  /**
   * Updates an existing rule
   * @param {Object} rule - Updated AutomationRule object
   * @throws {RuleEngineError} If rule is invalid
   */
  updateRule(rule) {
    if (!rule || !rule.id) {
      throw new RuleEngineError('Rule must have an id');
    }

    // Remove old rule and add updated one
    this.removeRule(rule.id);
    this.addRule(rule);
  }

  /**
   * Rebuilds the engine with current rules
   * @private
   */
  _rebuildEngine() {
    const options = {
      allowUndefinedFacts: true
    };
    this.engine = new Engine([], options);
    this._registerFactProviders();
    
    // Re-add all rules
    for (const rule of this.rules.values()) {
      if (rule.enabled) {
        try {
          const engineRule = toJsonRulesEngineFormat(rule);
          this.engine.addRule(engineRule);
        } catch (error) {
          console.error(`Failed to re-add rule ${rule.id}:`, error);
        }
      }
    }
  }

  /**
   * Loads multiple rules into the engine
   * @param {Array<Object>} rules - Array of AutomationRule objects
   */
  loadRules(rules) {
    if (!Array.isArray(rules)) {
      throw new RuleEngineError('Rules must be an array');
    }

    // Clear existing rules
    this.rules.clear();
    this._rebuildEngine();

    // Add all rules
    for (const rule of rules) {
      try {
        this.addRule(rule);
      } catch (error) {
        console.error(`Failed to load rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Evaluates rules against provided facts
   * @param {Object} facts - Facts to evaluate against (e.g., { taskId: '123' })
   * @param {Object} options - Evaluation options
   * @param {boolean} options.clearCache - Whether to clear cache before evaluation (default: true)
   * @returns {Promise<Array>} Promise resolving to array of events (actions) that fired
   */
  async evaluate(facts = {}, options = {}) {
    try {
      // Clear cache for fresh evaluation by default
      if (options.clearCache !== false) {
        this.clearCache();
      }
      
      const results = await this.engine.run(facts);
      return results.events || [];
    } catch (error) {
      throw new RuleEngineError(
        `Rule evaluation failed: ${error.message}`,
        'EVALUATION_ERROR'
      );
    }
  }

  /**
   * Gets all currently loaded rules
   * @returns {Array<Object>} Array of rule objects
   */
  getRules() {
    return Array.from(this.rules.values());
  }

  /**
   * Gets a specific rule by ID
   * @param {string} ruleId - Rule ID
   * @returns {Object|null} Rule object or null if not found
   */
  getRule(ruleId) {
    return this.rules.get(ruleId) || null;
  }
}

/**
 * Creates a new RuleEngine instance
 * @param {Object} options - Engine options
 * @returns {RuleEngine} New RuleEngine instance
 */
export function createRuleEngine(options = {}) {
  return new RuleEngine(options);
}

export default {
  RuleEngine,
  createRuleEngine,
  RuleEngineError
};

