/**
 * Exercise CRUD Operations
 * 
 * Provides create, read, update, and delete operations for exercises, goals, and logs
 * with validation and proper error handling.
 */

import {
  createExercise,
  createExerciseGoal,
  createExerciseLog,
  normalizeExercise,
  normalizeExerciseGoal,
  normalizeExerciseLog
} from '../models/Exercise.js';
import {
  validateAndSanitizeExercise,
  validateAndSanitizeExerciseGoal,
  validateAndSanitizeExerciseLog,
  ExerciseValidationError
} from '../models/validateExercise.js';
import { sanitizeString } from '../../utils/validation.js';
import exerciseStores from '../../storage/indexeddb/stores/exerciseStore.js';

/**
 * Custom error class for exercise operations
 */
export class ExerciseOperationError extends Error {
  constructor(message, code = 'EXERCISE_OPERATION_ERROR') {
    super(message);
    this.name = 'ExerciseOperationError';
    this.code = code;
  }
}

// ============================================================================
// EXERCISE CRUD OPERATIONS
// ============================================================================

/**
 * Creates a new exercise
 * @param {Object} exerciseData - Exercise data (name, type, unit are required)
 * @returns {Promise<Object>} Promise resolving to the created exercise
 * @throws {ExerciseValidationError} If validation fails
 * @throws {ExerciseOperationError} If creation fails
 */
export async function createExerciseOperation(exerciseData) {
  console.log('[Adder] Creating exercise:', { name: exerciseData.name, type: exerciseData.type, unit: exerciseData.unit });
  try {
    // Sanitize input data first
    const sanitized = { ...exerciseData };
    if (sanitized.name) {
      sanitized.name = sanitizeString(sanitized.name);
    }
    if (sanitized.unit) {
      sanitized.unit = sanitizeString(sanitized.unit);
    }
    if (sanitized.category) {
      sanitized.category = sanitizeString(sanitized.category);
    }

    // Create exercise using model (sets defaults, generates ID, timestamps)
    const exercise = createExercise(sanitized);
    console.log('[Adder] Exercise model created:', { id: exercise.id, name: exercise.name });
    
    // Validate the complete exercise
    const validation = validateAndSanitizeExercise(exercise);
    
    if (!validation.isValid) {
      console.error('[Adder] Exercise validation failed:', validation.errors);
      throw new ExerciseValidationError(
        `Exercise validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    
    // Normalize the exercise (ensures dates are ISO strings)
    const normalizedExercise = normalizeExercise(validation.exercise);
    
    // Store in IndexedDB
    await exerciseStores.exercises.create(normalizedExercise);
    console.log('[Adder] Exercise created successfully:', { id: normalizedExercise.id, name: normalizedExercise.name });
    
    return normalizedExercise;
  } catch (error) {
    console.error('[Adder] Error creating exercise:', { error: error.message, code: error.code, exerciseData });
    if (error instanceof ExerciseValidationError) {
      throw error;
    }
    
    // Handle IndexedDB errors
    if (error.name === 'ConstraintError' || error.message.includes('already exists')) {
      console.warn('[Adder] Duplicate exercise detected:', exerciseData.id || 'unknown');
      throw new ExerciseOperationError(
        `Exercise with ID ${exerciseData.id || 'unknown'} already exists`,
        'DUPLICATE_EXERCISE'
      );
    }
    
    throw new ExerciseOperationError(
      `Failed to create exercise: ${error.message}`,
      'CREATE_ERROR'
    );
  }
}

/**
 * Retrieves an exercise by ID
 * @param {string} exerciseId - Exercise ID
 * @returns {Promise<Object|null>} Promise resolving to the exercise or null if not found
 * @throws {ExerciseOperationError} If retrieval fails
 */
export async function getExercise(exerciseId) {
  try {
    if (!exerciseId || typeof exerciseId !== 'string') {
      throw new ExerciseOperationError('Exercise ID is required and must be a string', 'INVALID_ID');
    }
    
    const exercise = await exerciseStores.exercises.get(exerciseId);
    
    if (!exercise) {
      return null;
    }
    
    // Normalize dates
    return normalizeExercise(exercise);
  } catch (error) {
    if (error instanceof ExerciseOperationError) {
      throw error;
    }
    
    throw new ExerciseOperationError(
      `Failed to retrieve exercise: ${error.message}`,
      'GET_ERROR'
    );
  }
}

/**
 * Retrieves multiple exercises with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.type - Filter by exercise type
 * @param {string} filters.category - Filter by category
 * @returns {Promise<Array>} Promise resolving to array of exercises
 * @throws {ExerciseOperationError} If retrieval fails
 */
export async function getExercises(filters = {}) {
  try {
    const { type, category } = filters;
    
    let exercises = [];
    
    // Apply specific filters
    if (type) {
      exercises = await exerciseStores.exercises.getByType(type);
    } else if (category) {
      exercises = await exerciseStores.exercises.getByCategory(category);
    } else {
      // Get all exercises
      exercises = await exerciseStores.exercises.getAll();
    }
    
    // Normalize all exercises
    return exercises.map(exercise => normalizeExercise(exercise));
  } catch (error) {
    throw new ExerciseOperationError(
      `Failed to retrieve exercises: ${error.message}`,
      'GET_EXERCISES_ERROR'
    );
  }
}

/**
 * Updates an existing exercise
 * @param {string} exerciseId - Exercise ID to update
 * @param {Object} updates - Partial exercise data to update
 * @returns {Promise<Object>} Promise resolving to the updated exercise
 * @throws {ExerciseValidationError} If validation fails
 * @throws {ExerciseOperationError} If update fails
 */
export async function updateExercise(exerciseId, updates) {
  try {
    if (!exerciseId || typeof exerciseId !== 'string') {
      throw new ExerciseOperationError('Exercise ID is required and must be a string', 'INVALID_ID');
    }
    
    if (!updates || typeof updates !== 'object') {
      throw new ExerciseOperationError('Updates must be a valid object', 'INVALID_UPDATES');
    }
    
    // Get existing exercise
    const existingExercise = await getExercise(exerciseId);
    
    if (!existingExercise) {
      throw new ExerciseOperationError(`Exercise with ID ${exerciseId} not found`, 'EXERCISE_NOT_FOUND');
    }
    
    // Merge updates with existing exercise
    const mergedExercise = {
      ...existingExercise,
      ...updates,
      id: exerciseId // Ensure ID cannot be changed
    };
    
    // Validate the merged exercise (allow partial updates)
    const validation = validateAndSanitizeExercise(mergedExercise, { allowPartial: true });
    
    if (!validation.isValid) {
      throw new ExerciseValidationError(
        `Exercise validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    
    // Normalize the updated exercise
    const normalizedExercise = normalizeExercise(validation.exercise);
    
    // Update in IndexedDB
    await exerciseStores.exercises.update(exerciseId, normalizedExercise);
    
    return normalizedExercise;
  } catch (error) {
    if (error instanceof ExerciseValidationError || error instanceof ExerciseOperationError) {
      throw error;
    }
    
    throw new ExerciseOperationError(
      `Failed to update exercise: ${error.message}`,
      'UPDATE_ERROR'
    );
  }
}

/**
 * Deletes an exercise
 * @param {string} exerciseId - Exercise ID to delete
 * @returns {Promise<void>}
 * @throws {ExerciseOperationError} If deletion fails
 */
export async function deleteExercise(exerciseId) {
  try {
    if (!exerciseId || typeof exerciseId !== 'string') {
      throw new ExerciseOperationError('Exercise ID is required and must be a string', 'INVALID_ID');
    }
    
    // Check if exercise exists
    const existingExercise = await getExercise(exerciseId);
    
    if (!existingExercise) {
      throw new ExerciseOperationError(`Exercise with ID ${exerciseId} not found`, 'EXERCISE_NOT_FOUND');
    }
    
    // Delete from IndexedDB
    await exerciseStores.exercises.delete(exerciseId);
  } catch (error) {
    if (error instanceof ExerciseOperationError) {
      throw error;
    }
    
    throw new ExerciseOperationError(
      `Failed to delete exercise: ${error.message}`,
      'DELETE_ERROR'
    );
  }
}

// ============================================================================
// EXERCISE GOAL CRUD OPERATIONS
// ============================================================================

/**
 * Creates a new exercise goal
 * @param {Object} goalData - Goal data (exerciseId, target, date are required)
 * @returns {Promise<Object>} Promise resolving to the created goal
 * @throws {ExerciseValidationError} If validation fails
 * @throws {ExerciseOperationError} If creation fails
 */
export async function createExerciseGoalOperation(goalData) {
  try {
    // Verify exercise exists
    const exercise = await getExercise(goalData.exerciseId);
    if (!exercise) {
      throw new ExerciseOperationError(
        `Exercise with ID ${goalData.exerciseId} not found`,
        'EXERCISE_NOT_FOUND'
      );
    }

    // Create goal using model
    const goal = createExerciseGoal(goalData);
    
    // Validate the complete goal
    const validation = validateAndSanitizeExerciseGoal(goal);
    
    if (!validation.isValid) {
      throw new ExerciseValidationError(
        `Goal validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    
    // Normalize the goal
    const normalizedGoal = normalizeExerciseGoal(validation.goal);
    
    // Store in IndexedDB
    await exerciseStores.goals.create(normalizedGoal);
    
    return normalizedGoal;
  } catch (error) {
    if (error instanceof ExerciseValidationError || error instanceof ExerciseOperationError) {
      throw error;
    }
    
    throw new ExerciseOperationError(
      `Failed to create goal: ${error.message}`,
      'CREATE_ERROR'
    );
  }
}

/**
 * Retrieves a goal by ID
 * @param {string} goalId - Goal ID
 * @returns {Promise<Object|null>} Promise resolving to the goal or null if not found
 * @throws {ExerciseOperationError} If retrieval fails
 */
export async function getExerciseGoal(goalId) {
  try {
    if (!goalId || typeof goalId !== 'string') {
      throw new ExerciseOperationError('Goal ID is required and must be a string', 'INVALID_ID');
    }
    
    const goal = await exerciseStores.goals.get(goalId);
    
    if (!goal) {
      return null;
    }
    
    return normalizeExerciseGoal(goal);
  } catch (error) {
    if (error instanceof ExerciseOperationError) {
      throw error;
    }
    
    throw new ExerciseOperationError(
      `Failed to retrieve goal: ${error.message}`,
      'GET_ERROR'
    );
  }
}

/**
 * Retrieves multiple goals with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.exerciseId - Filter by exercise ID
 * @param {Date|string} filters.date - Filter by date
 * @param {boolean} filters.incomplete - Get only incomplete goals
 * @returns {Promise<Array>} Promise resolving to array of goals
 * @throws {ExerciseOperationError} If retrieval fails
 */
export async function getExerciseGoals(filters = {}) {
  try {
    const { exerciseId, date, incomplete } = filters;
    
    let goals = [];
    
    // Apply specific filters
    if (exerciseId) {
      goals = await exerciseStores.goals.getByExerciseId(exerciseId);
    } else if (date) {
      const dateObj = date instanceof Date ? date : new Date(date);
      goals = await exerciseStores.goals.getByDate(dateObj);
    } else if (incomplete) {
      goals = await exerciseStores.goals.getIncomplete();
    } else {
      // Get all goals
      goals = await exerciseStores.goals.getAll();
    }
    
    return goals.map(goal => normalizeExerciseGoal(goal));
  } catch (error) {
    throw new ExerciseOperationError(
      `Failed to retrieve goals: ${error.message}`,
      'GET_GOALS_ERROR'
    );
  }
}

/**
 * Updates an existing goal
 * @param {string} goalId - Goal ID to update
 * @param {Object} updates - Partial goal data to update
 * @returns {Promise<Object>} Promise resolving to the updated goal
 * @throws {ExerciseValidationError} If validation fails
 * @throws {ExerciseOperationError} If update fails
 */
export async function updateExerciseGoal(goalId, updates) {
  try {
    if (!goalId || typeof goalId !== 'string') {
      throw new ExerciseOperationError('Goal ID is required and must be a string', 'INVALID_ID');
    }
    
    if (!updates || typeof updates !== 'object') {
      throw new ExerciseOperationError('Updates must be a valid object', 'INVALID_UPDATES');
    }
    
    // Get existing goal
    const existingGoal = await getExerciseGoal(goalId);
    
    if (!existingGoal) {
      throw new ExerciseOperationError(`Goal with ID ${goalId} not found`, 'GOAL_NOT_FOUND');
    }
    
    // If exerciseId is being updated, verify the new exercise exists
    if (updates.exerciseId && updates.exerciseId !== existingGoal.exerciseId) {
      const exercise = await getExercise(updates.exerciseId);
      if (!exercise) {
        throw new ExerciseOperationError(
          `Exercise with ID ${updates.exerciseId} not found`,
          'EXERCISE_NOT_FOUND'
        );
      }
    }
    
    // Merge updates with existing goal
    const mergedGoal = {
      ...existingGoal,
      ...updates,
      id: goalId
    };
    
    // Validate the merged goal
    const validation = validateAndSanitizeExerciseGoal(mergedGoal, { allowPartial: true });
    
    if (!validation.isValid) {
      throw new ExerciseValidationError(
        `Goal validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    
    // Normalize the updated goal
    const normalizedGoal = normalizeExerciseGoal(validation.goal);
    
    // Update in IndexedDB
    await exerciseStores.goals.update(goalId, normalizedGoal);
    
    return normalizedGoal;
  } catch (error) {
    if (error instanceof ExerciseValidationError || error instanceof ExerciseOperationError) {
      throw error;
    }
    
    throw new ExerciseOperationError(
      `Failed to update goal: ${error.message}`,
      'UPDATE_ERROR'
    );
  }
}

/**
 * Deletes a goal
 * @param {string} goalId - Goal ID to delete
 * @returns {Promise<void>}
 * @throws {ExerciseOperationError} If deletion fails
 */
export async function deleteExerciseGoal(goalId) {
  try {
    if (!goalId || typeof goalId !== 'string') {
      throw new ExerciseOperationError('Goal ID is required and must be a string', 'INVALID_ID');
    }
    
    // Check if goal exists
    const existingGoal = await getExerciseGoal(goalId);
    
    if (!existingGoal) {
      throw new ExerciseOperationError(`Goal with ID ${goalId} not found`, 'GOAL_NOT_FOUND');
    }
    
    // Delete from IndexedDB
    await exerciseStores.goals.delete(goalId);
  } catch (error) {
    if (error instanceof ExerciseOperationError) {
      throw error;
    }
    
    throw new ExerciseOperationError(
      `Failed to delete goal: ${error.message}`,
      'DELETE_ERROR'
    );
  }
}

// ============================================================================
// EXERCISE LOG CRUD OPERATIONS
// ============================================================================

/**
 * Creates a new exercise log entry
 * @param {Object} logData - Log data (exerciseId, amount are required)
 * @returns {Promise<Object>} Promise resolving to the created log
 * @throws {ExerciseValidationError} If validation fails
 * @throws {ExerciseOperationError} If creation fails
 */
export async function createExerciseLogOperation(logData) {
  try {
    // Verify exercise exists
    const exercise = await getExercise(logData.exerciseId);
    if (!exercise) {
      throw new ExerciseOperationError(
        `Exercise with ID ${logData.exerciseId} not found`,
        'EXERCISE_NOT_FOUND'
      );
    }

    // If goalId is provided, verify goal exists and update its completed value
    if (logData.goalId) {
      const goal = await getExerciseGoal(logData.goalId);
      if (!goal) {
        throw new ExerciseOperationError(
          `Goal with ID ${logData.goalId} not found`,
          'GOAL_NOT_FOUND'
        );
      }
      
      // Verify goal belongs to the same exercise
      if (goal.exerciseId !== logData.exerciseId) {
        throw new ExerciseOperationError(
          'Goal does not belong to the specified exercise',
          'GOAL_MISMATCH'
        );
      }
    }

    // Create log using model
    const log = createExerciseLog(logData);
    
    // Validate the complete log
    const validation = validateAndSanitizeExerciseLog(log);
    
    if (!validation.isValid) {
      throw new ExerciseValidationError(
        `Log validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    
    // Normalize the log
    const normalizedLog = normalizeExerciseLog(validation.log);
    
    // Store in IndexedDB
    await exerciseStores.logs.create(normalizedLog);
    
    // If goalId is provided, increment the goal's completed value
    if (normalizedLog.goalId) {
      const goal = await getExerciseGoal(normalizedLog.goalId);
      await updateExerciseGoal(normalizedLog.goalId, {
        completed: goal.completed + normalizedLog.amount
      });
    }
    
    return normalizedLog;
  } catch (error) {
    if (error instanceof ExerciseValidationError || error instanceof ExerciseOperationError) {
      throw error;
    }
    
    throw new ExerciseOperationError(
      `Failed to create log: ${error.message}`,
      'CREATE_ERROR'
    );
  }
}

/**
 * Retrieves a log by ID
 * @param {string} logId - Log ID
 * @returns {Promise<Object|null>} Promise resolving to the log or null if not found
 * @throws {ExerciseOperationError} If retrieval fails
 */
export async function getExerciseLog(logId) {
  try {
    if (!logId || typeof logId !== 'string') {
      throw new ExerciseOperationError('Log ID is required and must be a string', 'INVALID_ID');
    }
    
    const log = await exerciseStores.logs.get(logId);
    
    if (!log) {
      return null;
    }
    
    return normalizeExerciseLog(log);
  } catch (error) {
    if (error instanceof ExerciseOperationError) {
      throw error;
    }
    
    throw new ExerciseOperationError(
      `Failed to retrieve log: ${error.message}`,
      'GET_ERROR'
    );
  }
}

/**
 * Retrieves multiple logs with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.exerciseId - Filter by exercise ID
 * @param {Date|string} filters.startDate - Start date for range
 * @param {Date|string} filters.endDate - End date for range
 * @param {string} filters.goalId - Filter by goal ID
 * @returns {Promise<Array>} Promise resolving to array of logs
 * @throws {ExerciseOperationError} If retrieval fails
 */
export async function getExerciseLogs(filters = {}) {
  try {
    const { exerciseId, startDate, endDate, goalId } = filters;
    
    let logs = [];
    
    // Apply specific filters
    if (goalId) {
      logs = await exerciseStores.logs.getByGoalId(goalId);
    } else if (exerciseId) {
      logs = await exerciseStores.logs.getByExerciseId(exerciseId);
    } else if (startDate && endDate) {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);
      logs = await exerciseStores.logs.getByDateRange(start, end);
    } else {
      // Get all logs
      logs = await exerciseStores.logs.getAll();
    }
    
    return logs.map(log => normalizeExerciseLog(log));
  } catch (error) {
    throw new ExerciseOperationError(
      `Failed to retrieve logs: ${error.message}`,
      'GET_LOGS_ERROR'
    );
  }
}

/**
 * Updates an existing log
 * @param {string} logId - Log ID to update
 * @param {Object} updates - Partial log data to update
 * @returns {Promise<Object>} Promise resolving to the updated log
 * @throws {ExerciseValidationError} If validation fails
 * @throws {ExerciseOperationError} If update fails
 */
export async function updateExerciseLog(logId, updates) {
  try {
    if (!logId || typeof logId !== 'string') {
      throw new ExerciseOperationError('Log ID is required and must be a string', 'INVALID_ID');
    }
    
    if (!updates || typeof updates !== 'object') {
      throw new ExerciseOperationError('Updates must be a valid object', 'INVALID_UPDATES');
    }
    
    // Get existing log
    const existingLog = await getExerciseLog(logId);
    
    if (!existingLog) {
      throw new ExerciseOperationError(`Log with ID ${logId} not found`, 'LOG_NOT_FOUND');
    }
    
    // If amount is being updated and log has a goalId, update the goal's completed value
    if (updates.amount !== undefined && existingLog.goalId) {
      const goal = await getExerciseGoal(existingLog.goalId);
      const amountDiff = updates.amount - existingLog.amount;
      await updateExerciseGoal(existingLog.goalId, {
        completed: goal.completed + amountDiff
      });
    }
    
    // Merge updates with existing log
    const mergedLog = {
      ...existingLog,
      ...updates,
      id: logId
    };
    
    // Validate the merged log
    const validation = validateAndSanitizeExerciseLog(mergedLog, { allowPartial: true });
    
    if (!validation.isValid) {
      throw new ExerciseValidationError(
        `Log validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    
    // Normalize the updated log
    const normalizedLog = normalizeExerciseLog(validation.log);
    
    // Update in IndexedDB
    await exerciseStores.logs.update(logId, normalizedLog);
    
    return normalizedLog;
  } catch (error) {
    if (error instanceof ExerciseValidationError || error instanceof ExerciseOperationError) {
      throw error;
    }
    
    throw new ExerciseOperationError(
      `Failed to update log: ${error.message}`,
      'UPDATE_ERROR'
    );
  }
}

/**
 * Deletes a log
 * @param {string} logId - Log ID to delete
 * @returns {Promise<void>}
 * @throws {ExerciseOperationError} If deletion fails
 */
export async function deleteExerciseLog(logId) {
  try {
    if (!logId || typeof logId !== 'string') {
      throw new ExerciseOperationError('Log ID is required and must be a string', 'INVALID_ID');
    }
    
    // Get existing log to check if it has a goalId
    const existingLog = await getExerciseLog(logId);
    
    if (!existingLog) {
      throw new ExerciseOperationError(`Log with ID ${logId} not found`, 'LOG_NOT_FOUND');
    }
    
    // If log has a goalId, decrement the goal's completed value
    if (existingLog.goalId) {
      const goal = await getExerciseGoal(existingLog.goalId);
      await updateExerciseGoal(existingLog.goalId, {
        completed: Math.max(0, goal.completed - existingLog.amount)
      });
    }
    
    // Delete from IndexedDB
    await exerciseStores.logs.delete(logId);
  } catch (error) {
    if (error instanceof ExerciseOperationError) {
      throw error;
    }
    
    throw new ExerciseOperationError(
      `Failed to delete log: ${error.message}`,
      'DELETE_ERROR'
    );
  }
}

// Export create functions as named exports for convenience
export { createExerciseOperation as createExercise };
export { createExerciseGoalOperation as createExerciseGoal };
export { createExerciseLogOperation as createExerciseLog };

export default {
  // Exercise operations
  createExercise: createExerciseOperation,
  getExercise,
  getExercises,
  updateExercise,
  deleteExercise,
  
  // Goal operations
  createExerciseGoal: createExerciseGoalOperation,
  getExerciseGoal,
  getExerciseGoals,
  updateExerciseGoal,
  deleteExerciseGoal,
  
  // Log operations
  createExerciseLog: createExerciseLogOperation,
  getExerciseLog,
  getExerciseLogs,
  updateExerciseLog,
  deleteExerciseLog,
  
  // Error classes
  ExerciseOperationError
};

