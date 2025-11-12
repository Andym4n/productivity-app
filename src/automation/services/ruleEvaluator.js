/**
 * Rule Evaluator Service
 * 
 * Integrates json-rules-engine (v6+) for evaluating AutomationRule instances
 * against runtime data from tasks, exercises, and journal modules.
 */

import { Engine } from 'json-rules-engine';
import { toJsonRulesEngineFormat } from '../models/AutomationRule.js';

/**
 * Error class for rule evaluation errors
 */
export class RuleEvaluationError extends Error {
  constructor(message, ruleId = null, cause = null) {
    super(message);
    this.name = 'RuleEvaluationError';
    this.ruleId = ruleId;
    this.cause = cause;
  }
}

/**
 * Creates fact providers for different data types
 * Fact providers extract relevant data from domain objects for rule evaluation
 */
class FactProvider {
  /**
   * Creates facts from a task object
   * @param {Object} task - Task object
   * @returns {Object} Facts object with task-related facts
   */
  static taskFacts(task) {
    if (!task) {
      return {};
    }

    return {
      'task.id': task.id,
      'task.title': task.title || '',
      'task.description': task.description || '',
      'task.status': task.status || 'pending',
      'task.priority': task.priority || 'medium',
      'task.context': task.context || 'personal',
      'task.dueDate': task.dueDate || null,
      'task.timeEstimate': task.timeEstimate || null,
      'task.timeSpent': task.timeSpent || 0,
      'task.parentId': task.parentId || null,
      'task.tags': task.tags || [],
      'task.dependencies': task.dependencies || [],
      'task.hasDependencies': (task.dependencies || []).length > 0,
      'task.hasSubtasks': !!task.parentId,
      'task.isOverdue': task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed',
      'task.completedAt': task.completedAt || null,
      'task.createdAt': task.createdAt || null,
      'task.updatedAt': task.updatedAt || null
    };
  }

  /**
   * Creates facts from an exercise object
   * @param {Object} exercise - Exercise object
   * @returns {Object} Facts object with exercise-related facts
   */
  static exerciseFacts(exercise) {
    if (!exercise) {
      return {};
    }

    return {
      'exercise.id': exercise.id,
      'exercise.name': exercise.name || '',
      'exercise.type': exercise.type || 'reps',
      'exercise.unit': exercise.unit || '',
      'exercise.category': exercise.category || null,
      'exercise.createdAt': exercise.createdAt || null
    };
  }

  /**
   * Creates facts from an exercise goal object
   * @param {Object} goal - ExerciseGoal object
   * @returns {Object} Facts object with exercise goal-related facts
   */
  static exerciseGoalFacts(goal) {
    if (!goal) {
      return {};
    }

    return {
      'exerciseGoal.id': goal.id,
      'exerciseGoal.exerciseId': goal.exerciseId || '',
      'exerciseGoal.target': goal.target || 0,
      'exerciseGoal.completed': goal.completed || 0,
      'exerciseGoal.date': goal.date || null,
      'exerciseGoal.progress': goal.target > 0 ? (goal.completed / goal.target) * 100 : 0,
      'exerciseGoal.isComplete': goal.completed >= goal.target,
      'exerciseGoal.createdAt': goal.createdAt || null
    };
  }

  /**
   * Creates facts from an exercise log object
   * @param {Object} log - ExerciseLog object
   * @returns {Object} Facts object with exercise log-related facts
   */
  static exerciseLogFacts(log) {
    if (!log) {
      return {};
    }

    return {
      'exerciseLog.id': log.id,
      'exerciseLog.exerciseId': log.exerciseId || '',
      'exerciseLog.amount': log.amount || 0,
      'exerciseLog.timestamp': log.timestamp || null,
      'exerciseLog.goalId': log.goalId || null
    };
  }

  /**
   * Creates facts from a journal entry object
   * @param {Object} entry - Journal entry object
   * @returns {Object} Facts object with journal-related facts
   */
  static journalFacts(entry) {
    if (!entry) {
      return {};
    }

    // Extract text content from Slate.js format
    const extractText = (content) => {
      if (!Array.isArray(content)) {
        return '';
      }
      return content
        .map(node => {
          if (node.text) {
            return node.text;
          }
          if (node.children) {
            return extractText(node.children);
          }
          return '';
        })
        .join(' ');
    };

    const textContent = extractText(entry.content || []);

    return {
      'journal.id': entry.id,
      'journal.date': entry.date || null,
      'journal.mood': entry.mood || null,
      'journal.tags': entry.tags || [],
      'journal.template': entry.template || null,
      'journal.textContent': textContent,
      'journal.textLength': textContent.length,
      'journal.hasImages': (entry.media?.images || []).length > 0,
      'journal.hasAudio': (entry.media?.audio || []).length > 0,
      'journal.linkedTasks': entry.linkedTasks || [],
      'journal.linkedEvents': entry.linkedEvents || [],
      'journal.hasLinkedTasks': (entry.linkedTasks || []).length > 0,
      'journal.hasLinkedEvents': (entry.linkedEvents || []).length > 0,
      'journal.createdAt': entry.createdAt || null,
      'journal.updatedAt': entry.updatedAt || null
    };
  }

  /**
   * Combines multiple fact objects into a single facts object
   * @param {...Object} factObjects - Multiple fact objects to combine
   * @returns {Object} Combined facts object
   */
  static combineFacts(...factObjects) {
    return Object.assign({}, ...factObjects);
  }
}

/**
 * Rule Evaluator class
 * Manages rule evaluation using json-rules-engine
 */
export class RuleEvaluator {
  /**
   * Creates a new RuleEvaluator instance
   * @param {Object} options - Configuration options
   * @param {boolean} options.allowUndefinedFacts - Whether to allow undefined facts (default: false)
   */
  constructor(options = {}) {
    this.engine = new Engine([], options);
    this.rules = new Map(); // Map of ruleId -> rule object
    this.factProvider = FactProvider;
  }

  /**
   * Adds a rule to the evaluator
   * @param {Object} rule - AutomationRule object
   * @throws {RuleEvaluationError} If rule is invalid or cannot be added
   */
  addRule(rule) {
    if (!rule || !rule.id) {
      throw new RuleEvaluationError('Rule must have an id', null);
    }

    if (!rule.enabled) {
      // Remove disabled rules
      this.removeRule(rule.id);
      return;
    }

    try {
      const engineRule = toJsonRulesEngineFormat(rule);
      this.engine.addRule(engineRule);
      this.rules.set(rule.id, rule);
    } catch (error) {
      throw new RuleEvaluationError(
        `Failed to add rule: ${error.message}`,
        rule.id,
        error
      );
    }
  }

  /**
   * Removes a rule from the evaluator
   * @param {string} ruleId - Rule ID to remove
   */
  removeRule(ruleId) {
    if (!ruleId) {
      return;
    }

    // json-rules-engine doesn't have a direct removeRule method,
    // so we need to rebuild the engine without this rule
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.delete(ruleId);
      this._rebuildEngine();
    }
  }

  /**
   * Updates a rule in the evaluator
   * @param {Object} rule - Updated AutomationRule object
   * @throws {RuleEvaluationError} If rule update fails
   */
  updateRule(rule) {
    if (!rule || !rule.id) {
      throw new RuleEvaluationError('Rule must have an id', null);
    }

    // Remove old rule and add new one
    this.removeRule(rule.id);
    this.addRule(rule);
  }

  /**
   * Loads multiple rules into the evaluator
   * @param {Array<Object>} rules - Array of AutomationRule objects
   * @throws {RuleEvaluationError} If any rule fails to load
   */
  loadRules(rules) {
    if (!Array.isArray(rules)) {
      throw new RuleEvaluationError('Rules must be an array', null);
    }

    // Clear existing rules
    this.rules.clear();
    this.engine = new Engine([], this.engine.options);

    // Add all enabled rules
    const errors = [];
    for (const rule of rules) {
      try {
        if (rule.enabled) {
          this.addRule(rule);
        }
      } catch (error) {
        errors.push({ ruleId: rule.id, error: error.message });
      }
    }

    if (errors.length > 0) {
      throw new RuleEvaluationError(
        `Failed to load ${errors.length} rule(s)`,
        null,
        errors
      );
    }
  }

  /**
   * Evaluates rules against provided facts
   * @param {Object} facts - Facts object to evaluate against
   * @param {Object} options - Evaluation options
   * @param {boolean} options.returnEvents - Whether to return events (default: true)
   * @returns {Promise<Object>} Evaluation result with events and facts
   */
  async evaluate(facts, options = {}) {
    const { returnEvents = true } = options;

    try {
      const result = await this.engine.run(facts);
      
      return {
        events: returnEvents ? result.events : [],
        facts: result.facts || facts,
        almanac: result.almanac || null
      };
    } catch (error) {
      throw new RuleEvaluationError(
        `Rule evaluation failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Evaluates rules against task data
   * @param {Object} task - Task object
   * @param {Object} options - Evaluation options
   * @returns {Promise<Object>} Evaluation result
   */
  async evaluateTask(task, options = {}) {
    const facts = this.factProvider.taskFacts(task);
    return this.evaluate(facts, options);
  }

  /**
   * Evaluates rules against exercise data
   * @param {Object} exercise - Exercise object
   * @param {Object} goal - Optional ExerciseGoal object
   * @param {Object} log - Optional ExerciseLog object
   * @param {Object} options - Evaluation options
   * @returns {Promise<Object>} Evaluation result
   */
  async evaluateExercise(exercise, goal = null, log = null, options = {}) {
    const facts = this.factProvider.combineFacts(
      this.factProvider.exerciseFacts(exercise),
      goal ? this.factProvider.exerciseGoalFacts(goal) : {},
      log ? this.factProvider.exerciseLogFacts(log) : {}
    );
    return this.evaluate(facts, options);
  }

  /**
   * Evaluates rules against journal entry data
   * @param {Object} entry - Journal entry object
   * @param {Object} options - Evaluation options
   * @returns {Promise<Object>} Evaluation result
   */
  async evaluateJournal(entry, options = {}) {
    const facts = this.factProvider.journalFacts(entry);
    return this.evaluate(facts, options);
  }

  /**
   * Evaluates rules against combined data from multiple sources
   * @param {Object} data - Data object with optional task, exercise, goal, log, journal properties
   * @param {Object} options - Evaluation options
   * @returns {Promise<Object>} Evaluation result
   */
  async evaluateCombined(data, options = {}) {
    const factObjects = [];

    if (data.task) {
      factObjects.push(this.factProvider.taskFacts(data.task));
    }
    if (data.exercise) {
      factObjects.push(this.factProvider.exerciseFacts(data.exercise));
    }
    if (data.goal) {
      factObjects.push(this.factProvider.exerciseGoalFacts(data.goal));
    }
    if (data.log) {
      factObjects.push(this.factProvider.exerciseLogFacts(data.log));
    }
    if (data.journal) {
      factObjects.push(this.factProvider.journalFacts(data.journal));
    }

    const facts = this.factProvider.combineFacts(...factObjects);
    return this.evaluate(facts, options);
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

  /**
   * Checks if a rule is loaded
   * @param {string} ruleId - Rule ID
   * @returns {boolean} True if rule is loaded
   */
  hasRule(ruleId) {
    return this.rules.has(ruleId);
  }

  /**
   * Clears all rules from the evaluator
   */
  clearRules() {
    this.rules.clear();
    this.engine = new Engine([], this.engine.options);
  }

  /**
   * Rebuilds the engine with current rules
   * @private
   */
  _rebuildEngine() {
    const rules = Array.from(this.rules.values());
    this.engine = new Engine([], this.engine.options);
    
    for (const rule of rules) {
      try {
        const engineRule = toJsonRulesEngineFormat(rule);
        this.engine.addRule(engineRule);
      } catch (error) {
        // Skip invalid rules during rebuild
        console.warn(`Skipping invalid rule during rebuild: ${rule.id}`, error);
      }
    }
  }
}

/**
 * Creates a new RuleEvaluator instance
 * @param {Object} options - Configuration options
 * @returns {RuleEvaluator} New RuleEvaluator instance
 */
export function createRuleEvaluator(options = {}) {
  return new RuleEvaluator(options);
}

export default {
  RuleEvaluator,
  createRuleEvaluator,
  RuleEvaluationError,
  FactProvider
};
