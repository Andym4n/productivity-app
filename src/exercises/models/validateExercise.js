/**
 * Exercise Validation Logic
 * 
 * Validates Exercise, ExerciseGoal, and ExerciseLog objects according to PRD requirements.
 * Uses date-fns for date validation and existing validation utilities.
 */

import { parseISO, isValid } from 'date-fns';
import {
  isValidString,
  isValidUUID,
  isValidExerciseType,
  isValidNonNegativeInteger,
  isValidPositiveInteger,
  sanitizeString
} from '../../utils/validation.js';
import { EXERCISE_TYPES } from './Exercise.js';

/**
 * Validation error class
 */
export class ExerciseValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ExerciseValidationError';
    this.field = field;
  }
}

/**
 * Validates an exercise name
 * @param {string} name - Exercise name
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateExerciseName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Exercise name is required' };
  }

  const sanitized = sanitizeString(name);
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Exercise name cannot be empty' };
  }

  if (sanitized.length > 200) {
    return { isValid: false, error: 'Exercise name must be 200 characters or less' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates an exercise type
 * @param {string} type - Exercise type
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateExerciseType(type) {
  if (!isValidExerciseType(type)) {
    return { 
      isValid: false, 
      error: `Exercise type must be one of: ${Object.values(EXERCISE_TYPES).join(', ')}` 
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validates an exercise unit
 * @param {string} unit - Exercise unit
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateExerciseUnit(unit) {
  if (!unit || typeof unit !== 'string') {
    return { isValid: false, error: 'Exercise unit is required' };
  }

  const sanitized = sanitizeString(unit);
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Exercise unit cannot be empty' };
  }

  if (sanitized.length > 50) {
    return { isValid: false, error: 'Exercise unit must be 50 characters or less' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates an exercise category
 * @param {string|null} category - Exercise category
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateExerciseCategory(category) {
  if (category === null || category === undefined) {
    return { isValid: true, error: null };
  }

  if (typeof category !== 'string') {
    return { isValid: false, error: 'Exercise category must be a string or null' };
  }

  const sanitized = sanitizeString(category);
  
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Exercise category must be 100 characters or less' };
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
 * Validates a complete Exercise object
 * @param {Object} exercise - Exercise object to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.requireId - Whether ID is required (default: false for new exercises)
 * @param {boolean} options.allowPartial - Whether to allow partial updates (default: false)
 * @returns {Object} { isValid: boolean, errors: Array<string>, exercise: Object|null }
 */
export function validateExercise(exercise, options = {}) {
  const { requireId = false, allowPartial = false } = options;
  const errors = [];

  if (!exercise || typeof exercise !== 'object') {
    return {
      isValid: false,
      errors: ['Exercise must be an object'],
      exercise: null
    };
  }

  // Validate ID if required or present
  if (requireId || exercise.id) {
    if (!exercise.id || typeof exercise.id !== 'string') {
      errors.push('Exercise ID is required and must be a string');
    }
  }

  // Validate name (required unless partial update)
  if (!allowPartial || exercise.name !== undefined) {
    const nameValidation = validateExerciseName(exercise.name);
    if (!nameValidation.isValid) {
      errors.push(`Name: ${nameValidation.error}`);
    }
  }

  // Validate type (required unless partial update)
  if (!allowPartial || exercise.type !== undefined) {
    const typeValidation = validateExerciseType(exercise.type);
    if (!typeValidation.isValid) {
      errors.push(`Type: ${typeValidation.error}`);
    }
  }

  // Validate unit (required unless partial update)
  if (!allowPartial || exercise.unit !== undefined) {
    const unitValidation = validateExerciseUnit(exercise.unit);
    if (!unitValidation.isValid) {
      errors.push(`Unit: ${unitValidation.error}`);
    }
  }

  // Validate category (optional)
  if (exercise.category !== undefined) {
    const categoryValidation = validateExerciseCategory(exercise.category);
    if (!categoryValidation.isValid) {
      errors.push(`Category: ${categoryValidation.error}`);
    }
  }

  // Validate createdAt if present
  if (exercise.createdAt !== undefined && exercise.createdAt !== null) {
    const dateValidation = validateDate(exercise.createdAt);
    if (!dateValidation.isValid) {
      errors.push(`CreatedAt: ${dateValidation.error}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    exercise: errors.length === 0 ? exercise : null
  };
}

/**
 * Validates a complete ExerciseGoal object
 * @param {Object} goal - ExerciseGoal object to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.requireId - Whether ID is required (default: false for new goals)
 * @param {boolean} options.allowPartial - Whether to allow partial updates (default: false)
 * @returns {Object} { isValid: boolean, errors: Array<string>, goal: Object|null }
 */
export function validateExerciseGoal(goal, options = {}) {
  const { requireId = false, allowPartial = false } = options;
  const errors = [];

  if (!goal || typeof goal !== 'object') {
    return {
      isValid: false,
      errors: ['ExerciseGoal must be an object'],
      goal: null
    };
  }

  // Validate ID if required or present
  if (requireId || goal.id) {
    if (!goal.id || typeof goal.id !== 'string') {
      errors.push('Goal ID is required and must be a string');
    }
  }

  // Validate exerciseId (required unless partial update)
  if (!allowPartial || goal.exerciseId !== undefined) {
    if (!goal.exerciseId || typeof goal.exerciseId !== 'string') {
      errors.push('Exercise ID is required and must be a string');
    }
  }

  // Validate target (required unless partial update, must be positive)
  if (!allowPartial || goal.target !== undefined) {
    if (!isValidPositiveInteger(goal.target)) {
      errors.push('Target must be a positive integer');
    }
  }

  // Validate date (required unless partial update)
  if (!allowPartial || goal.date !== undefined) {
    const dateValidation = validateDate(goal.date);
    if (!dateValidation.isValid) {
      errors.push(`Date: ${dateValidation.error}`);
    }
  }

  // Validate completed (must be non-negative)
  if (!allowPartial || goal.completed !== undefined) {
    if (!isValidNonNegativeInteger(goal.completed)) {
      errors.push('Completed must be a non-negative integer');
    }
  }

  // Validate createdAt if present
  if (goal.createdAt !== undefined && goal.createdAt !== null) {
    const dateValidation = validateDate(goal.createdAt);
    if (!dateValidation.isValid) {
      errors.push(`CreatedAt: ${dateValidation.error}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    goal: errors.length === 0 ? goal : null
  };
}

/**
 * Validates a complete ExerciseLog object
 * @param {Object} log - ExerciseLog object to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.requireId - Whether ID is required (default: false for new logs)
 * @param {boolean} options.allowPartial - Whether to allow partial updates (default: false)
 * @returns {Object} { isValid: boolean, errors: Array<string>, log: Object|null }
 */
export function validateExerciseLog(log, options = {}) {
  const { requireId = false, allowPartial = false } = options;
  const errors = [];

  if (!log || typeof log !== 'object') {
    return {
      isValid: false,
      errors: ['ExerciseLog must be an object'],
      log: null
    };
  }

  // Validate ID if required or present
  if (requireId || log.id) {
    if (!log.id || typeof log.id !== 'string') {
      errors.push('Log ID is required and must be a string');
    }
  }

  // Validate exerciseId (required unless partial update)
  if (!allowPartial || log.exerciseId !== undefined) {
    if (!log.exerciseId || typeof log.exerciseId !== 'string') {
      errors.push('Exercise ID is required and must be a string');
    }
  }

  // Validate amount (required unless partial update, must be non-negative)
  if (!allowPartial || log.amount !== undefined) {
    if (!isValidNonNegativeInteger(log.amount)) {
      errors.push('Amount must be a non-negative integer');
    }
  }

  // Validate timestamp (required unless partial update)
  if (!allowPartial || log.timestamp !== undefined) {
    const dateValidation = validateDate(log.timestamp);
    if (!dateValidation.isValid) {
      errors.push(`Timestamp: ${dateValidation.error}`);
    }
  }

  // Validate goalId (optional)
  if (log.goalId !== undefined && log.goalId !== null) {
    if (typeof log.goalId !== 'string' || log.goalId.length === 0) {
      errors.push('Goal ID must be a non-empty string or null');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    log: errors.length === 0 ? log : null
  };
}

/**
 * Validates and sanitizes an Exercise object
 * @param {Object} exercise - Exercise object to validate and sanitize
 * @param {Object} options - Validation options
 * @returns {Object} { isValid: boolean, errors: Array<string>, exercise: Object|null }
 */
export function validateAndSanitizeExercise(exercise, options = {}) {
  if (!exercise || typeof exercise !== 'object') {
    return {
      isValid: false,
      errors: ['Exercise must be an object'],
      exercise: null
    };
  }

  // Create sanitized copy
  const sanitized = { ...exercise };

  // Sanitize string fields
  if (sanitized.name) {
    sanitized.name = sanitizeString(sanitized.name);
  }
  if (sanitized.unit) {
    sanitized.unit = sanitizeString(sanitized.unit);
  }
  if (sanitized.category) {
    sanitized.category = sanitizeString(sanitized.category);
  }

  // Validate the sanitized exercise
  return validateExercise(sanitized, options);
}

/**
 * Validates and sanitizes an ExerciseGoal object
 * @param {Object} goal - ExerciseGoal object to validate and sanitize
 * @param {Object} options - Validation options
 * @returns {Object} { isValid: boolean, errors: Array<string>, goal: Object|null }
 */
export function validateAndSanitizeExerciseGoal(goal, options = {}) {
  if (!goal || typeof goal !== 'object') {
    return {
      isValid: false,
      errors: ['ExerciseGoal must be an object'],
      goal: null
    };
  }

  // Create sanitized copy (no string fields to sanitize for goals)
  const sanitized = { ...goal };

  // Validate the sanitized goal
  return validateExerciseGoal(sanitized, options);
}

/**
 * Validates and sanitizes an ExerciseLog object
 * @param {Object} log - ExerciseLog object to validate and sanitize
 * @param {Object} options - Validation options
 * @returns {Object} { isValid: boolean, errors: Array<string>, log: Object|null }
 */
export function validateAndSanitizeExerciseLog(log, options = {}) {
  if (!log || typeof log !== 'object') {
    return {
      isValid: false,
      errors: ['ExerciseLog must be an object'],
      log: null
    };
  }

  // Create sanitized copy (no string fields to sanitize for logs)
  const sanitized = { ...log };

  // Validate the sanitized log
  return validateExerciseLog(sanitized, options);
}

export default {
  validateExercise,
  validateExerciseGoal,
  validateExerciseLog,
  validateAndSanitizeExercise,
  validateAndSanitizeExerciseGoal,
  validateAndSanitizeExerciseLog,
  validateExerciseName,
  validateExerciseType,
  validateExerciseUnit,
  validateExerciseCategory,
  validateDate,
  ExerciseValidationError
};

