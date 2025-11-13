/**
 * Automation Trigger Manager
 * 
 * Manages automation triggers for task lifecycle events, time-based schedules,
 * and cross-module events. Handles trigger registration, event emission, and
 * rule evaluation invocation.
 */

import { TRIGGER_TYPES } from '../models/AutomationRule.js';

/**
 * Event emitter for automation triggers
 */
class AutomationEventEmitter {
  constructor() {
    this.listeners = new Map();
    this.enabled = true;
  }

  /**
   * Subscribe to an event type
   * @param {string} eventType - Event type (e.g., 'task.created')
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  async emit(eventType, data = {}) {
    if (!this.enabled) {
      return;
    }

    const callbacks = this.listeners.get(eventType) || [];
    
    // Execute all callbacks asynchronously
    const promises = callbacks.map(callback => {
      try {
        return Promise.resolve(callback(data));
      } catch (error) {
        console.error(`[Automation] Error in trigger callback for ${eventType}:`, error);
        return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Remove all listeners for an event type
   * @param {string} eventType - Event type (optional, removes all if not provided)
   */
  off(eventType = null) {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Enable or disable event emission
   * @param {boolean} enabled - Whether to enable event emission
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

/**
 * Trigger Manager
 * 
 * Manages all automation triggers and coordinates rule evaluation
 */
class TriggerManager {
  constructor() {
    this.eventEmitter = new AutomationEventEmitter();
    this.timeBasedTriggers = new Map(); // Map of trigger ID to interval/timeout
    this.ruleEvaluator = null; // Will be set when rule evaluation is implemented
    this.isInitialized = false;
  }

  /**
   * Initialize the trigger manager
   * @param {Function} ruleEvaluator - Function to evaluate rules (stub for now)
   */
  initialize(ruleEvaluator = null) {
    if (this.isInitialized) {
      console.warn('[Automation] TriggerManager already initialized');
      return;
    }

    this.ruleEvaluator = ruleEvaluator || this.defaultRuleEvaluator;
    this.isInitialized = true;
    console.log('[Automation] TriggerManager initialized');
  }

  /**
   * Default rule evaluator (stub - will be replaced by subtask 8.2)
   * @param {Object} rule - AutomationRule object
   * @param {Object} facts - Facts to evaluate against
   * @returns {Promise<Object>} Evaluation result
   */
  async defaultRuleEvaluator(rule, facts) {
    console.warn('[Automation] Rule evaluation not yet implemented (subtask 8.2)');
    return {
      triggered: false,
      message: 'Rule evaluation not implemented'
    };
  }

  /**
   * Set the rule evaluator function
   * @param {Function} evaluator - Rule evaluator function
   */
  setRuleEvaluator(evaluator) {
    this.ruleEvaluator = evaluator;
  }

  /**
   * Register a rule trigger
   * @param {Object} rule - AutomationRule object
   */
  registerRule(rule) {
    if (!rule || !rule.enabled) {
      return;
    }

    const triggerType = rule.trigger?.type;
    if (!triggerType) {
      console.warn('[Automation] Rule missing trigger type:', rule.id);
      return;
    }

    switch (triggerType) {
      case TRIGGER_TYPES.TASK_CREATED:
      case TRIGGER_TYPES.TASK_COMPLETED:
      case TRIGGER_TYPES.TASK_UPDATED:
        // Event-based triggers are handled automatically via emit()
        break;

      case TRIGGER_TYPES.TIME_BASED:
        this.registerTimeBasedTrigger(rule);
        break;

      case TRIGGER_TYPES.EVENT_BASED:
        // Event-based triggers are handled via emit() with custom event types
        break;

      case TRIGGER_TYPES.SCHEDULE_BASED:
        this.registerScheduleBasedTrigger(rule);
        break;

      default:
        console.warn('[Automation] Unknown trigger type:', triggerType);
    }
  }

  /**
   * Unregister a rule trigger
   * @param {string} ruleId - Rule ID
   */
  unregisterRule(ruleId) {
    // Clear time-based triggers
    if (this.timeBasedTriggers.has(ruleId)) {
      const trigger = this.timeBasedTriggers.get(ruleId);
      if (trigger.interval) {
        clearInterval(trigger.interval);
      }
      if (trigger.timeout) {
        clearTimeout(trigger.timeout);
      }
      this.timeBasedTriggers.delete(ruleId);
    }
  }

  /**
   * Register a time-based trigger
   * @param {Object} rule - AutomationRule with TIME_BASED trigger
   */
  registerTimeBasedTrigger(rule) {
    const config = rule.trigger?.config;
    if (!config || !config.schedule) {
      console.warn('[Automation] Time-based trigger missing schedule config:', rule.id);
      return;
    }

    const schedule = config.schedule;
    let intervalMs = null;

    switch (schedule.type) {
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      case 'monthly':
        intervalMs = 30 * 24 * 60 * 60 * 1000; // ~30 days
        break;
      case 'custom':
        // For custom cron-like expressions, we'll use a simple interval
        // Full cron parsing would require a library like node-cron
        // For now, we'll schedule it to run every minute and check if it matches
        intervalMs = 60 * 1000; // 1 minute
        break;
      default:
        console.warn('[Automation] Unknown schedule type:', schedule.type);
        return;
    }

    // Calculate initial delay based on schedule time
    const delay = this.calculateInitialDelay(schedule);
    
    // Set up timeout for initial execution
    const timeout = setTimeout(() => {
      this.executeRule(rule, { triggerType: TRIGGER_TYPES.TIME_BASED });
      
      // Set up interval for recurring execution
      if (intervalMs) {
        const interval = setInterval(() => {
          this.executeRule(rule, { triggerType: TRIGGER_TYPES.TIME_BASED });
        }, intervalMs);
        
        this.timeBasedTriggers.set(rule.id, { interval, timeout: null });
      }
    }, delay);

    this.timeBasedTriggers.set(rule.id, { timeout, interval: null });
  }

  /**
   * Register a schedule-based trigger (cron-like)
   * @param {Object} rule - AutomationRule with SCHEDULE_BASED trigger
   */
  registerScheduleBasedTrigger(rule) {
    // Similar to time-based, but uses cron expression parsing
    // For now, we'll treat it as a time-based trigger
    this.registerTimeBasedTrigger(rule);
  }

  /**
   * Calculate initial delay for a schedule
   * @param {Object} schedule - Schedule configuration
   * @returns {number} Delay in milliseconds
   */
  calculateInitialDelay(schedule) {
    if (schedule.type === 'custom' && schedule.expression) {
      // For cron expressions, calculate next execution time
      // Simplified: run immediately for now
      return 0;
    }

    if (!schedule.time) {
      return 0;
    }

    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const targetTime = new Date(now);
    targetTime.setHours(hours, minutes, 0, 0);

    // If target time has passed today, schedule for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    return targetTime.getTime() - now.getTime();
  }

  /**
   * Execute a rule when triggered
   * @param {Object} rule - AutomationRule to execute
   * @param {Object} context - Trigger context data
   */
  async executeRule(rule, context = {}) {
    if (!rule || !rule.enabled) {
      return;
    }

    try {
      // Build facts object from context
      const facts = this.buildFactsFromContext(context);

      // Evaluate rule using rule evaluator
      const result = await this.ruleEvaluator(rule, facts);

      if (result.triggered) {
        // Execute actions
        await this.executeActions(rule.actions, context, result);
        
        // Update rule execution metadata
        await this.updateRuleExecutionMetadata(rule);
      }
    } catch (error) {
      console.error(`[Automation] Error executing rule ${rule.id}:`, error);
    }
  }

  /**
   * Build facts object from trigger context
   * @param {Object} context - Trigger context
   * @returns {Object} Facts object for rule evaluation
   */
  buildFactsFromContext(context) {
    const facts = {
      ...context,
      timestamp: new Date().toISOString()
    };

    // Add task data if present
    if (context.task) {
      facts.task = context.task;
      facts.taskId = context.task.id;
      facts.taskStatus = context.task.status;
      facts.taskPriority = context.task.priority;
    }

    // Add exercise data if present
    if (context.exercise) {
      facts.exercise = context.exercise;
    }

    // Add journal data if present
    if (context.journalEntry) {
      facts.journalEntry = context.journalEntry;
    }

    return facts;
  }

  /**
   * Execute rule actions
   * @param {Array} actions - Array of action objects
   * @param {Object} context - Trigger context
   * @param {Object} evaluationResult - Rule evaluation result
   */
  async executeActions(actions, context, evaluationResult) {
    if (!Array.isArray(actions) || actions.length === 0) {
      return;
    }

    for (const action of actions) {
      try {
        await this.executeAction(action, context, evaluationResult);
      } catch (error) {
        console.error(`[Automation] Error executing action ${action.type}:`, error);
      }
    }
  }

  /**
   * Execute a single action
   * @param {Object} action - Action object
   * @param {Object} context - Trigger context
   * @param {Object} evaluationResult - Rule evaluation result
   */
  async executeAction(action, context, evaluationResult) {
    // Action execution will be implemented in subtask 8.4 (notifications) and 8.5 (reports)
    // For now, we'll just log the action
    console.log(`[Automation] Executing action: ${action.type}`, {
      action,
      context,
      evaluationResult
    });

    // Emit action event for potential listeners
    await this.eventEmitter.emit(`action.${action.type}`, {
      action,
      context,
      evaluationResult
    });
  }

  /**
   * Update rule execution metadata
   * @param {Object} rule - AutomationRule object
   */
  async updateRuleExecutionMetadata(rule) {
    // This will be implemented when CRUD operations for rules are added
    // For now, we'll just log
    console.log(`[Automation] Rule ${rule.id} executed at ${new Date().toISOString()}`);
  }

  /**
   * Emit a task lifecycle event
   * @param {string} eventType - Event type (task.created, task.completed, task.updated)
   * @param {Object} task - Task object or event data
   */
  async emitTaskEvent(eventType, task) {
    // If task is already an object with task property, use it as-is
    // Otherwise, wrap it
    const eventData = task && typeof task === 'object' && 'task' in task
      ? { ...task, triggerType: eventType }
      : { task, triggerType: eventType };
    
    await this.eventEmitter.emit(eventType, eventData);
    
    // Also trigger rule evaluation for matching rules
    // This will be optimized when rule evaluation is implemented
  }

  /**
   * Emit a custom event
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  async emitEvent(eventType, data) {
    await this.eventEmitter.emit(eventType, { ...data, triggerType: eventType });
  }

  /**
   * Get the event emitter (for external subscriptions)
   * @returns {AutomationEventEmitter} Event emitter instance
   */
  getEventEmitter() {
    return this.eventEmitter;
  }

  /**
   * Cleanup all triggers
   */
  cleanup() {
    // Clear all time-based triggers
    for (const [ruleId, trigger] of this.timeBasedTriggers.entries()) {
      if (trigger.interval) {
        clearInterval(trigger.interval);
      }
      if (trigger.timeout) {
        clearTimeout(trigger.timeout);
      }
    }
    this.timeBasedTriggers.clear();
    
    // Clear all event listeners
    this.eventEmitter.off();
    
    this.isInitialized = false;
  }
}

// Singleton instance
let triggerManagerInstance = null;

/**
 * Get the singleton TriggerManager instance
 * @returns {TriggerManager} TriggerManager instance
 */
export function getTriggerManager() {
  if (!triggerManagerInstance) {
    triggerManagerInstance = new TriggerManager();
  }
  return triggerManagerInstance;
}

export default getTriggerManager;
