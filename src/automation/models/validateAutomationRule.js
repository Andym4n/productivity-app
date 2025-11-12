/**
 * AutomationRule Validation Logic
 * 
 * Validates AutomationRule objects according to PRD requirements.
 * Ensures compatibility with json-rules-engine format.
 */

import {
  isValidString,
  isValidUUID,
  sanitizeString
} from '../../utils/validation.js';
import {
  TRIGGER_TYPES,
  ACTION_TYPES,
  SCHEDULE_TYPES
} from './AutomationRule.js';

/**
 * Validation error class
 */
export class AutomationRuleValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'AutomationRuleValidationError';
    this.field = field;
  }
}

/**
 * Validates a rule name
 * @param {string} name - Rule name
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }

  const sanitized = sanitizeString(name);
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Name cannot be empty' };
  }

  if (sanitized.length > 200) {
    return { isValid: false, error: 'Name must be 200 characters or less' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates a rule description
 * @param {string|null} description - Rule description
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateDescription(description) {
  if (description === null || description === undefined) {
    return { isValid: true, error: null };
  }

  if (typeof description !== 'string') {
    return { isValid: false, error: 'Description must be a string' };
  }

  const sanitized = sanitizeString(description);
  
  if (sanitized.length > 1000) {
    return { isValid: false, error: 'Description must be 1000 characters or less' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates a trigger configuration
 * @param {Object} trigger - Trigger configuration
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateTrigger(trigger) {
  if (!trigger || typeof trigger !== 'object') {
    return { isValid: false, error: 'Trigger must be an object' };
  }

  // Validate trigger type
  if (!trigger.type || !Object.values(TRIGGER_TYPES).includes(trigger.type)) {
    return {
      isValid: false,
      error: `Trigger type must be one of: ${Object.values(TRIGGER_TYPES).join(', ')}`
    };
  }

  // Validate trigger config (must be object)
  if (trigger.config !== undefined && typeof trigger.config !== 'object') {
    return { isValid: false, error: 'Trigger config must be an object' };
  }

  // Validate time-based trigger schedule
  if (trigger.type === TRIGGER_TYPES.TIME_BASED) {
    if (!trigger.config || !trigger.config.schedule) {
      return { isValid: false, error: 'Time-based trigger requires schedule configuration' };
    }

    const schedule = trigger.config.schedule;
    if (!schedule.type || !Object.values(SCHEDULE_TYPES).includes(schedule.type)) {
      return {
        isValid: false,
        error: `Schedule type must be one of: ${Object.values(SCHEDULE_TYPES).join(', ')}`
      };
    }

    // Validate schedule time (for daily/weekly/monthly)
    if (schedule.type !== SCHEDULE_TYPES.CUSTOM) {
      if (!schedule.time || typeof schedule.time !== 'string') {
        return { isValid: false, error: 'Schedule time is required for non-custom schedules' };
      }
      // Basic time format validation (HH:mm)
      if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)) {
        return { isValid: false, error: 'Schedule time must be in HH:mm format' };
      }
    } else {
      // Custom schedule (cron-like) validation
      if (!schedule.expression || typeof schedule.expression !== 'string') {
        return { isValid: false, error: 'Custom schedule requires cron expression' };
      }
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validates json-rules-engine compatible conditions
 * @param {Object} conditions - Conditions object
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateConditions(conditions) {
  if (!conditions || typeof conditions !== 'object') {
    return { isValid: false, error: 'Conditions must be an object' };
  }

  // Must have 'all' or 'any' property
  if (!conditions.all && !conditions.any) {
    return { isValid: false, error: 'Conditions must have "all" or "any" property' };
  }

  // Validate 'all' conditions array
  if (conditions.all) {
    if (!Array.isArray(conditions.all)) {
      return { isValid: false, error: 'Conditions.all must be an array' };
    }

    for (let i = 0; i < conditions.all.length; i++) {
      const condition = conditions.all[i];
      if (!condition || typeof condition !== 'object') {
        return { isValid: false, error: `Condition ${i} in "all" must be an object` };
      }

      if (!condition.fact || typeof condition.fact !== 'string') {
        return { isValid: false, error: `Condition ${i} must have a "fact" string property` };
      }

      if (!condition.operator || typeof condition.operator !== 'string') {
        return { isValid: false, error: `Condition ${i} must have an "operator" string property` };
      }

      // Value can be any type, but must be present
      if (condition.value === undefined) {
        return { isValid: false, error: `Condition ${i} must have a "value" property` };
      }
    }
  }

  // Validate 'any' conditions array (same structure as 'all')
  if (conditions.any) {
    if (!Array.isArray(conditions.any)) {
      return { isValid: false, error: 'Conditions.any must be an array' };
    }

    for (let i = 0; i < conditions.any.length; i++) {
      const condition = conditions.any[i];
      if (!condition || typeof condition !== 'object') {
        return { isValid: false, error: `Condition ${i} in "any" must be an object` };
      }

      if (!condition.fact || typeof condition.fact !== 'string') {
        return { isValid: false, error: `Condition ${i} must have a "fact" string property` };
      }

      if (!condition.operator || typeof condition.operator !== 'string') {
        return { isValid: false, error: `Condition ${i} must have an "operator" string property` };
      }

      if (condition.value === undefined) {
        return { isValid: false, error: `Condition ${i} must have a "value" property` };
      }
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validates an action object
 * @param {Object} action - Action object
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateAction(action) {
  if (!action || typeof action !== 'object') {
    return { isValid: false, error: 'Action must be an object' };
  }

  // Validate action type
  if (!action.type || !Object.values(ACTION_TYPES).includes(action.type)) {
    return {
      isValid: false,
      error: `Action type must be one of: ${Object.values(ACTION_TYPES).join(', ')}`
    };
  }

  // Validate action params (must be object if provided)
  if (action.params !== undefined && typeof action.params !== 'object') {
    return { isValid: false, error: 'Action params must be an object' };
  }

  // Type-specific validations
  if (action.type === ACTION_TYPES.SCHEDULE_TASK) {
    if (!action.params || !action.params.taskId) {
      return { isValid: false, error: 'Schedule task action requires taskId in params' };
    }
  }

  if (action.type === ACTION_TYPES.CATEGORIZE_TASK) {
    if (!action.params || !action.params.taskId) {
      return { isValid: false, error: 'Categorize task action requires taskId in params' };
    }
    if (!action.params.category) {
      return { isValid: false, error: 'Categorize task action requires category in params' };
    }
  }

  if (action.type === ACTION_TYPES.SEND_NOTIFICATION) {
    if (!action.params || !action.params.message) {
      return { isValid: false, error: 'Send notification action requires message in params' };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validates an array of actions
 * @param {Array} actions - Array of action objects
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateActions(actions) {
  if (!Array.isArray(actions)) {
    return { isValid: false, error: 'Actions must be an array' };
  }

  if (actions.length === 0) {
    return { isValid: false, error: 'At least one action is required' };
  }

  for (let i = 0; i < actions.length; i++) {
    const actionValidation = validateAction(actions[i]);
    if (!actionValidation.isValid) {
      return { isValid: false, error: `Action ${i}: ${actionValidation.error}` };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validates a complete AutomationRule object
 * @param {Object} rule - AutomationRule object to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.requireId - Whether ID is required (default: false for new rules)
 * @param {boolean} options.allowPartial - Whether to allow partial updates (default: false)
 * @returns {Object} { isValid: boolean, errors: Array<string>, rule: Object|null }
 */
export function validateAutomationRule(rule, options = {}) {
  const { requireId = false, allowPartial = false } = options;
  const errors = [];

  if (!rule || typeof rule !== 'object') {
    return {
      isValid: false,
      errors: ['AutomationRule must be an object'],
      rule: null
    };
  }

  // Validate ID if required or present
  if (requireId || rule.id) {
    if (!rule.id || typeof rule.id !== 'string') {
      errors.push('Rule ID is required and must be a string');
    }
  }

  // Validate name (required unless partial update)
  if (!allowPartial || rule.name !== undefined) {
    const nameValidation = validateName(rule.name);
    if (!nameValidation.isValid) {
      errors.push(`Name: ${nameValidation.error}`);
    }
  }

  // Validate description (optional)
  if (rule.description !== undefined) {
    const descValidation = validateDescription(rule.description);
    if (!descValidation.isValid) {
      errors.push(`Description: ${descValidation.error}`);
    }
  }

  // Validate enabled (boolean)
  if (!allowPartial || rule.enabled !== undefined) {
    if (typeof rule.enabled !== 'boolean') {
      errors.push('Enabled must be a boolean');
    }
  }

  // Validate trigger (required unless partial update)
  if (!allowPartial || rule.trigger !== undefined) {
    const triggerValidation = validateTrigger(rule.trigger);
    if (!triggerValidation.isValid) {
      errors.push(`Trigger: ${triggerValidation.error}`);
    }
  }

  // Validate conditions (required unless partial update)
  if (!allowPartial || rule.conditions !== undefined) {
    const conditionsValidation = validateConditions(rule.conditions);
    if (!conditionsValidation.isValid) {
      errors.push(`Conditions: ${conditionsValidation.error}`);
    }
  }

  // Validate actions (required unless partial update)
  if (!allowPartial || rule.actions !== undefined) {
    const actionsValidation = validateActions(rule.actions);
    if (!actionsValidation.isValid) {
      errors.push(`Actions: ${actionsValidation.error}`);
    }
  }

  // Validate priority (optional, must be number if provided)
  if (rule.priority !== undefined) {
    if (typeof rule.priority !== 'number' || !Number.isInteger(rule.priority)) {
      errors.push('Priority must be an integer');
    }
  }

  // Validate executionCount (optional, must be non-negative integer if provided)
  if (rule.executionCount !== undefined) {
    if (typeof rule.executionCount !== 'number' || !Number.isInteger(rule.executionCount) || rule.executionCount < 0) {
      errors.push('Execution count must be a non-negative integer');
    }
  }

  // Validate date fields
  const dateFields = ['lastExecutedAt', 'createdAt', 'updatedAt'];
  for (const field of dateFields) {
    if (rule[field] !== undefined && rule[field] !== null) {
      if (typeof rule[field] !== 'string') {
        errors.push(`${field} must be an ISO date string`);
      } else {
        const date = new Date(rule[field]);
        if (isNaN(date.getTime())) {
          errors.push(`${field} must be a valid ISO date string`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    rule: errors.length === 0 ? rule : null
  };
}

/**
 * Validates and sanitizes an AutomationRule object
 * @param {Object} rule - AutomationRule object to validate and sanitize
 * @param {Object} options - Validation options
 * @returns {Object} { isValid: boolean, errors: Array<string>, rule: Object|null }
 */
export function validateAndSanitizeAutomationRule(rule, options = {}) {
  if (!rule || typeof rule !== 'object') {
    return {
      isValid: false,
      errors: ['AutomationRule must be an object'],
      rule: null
    };
  }

  // Create sanitized copy
  const sanitized = { ...rule };

  // Sanitize string fields
  if (sanitized.name) {
    sanitized.name = sanitizeString(sanitized.name);
  }
  if (sanitized.description) {
    sanitized.description = sanitizeString(sanitized.description);
  }

  // Validate the sanitized rule
  return validateAutomationRule(sanitized, options);
}

export default {
  validateAutomationRule,
  validateAndSanitizeAutomationRule,
  validateName,
  validateDescription,
  validateTrigger,
  validateConditions,
  validateAction,
  validateActions,
  AutomationRuleValidationError
};

