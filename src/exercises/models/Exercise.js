/**
 * Exercise Model
 * 
 * Defines the structure and validation for Exercise, ExerciseGoal, and ExerciseLog objects
 * as per PRD. Exercises support custom definitions, daily goals, and incremental progress tracking.
 */

import { parseISO, isValid } from 'date-fns';

/**
 * Generates a UUID v4
 * Uses crypto.randomUUID() if available (modern browsers/Node 14.17+),
 * otherwise falls back to a simple implementation
 * @returns {string} UUID string
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Exercise type values
 */
export const EXERCISE_TYPES = {
  REPS: 'reps',
  DURATION: 'duration',
  DISTANCE: 'distance',
  WEIGHT: 'weight'
};

/**
 * Creates a new Exercise object with default values
 * @param {Object} data - Exercise data
 * @returns {Object} Exercise object
 */
export function createExercise(data = {}) {
  const now = new Date().toISOString();
  
  return {
    id: data.id || generateUUID(),
    name: data.name || '',
    type: data.type || EXERCISE_TYPES.REPS,
    unit: data.unit || '',
    category: data.category || null,
    createdAt: data.createdAt || now
  };
}

/**
 * Creates a new ExerciseGoal object with default values
 * @param {Object} data - ExerciseGoal data
 * @returns {Object} ExerciseGoal object
 */
export function createExerciseGoal(data = {}) {
  const now = new Date().toISOString();
  
  return {
    id: data.id || generateUUID(),
    exerciseId: data.exerciseId || '',
    target: data.target || 0,
    date: data.date || now,
    completed: data.completed || 0,
    createdAt: data.createdAt || now
  };
}

/**
 * Creates a new ExerciseLog object with default values
 * @param {Object} data - ExerciseLog data
 * @returns {Object} ExerciseLog object
 */
export function createExerciseLog(data = {}) {
  const now = new Date().toISOString();
  
  return {
    id: data.id || generateUUID(),
    exerciseId: data.exerciseId || '',
    amount: data.amount || 0,
    timestamp: data.timestamp || now,
    goalId: data.goalId || null
  };
}

/**
 * Normalizes an Exercise object, ensuring all fields are properly formatted
 * @param {Object} exercise - Exercise object to normalize
 * @returns {Object} Normalized exercise object
 */
export function normalizeExercise(exercise) {
  if (!exercise || typeof exercise !== 'object') {
    throw new Error('Exercise must be an object');
  }

  const normalized = { ...exercise };

  // Ensure dates are ISO strings
  if (normalized.createdAt) {
    if (normalized.createdAt instanceof Date) {
      normalized.createdAt = normalized.createdAt.toISOString();
    } else if (typeof normalized.createdAt === 'string') {
      const date = parseISO(normalized.createdAt);
      if (!isValid(date)) {
        throw new Error('Invalid date format for createdAt');
      }
    }
  }

  // Ensure category is null or string
  if (normalized.category !== null && normalized.category !== undefined) {
    if (typeof normalized.category !== 'string') {
      normalized.category = String(normalized.category);
    }
  } else {
    normalized.category = null;
  }

  return normalized;
}

/**
 * Normalizes an ExerciseGoal object, ensuring all fields are properly formatted
 * @param {Object} goal - ExerciseGoal object to normalize
 * @returns {Object} Normalized goal object
 */
export function normalizeExerciseGoal(goal) {
  if (!goal || typeof goal !== 'object') {
    throw new Error('ExerciseGoal must be an object');
  }

  const normalized = { ...goal };

  // Ensure dates are ISO strings
  const dateFields = ['date', 'createdAt'];
  dateFields.forEach(field => {
    if (normalized[field]) {
      if (normalized[field] instanceof Date) {
        normalized[field] = normalized[field].toISOString();
      } else if (typeof normalized[field] === 'string') {
        const date = parseISO(normalized[field]);
        if (!isValid(date)) {
          throw new Error(`Invalid date format for ${field}`);
        }
      }
    }
  });

  // Ensure numbers are numbers
  if (typeof normalized.target !== 'number') {
    normalized.target = Number(normalized.target) || 0;
  }
  if (typeof normalized.completed !== 'number') {
    normalized.completed = Number(normalized.completed) || 0;
  }

  return normalized;
}

/**
 * Normalizes an ExerciseLog object, ensuring all fields are properly formatted
 * @param {Object} log - ExerciseLog object to normalize
 * @returns {Object} Normalized log object
 */
export function normalizeExerciseLog(log) {
  if (!log || typeof log !== 'object') {
    throw new Error('ExerciseLog must be an object');
  }

  const normalized = { ...log };

  // Ensure timestamp is ISO string
  if (normalized.timestamp) {
    if (normalized.timestamp instanceof Date) {
      normalized.timestamp = normalized.timestamp.toISOString();
    } else if (typeof normalized.timestamp === 'string') {
      const date = parseISO(normalized.timestamp);
      if (!isValid(date)) {
        throw new Error('Invalid date format for timestamp');
      }
    }
  }

  // Ensure amount is a number
  if (typeof normalized.amount !== 'number') {
    normalized.amount = Number(normalized.amount) || 0;
  }

  // Ensure goalId is null or string
  if (normalized.goalId !== null && normalized.goalId !== undefined) {
    if (typeof normalized.goalId !== 'string') {
      normalized.goalId = String(normalized.goalId);
    }
  } else {
    normalized.goalId = null;
  }

  return normalized;
}

/**
 * Exercise model type definition (for documentation)
 * @typedef {Object} Exercise
 * @property {string} id - UUID
 * @property {string} name - Exercise name
 * @property {string} type - 'reps' | 'duration' | 'distance' | 'weight'
 * @property {string} unit - Unit of measurement (e.g., 'reps', 'minutes', 'km', 'kg')
 * @property {string|null} category - Optional category
 * @property {string} createdAt - ISO date string
 */

/**
 * ExerciseGoal model type definition (for documentation)
 * @typedef {Object} ExerciseGoal
 * @property {string} id - UUID
 * @property {string} exerciseId - Reference to Exercise ID
 * @property {number} target - Target value for the goal
 * @property {string} date - ISO date string for the goal date
 * @property {number} completed - Completed value (incremental)
 * @property {string} createdAt - ISO date string
 */

/**
 * ExerciseLog model type definition (for documentation)
 * @typedef {Object} ExerciseLog
 * @property {string} id - UUID
 * @property {string} exerciseId - Reference to Exercise ID
 * @property {number} amount - Amount logged
 * @property {string} timestamp - ISO date string
 * @property {string|null} goalId - Optional reference to ExerciseGoal ID
 */

export default {
  createExercise,
  createExerciseGoal,
  createExerciseLog,
  normalizeExercise,
  normalizeExerciseGoal,
  normalizeExerciseLog,
  EXERCISE_TYPES
};

