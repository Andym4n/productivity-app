/**
 * Task Validation Logic
 * 
 * Validates Task objects according to PRD requirements.
 * Uses date-fns for date validation and existing validation utilities.
 */

import { parseISO, isValid, isBefore } from 'date-fns';
import {
  isValidString,
  isValidUUID,
  isValidTaskPriority,
  isValidTaskStatus,
  isValidTaskContext,
  isValidPositiveInteger,
  isValidNonNegativeInteger,
  sanitizeString
} from '../../utils/validation.js';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_CONTEXTS,
  RECURRENCE_PATTERNS
} from './Task.js';

/**
 * Validation error class
 */
export class TaskValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'TaskValidationError';
    this.field = field;
  }
}

/**
 * Validates a task title
 * @param {string} title - Task title
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateTitle(title) {
  if (!title || typeof title !== 'string') {
    return { isValid: false, error: 'Title is required' };
  }

  const sanitized = sanitizeString(title);
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Title cannot be empty' };
  }

  if (sanitized.length > 500) {
    return { isValid: false, error: 'Title must be 500 characters or less' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates a task description
 * @param {string} description - Task description
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
  
  if (sanitized.length > 5000) {
    return { isValid: false, error: 'Description must be 5000 characters or less' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates a date string or Date object
 * @param {Date|string|null} date - Date to validate
 * @returns {Object} { isValid: boolean, error: string|null, date: Date|null }
 */
export function validateDate(date) {
  if (date === null || date === undefined) {
    return { isValid: true, error: null, date: null };
  }

  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = parseISO(date);
  } else {
    return { isValid: false, error: 'Date must be a Date object or ISO string', date: null };
  }

  if (!isValid(dateObj)) {
    return { isValid: false, error: 'Invalid date format', date: null };
  }

  return { isValid: true, error: null, date: dateObj };
}

/**
 * Validates a recurrence pattern object
 * @param {Object|null} recurrence - Recurrence pattern
 * @param {Date|string} startDate - Optional start date for validation (used for rrule validation)
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateRecurrence(recurrence, startDate = null) {
  if (recurrence === null || recurrence === undefined) {
    return { isValid: true, error: null };
  }

  if (typeof recurrence !== 'object') {
    return { isValid: false, error: 'Recurrence must be an object' };
  }

  // Validate pattern
  if (!recurrence.pattern || !Object.values(RECURRENCE_PATTERNS).includes(recurrence.pattern)) {
    return { isValid: false, error: 'Recurrence pattern must be one of: daily, weekly, monthly, custom' };
  }

  // Handle custom patterns (use rrule.js validation)
  if (recurrence.pattern === RECURRENCE_PATTERNS.CUSTOM) {
    if (!recurrence.rruleOptions || typeof recurrence.rruleOptions !== 'object') {
      return { isValid: false, error: 'Custom recurrence pattern requires rruleOptions object' };
    }
    
    // Basic structural validation for custom patterns
    // Full rrule.js validation will be done in task validation if needed
    if (recurrence.rruleOptions.freq === undefined) {
      return { isValid: false, error: 'Custom recurrence rruleOptions must include freq' };
    }
    
    // Validate endDate if present
    if (recurrence.endDate) {
      const dateValidation = validateDate(recurrence.endDate);
      if (!dateValidation.isValid) {
        return { isValid: false, error: `Invalid recurrence endDate: ${dateValidation.error}` };
      }
    }
    
    // Structural validation passed - full rrule validation can be done elsewhere
    return { isValid: true, error: null };
  }

  // Validate interval for standard patterns
  if (typeof recurrence.interval !== 'number' || recurrence.interval < 1) {
    return { isValid: false, error: 'Recurrence interval must be a positive number' };
  }

  // Validate daysOfWeek for weekly patterns
  if (recurrence.pattern === RECURRENCE_PATTERNS.WEEKLY) {
    if (!Array.isArray(recurrence.daysOfWeek)) {
      return { isValid: false, error: 'Weekly recurrence must include daysOfWeek array' };
    }
    if (recurrence.daysOfWeek.length === 0) {
      return { isValid: false, error: 'Weekly recurrence must include at least one day' };
    }
    if (!recurrence.daysOfWeek.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) {
      return { isValid: false, error: 'daysOfWeek must be integers between 0 and 6' };
    }
  }

  // Validate endDate if present
  if (recurrence.endDate) {
    const dateValidation = validateDate(recurrence.endDate);
    if (!dateValidation.isValid) {
      return { isValid: false, error: `Invalid recurrence endDate: ${dateValidation.error}` };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validates an array of task IDs (for dependencies)
 * @param {Array} dependencies - Array of task IDs
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateDependencies(dependencies) {
  if (!Array.isArray(dependencies)) {
    return { isValid: false, error: 'Dependencies must be an array' };
  }

  for (const depId of dependencies) {
    if (typeof depId !== 'string' || depId.length === 0) {
      return { isValid: false, error: 'All dependency IDs must be non-empty strings' };
    }
    // Note: We don't validate UUID format here as IDs might come from storage
    // UUID validation can be done separately if needed
  }

  // Check for duplicate dependencies
  const uniqueDeps = new Set(dependencies);
  if (uniqueDeps.size !== dependencies.length) {
    return { isValid: false, error: 'Dependencies must be unique' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates an array of tags
 * @param {Array} tags - Array of tag strings
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateTags(tags) {
  if (!Array.isArray(tags)) {
    return { isValid: false, error: 'Tags must be an array' };
  }

  for (const tag of tags) {
    if (typeof tag !== 'string') {
      return { isValid: false, error: 'All tags must be strings' };
    }
    
    const sanitized = sanitizeString(tag);
    if (sanitized.length === 0) {
      return { isValid: false, error: 'Tags cannot be empty strings' };
    }
    
    if (sanitized.length > 50) {
      return { isValid: false, error: 'Each tag must be 50 characters or less' };
    }
  }

  // Check for duplicate tags (case-insensitive)
  const lowerTags = tags.map(t => sanitizeString(t).toLowerCase());
  const uniqueTags = new Set(lowerTags);
  if (uniqueTags.size !== tags.length) {
    return { isValid: false, error: 'Tags must be unique' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates a complete Task object
 * @param {Object} task - Task object to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.requireId - Whether ID is required (default: false for new tasks)
 * @param {boolean} options.allowPartial - Whether to allow partial updates (default: false)
 * @returns {Object} { isValid: boolean, errors: Array<string>, task: Object|null }
 */
export function validateTask(task, options = {}) {
  const { requireId = false, allowPartial = false } = options;
  const errors = [];

  if (!task || typeof task !== 'object') {
    return {
      isValid: false,
      errors: ['Task must be an object'],
      task: null
    };
  }

  // Validate ID if required or present
  if (requireId || task.id) {
    if (!task.id || typeof task.id !== 'string') {
      errors.push('Task ID is required and must be a string');
    }
  }

  // Validate title (required unless partial update)
  if (!allowPartial || task.title !== undefined) {
    const titleValidation = validateTitle(task.title);
    if (!titleValidation.isValid) {
      errors.push(`Title: ${titleValidation.error}`);
    }
  }

  // Validate description (optional)
  if (task.description !== undefined) {
    const descValidation = validateDescription(task.description);
    if (!descValidation.isValid) {
      errors.push(`Description: ${descValidation.error}`);
    }
  }

  // Validate dueDate (optional)
  if (task.dueDate !== undefined) {
    const dateValidation = validateDate(task.dueDate);
    if (!dateValidation.isValid) {
      errors.push(`Due date: ${dateValidation.error}`);
    }
  }

  // Validate priority
  if (!allowPartial || task.priority !== undefined) {
    if (!isValidTaskPriority(task.priority)) {
      errors.push(`Priority must be one of: ${Object.values(TASK_PRIORITIES).join(', ')}`);
    }
  }

  // Validate status
  if (!allowPartial || task.status !== undefined) {
    if (!isValidTaskStatus(task.status)) {
      errors.push(`Status must be one of: ${Object.values(TASK_STATUSES).join(', ')}`);
    }
  }

  // Validate context
  if (!allowPartial || task.context !== undefined) {
    if (!isValidTaskContext(task.context)) {
      errors.push(`Context must be one of: ${Object.values(TASK_CONTEXTS).join(', ')}`);
    }
  }

  // Validate tags
  if (task.tags !== undefined) {
    const tagsValidation = validateTags(task.tags);
    if (!tagsValidation.isValid) {
      errors.push(`Tags: ${tagsValidation.error}`);
    }
  }

  // Validate timeEstimate (optional, must be positive integer if provided)
  if (task.timeEstimate !== undefined && task.timeEstimate !== null) {
    if (!isValidPositiveInteger(task.timeEstimate)) {
      errors.push('Time estimate must be a positive integer (minutes)');
    }
  }

  // Validate timeSpent (must be non-negative integer)
  if (!allowPartial || task.timeSpent !== undefined) {
    if (!isValidNonNegativeInteger(task.timeSpent)) {
      errors.push('Time spent must be a non-negative integer (minutes)');
    }
  }

  // Validate parentId (optional, must be valid ID if provided)
  if (task.parentId !== undefined && task.parentId !== null) {
    if (typeof task.parentId !== 'string' || task.parentId.length === 0) {
      errors.push('Parent ID must be a non-empty string');
    }
  }

  // Validate dependencies
  if (task.dependencies !== undefined) {
    const depsValidation = validateDependencies(task.dependencies);
    if (!depsValidation.isValid) {
      errors.push(`Dependencies: ${depsValidation.error}`);
    }
  }

  // Validate recurrence
  if (task.recurrence !== undefined) {
    const recurrenceValidation = validateRecurrence(task.recurrence);
    if (!recurrenceValidation.isValid) {
      errors.push(`Recurrence: ${recurrenceValidation.error}`);
    }
  }

  // Validate date fields
  const dateFields = ['createdAt', 'updatedAt', 'completedAt', 'deletedAt'];
  for (const field of dateFields) {
    if (task[field] !== undefined && task[field] !== null) {
      const dateValidation = validateDate(task[field]);
      if (!dateValidation.isValid) {
        errors.push(`${field}: ${dateValidation.error}`);
      }
    }
  }

  // Business logic validations
  if (task.status === TASK_STATUSES.COMPLETED && !task.completedAt) {
    // Note: This is a warning, not an error - completedAt can be set automatically
  }

  if (task.deletedAt && task.status !== TASK_STATUSES.CANCELLED) {
    // Note: Soft-deleted tasks should be cancelled, but this is handled by the store
  }

  return {
    isValid: errors.length === 0,
    errors,
    task: errors.length === 0 ? task : null
  };
}

/**
 * Validates and sanitizes a task object
 * @param {Object} task - Task object to validate and sanitize
 * @param {Object} options - Validation options
 * @returns {Object} { isValid: boolean, errors: Array<string>, task: Object|null }
 */
export function validateAndSanitizeTask(task, options = {}) {
  if (!task || typeof task !== 'object') {
    return {
      isValid: false,
      errors: ['Task must be an object'],
      task: null
    };
  }

  // Create sanitized copy
  const sanitized = { ...task };

  // Sanitize string fields
  if (sanitized.title) {
    sanitized.title = sanitizeString(sanitized.title);
  }
  if (sanitized.description) {
    sanitized.description = sanitizeString(sanitized.description);
  }
  if (Array.isArray(sanitized.tags)) {
    sanitized.tags = sanitized.tags.map(tag => sanitizeString(tag));
  }

  // Validate the sanitized task
  return validateTask(sanitized, options);
}

export default {
  validateTask,
  validateAndSanitizeTask,
  validateTitle,
  validateDescription,
  validateDate,
  validateRecurrence,
  validateDependencies,
  validateTags,
  TaskValidationError
};

