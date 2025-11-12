/**
 * AutomationRule Model
 * 
 * Defines the structure and validation for AutomationRule objects.
 * AutomationRules support rule-based automation for task scheduling, categorization,
 * daily reports, and smart notifications using json-rules-engine (v6+).
 */

import { generateId } from '../../utils/id.js';

/**
 * Automation trigger types
 */
export const TRIGGER_TYPES = {
  TASK_CREATED: 'task.created',
  TASK_COMPLETED: 'task.completed',
  TASK_UPDATED: 'task.updated',
  TIME_BASED: 'time.based',
  EVENT_BASED: 'event.based',
  SCHEDULE_BASED: 'schedule.based'
};

/**
 * Automation action types
 */
export const ACTION_TYPES = {
  SCHEDULE_TASK: 'schedule.task',
  CATEGORIZE_TASK: 'categorize.task',
  SEND_NOTIFICATION: 'send.notification',
  GENERATE_REPORT: 'generate.report',
  UPDATE_TASK: 'update.task',
  CREATE_TASK: 'create.task'
};

/**
 * Time-based trigger schedule types
 */
export const SCHEDULE_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom' // Uses cron-like expression
};

/**
 * Creates a new AutomationRule object with default values
 * @param {Object} data - AutomationRule data
 * @returns {Object} AutomationRule object
 */
export function createAutomationRule(data = {}) {
  const now = new Date().toISOString();
  
  return {
    id: data.id || generateId(),
    name: data.name || '',
    description: data.description || null,
    enabled: data.enabled !== undefined ? data.enabled : true,
    
    // Trigger configuration
    trigger: data.trigger || {
      type: TRIGGER_TYPES.TASK_CREATED,
      config: {}
    },
    
    // Conditions (json-rules-engine compatible format)
    // Structure: { all: [{ fact, operator, value }] } or { any: [...] }
    conditions: data.conditions || {
      all: []
    },
    
    // Actions to execute when conditions are met
    actions: Array.isArray(data.actions) ? data.actions : [],
    
    // Metadata
    priority: data.priority || 0, // Higher priority rules execute first
    executionCount: data.executionCount || 0,
    lastExecutedAt: data.lastExecutedAt || null,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Normalizes an AutomationRule object, ensuring all fields are properly formatted
 * @param {Object} rule - AutomationRule object to normalize
 * @returns {Object} Normalized rule object
 */
export function normalizeAutomationRule(rule) {
  if (!rule || typeof rule !== 'object') {
    throw new Error('AutomationRule must be an object');
  }

  const normalized = { ...rule };

  // Ensure dates are ISO strings or null
  const dateFields = ['lastExecutedAt', 'createdAt', 'updatedAt'];
  dateFields.forEach(field => {
    if (normalized[field]) {
      if (normalized[field] instanceof Date) {
        normalized[field] = normalized[field].toISOString();
      } else if (typeof normalized[field] === 'string') {
        // Validate date string format
        const date = new Date(normalized[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date format for ${field}`);
        }
      }
    } else {
      normalized[field] = null;
    }
  });

  // Ensure trigger is an object with type
  if (!normalized.trigger || typeof normalized.trigger !== 'object') {
    normalized.trigger = {
      type: TRIGGER_TYPES.TASK_CREATED,
      config: {}
    };
  }

  // Ensure conditions follow json-rules-engine format
  if (!normalized.conditions || typeof normalized.conditions !== 'object') {
    normalized.conditions = { all: [] };
  }

  // Ensure actions is an array
  if (!Array.isArray(normalized.actions)) {
    normalized.actions = [];
  }

  // Ensure numbers are numbers
  if (typeof normalized.priority !== 'number') {
    normalized.priority = Number(normalized.priority) || 0;
  }
  if (typeof normalized.executionCount !== 'number') {
    normalized.executionCount = Number(normalized.executionCount) || 0;
  }

  // Ensure boolean is boolean
  if (typeof normalized.enabled !== 'boolean') {
    normalized.enabled = normalized.enabled === true || normalized.enabled === 'true';
  }

  return normalized;
}

/**
 * Converts an AutomationRule to json-rules-engine compatible format
 * @param {Object} rule - AutomationRule object
 * @returns {Object} json-rules-engine rule format
 */
export function toJsonRulesEngineFormat(rule) {
  if (!rule || typeof rule !== 'object') {
    throw new Error('Rule must be an object');
  }

  const normalized = normalizeAutomationRule(rule);

  return {
    conditions: normalized.conditions,
    event: {
      type: 'automation-action',
      params: {
        ruleId: normalized.id,
        actions: normalized.actions,
        priority: normalized.priority
      }
    },
    priority: normalized.priority
  };
}

/**
 * AutomationRule model type definition (for documentation)
 * @typedef {Object} AutomationRule
 * @property {string} id - UUID
 * @property {string} name - Rule name
 * @property {string|null} description - Optional rule description
 * @property {boolean} enabled - Whether the rule is active
 * @property {Object} trigger - Trigger configuration
 * @property {string} trigger.type - Trigger type (TRIGGER_TYPES)
 * @property {Object} trigger.config - Trigger-specific configuration
 * @property {Object} conditions - json-rules-engine compatible conditions
 * @property {Array} conditions.all - Array of conditions (all must match)
 * @property {Array} conditions.any - Array of conditions (any must match)
 * @property {Object} conditions.all[].fact - Fact name to evaluate
 * @property {string} conditions.all[].operator - Comparison operator
 * @property {*} conditions.all[].value - Value to compare against
 * @property {Array} actions - Actions to execute when conditions are met
 * @property {string} actions[].type - Action type (ACTION_TYPES)
 * @property {Object} actions[].params - Action-specific parameters
 * @property {number} priority - Rule priority (higher = executes first)
 * @property {number} executionCount - Number of times rule has executed
 * @property {string|null} lastExecutedAt - ISO date string of last execution
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 */

export default {
  createAutomationRule,
  normalizeAutomationRule,
  toJsonRulesEngineFormat,
  TRIGGER_TYPES,
  ACTION_TYPES,
  SCHEDULE_TYPES
};

