/**
 * Task CRUD Operations
 * 
 * Provides create, read, update, and delete operations for tasks
 * with validation and soft delete support.
 */

import { createTask, normalizeTask } from '../models/Task.js';
import { validateTask, validateAndSanitizeTask, TaskValidationError } from '../models/validateTask.js';
import { sanitizeString } from '../../utils/validation.js';
import { tasksStore } from '../../storage/index.js';
import { TASK_STATUSES } from '../models/Task.js';
import {
  validateDependencyAddition,
  validateSubtaskCreation,
  CircularDependencyError
} from '../utils/dependencies.js';
import {
  startTimer,
  stopTimer,
  stopAnyTimer,
  validateManualTimeEntry
} from '../utils/timeTracking.js';
import {
  onTaskCreated,
  onTaskCompleted,
  onTaskUpdated
} from '../../automation/triggers/taskLifecycleHooks.js';

/**
 * Custom error class for task operations
 */
export class TaskOperationError extends Error {
  constructor(message, code = 'TASK_OPERATION_ERROR') {
    super(message);
    this.name = 'TaskOperationError';
    this.code = code;
  }
}

/**
 * Creates a new task
 * @param {Object} taskData - Task data (title is required)
 * @returns {Promise<Object>} Promise resolving to the created task
 * @throws {TaskValidationError} If validation fails
 * @throws {TaskOperationError} If creation fails
 */
export async function createTaskOperation(taskData) {
  console.log('[Adder] Creating task:', { title: taskData.title, tags: taskData.tags, priority: taskData.priority });
  try {
    // Sanitize input data first
    const sanitized = { ...taskData };
    if (sanitized.title) {
      sanitized.title = sanitizeString(sanitized.title);
    }
    if (sanitized.description) {
      sanitized.description = sanitizeString(sanitized.description);
    }
    if (Array.isArray(sanitized.tags)) {
      sanitized.tags = sanitized.tags.map(tag => sanitizeString(tag));
    }

    // Create task using model (sets defaults, generates ID, timestamps)
    // This ensures all required fields have values
    const task = createTask(sanitized);
    console.log('[Adder] Task model created:', { id: task.id, title: task.title });
    
    // Now validate the complete task with defaults
    const validation = validateTask(task);
    
    if (!validation.isValid) {
      console.error('[Adder] Task validation failed:', validation.errors);
      throw new TaskValidationError(
        `Task validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    
    // Normalize the task (ensures dates are ISO strings)
    const normalizedTask = normalizeTask(validation.task);
    
    // Store in IndexedDB
    await tasksStore.create(normalizedTask);
    console.log('[Adder] Task created successfully:', { id: normalizedTask.id, title: normalizedTask.title });
    
    // Trigger automation hooks
    try {
      await onTaskCreated(normalizedTask);
    } catch (error) {
      // Don't fail task creation if automation hook fails
      console.error('[Automation] Error in task.created hook:', error);
    }
    
    return normalizedTask;
  } catch (error) {
    console.error('[Adder] Error creating task:', { error: error.message, code: error.code, taskData });
    if (error instanceof TaskValidationError) {
      throw error;
    }
    
    // Handle IndexedDB errors
    if (error.name === 'ConstraintError' || error.message.includes('already exists')) {
      console.warn('[Adder] Duplicate task detected:', taskData.id || 'unknown');
      throw new TaskOperationError(
        `Task with ID ${taskData.id || 'unknown'} already exists`,
        'DUPLICATE_TASK'
      );
    }
    
    throw new TaskOperationError(
      `Failed to create task: ${error.message}`,
      'CREATE_ERROR'
    );
  }
}

/**
 * Retrieves a task by ID
 * @param {string} taskId - Task ID
 * @param {Object} options - Options
 * @param {boolean} options.includeDeleted - Include soft-deleted tasks (default: false)
 * @returns {Promise<Object|null>} Promise resolving to the task or null if not found
 * @throws {TaskOperationError} If retrieval fails
 */
export async function getTask(taskId, options = {}) {
  const { includeDeleted = false } = options;
  
  try {
    if (!taskId || typeof taskId !== 'string') {
      throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
    }
    
    const task = await tasksStore.get(taskId);
    
    if (!task) {
      return null;
    }
    
    // Filter out soft-deleted tasks unless explicitly requested
    if (!includeDeleted && task.deletedAt) {
      return null;
    }
    
    // Normalize dates (they should already be ISO strings, but ensure consistency)
    return normalizeTask(task);
  } catch (error) {
    if (error instanceof TaskOperationError) {
      throw error;
    }
    
    throw new TaskOperationError(
      `Failed to retrieve task: ${error.message}`,
      'GET_ERROR'
    );
  }
}

/**
 * Retrieves multiple tasks with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Filter by status
 * @param {string} filters.priority - Filter by priority
 * @param {string} filters.context - Filter by context
 * @param {Date|string} filters.dueDateStart - Start of due date range
 * @param {Date|string} filters.dueDateEnd - End of due date range
 * @param {boolean} filters.includeDeleted - Include soft-deleted tasks (default: false)
 * @param {boolean} filters.dueOrOverdue - Get tasks due today or overdue (default: false)
 * @param {string} filters.parentId - Get subtasks for a parent task
 * @returns {Promise<Array>} Promise resolving to array of tasks
 * @throws {TaskOperationError} If retrieval fails
 */
export async function getTasks(filters = {}) {
  try {
    const {
      status,
      priority,
      context,
      dueDateStart,
      dueDateEnd,
      includeDeleted = false,
      dueOrOverdue = false,
      parentId
    } = filters;
    
    let tasks = [];
    
    // Apply specific filters
    if (parentId) {
      tasks = await tasksStore.getSubtasks(parentId);
    } else if (dueOrOverdue) {
      tasks = await tasksStore.getDueOrOverdue();
    } else if (dueDateStart && dueDateEnd) {
      // Convert to Date objects if they're strings, then ensure proper range
      const start = dueDateStart instanceof Date ? dueDateStart : new Date(dueDateStart);
      const end = dueDateEnd instanceof Date ? dueDateEnd : new Date(dueDateEnd);
      // Ensure dates are at start/end of day for proper range matching
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      // Store methods handle Date to ISO string conversion
      tasks = await tasksStore.getByDueDateRange(start, end);
    } else if (status) {
      tasks = await tasksStore.getByStatus(status);
    } else if (priority) {
      tasks = await tasksStore.getByPriority(priority);
    } else if (context) {
      tasks = await tasksStore.getByContext(context);
    } else {
      // Get all tasks
      tasks = includeDeleted ? await tasksStore.getAll() : await tasksStore.getActive();
    }
    
    // Filter out soft-deleted tasks unless explicitly requested
    if (!includeDeleted) {
      tasks = tasks.filter(task => !task.deletedAt);
    }
    
    // Normalize all tasks
    return tasks.map(task => normalizeTask(task));
  } catch (error) {
    throw new TaskOperationError(
      `Failed to retrieve tasks: ${error.message}`,
      'GET_TASKS_ERROR'
    );
  }
}

/**
 * Updates an existing task
 * @param {string} taskId - Task ID to update
 * @param {Object} updates - Partial task data to update
 * @returns {Promise<Object>} Promise resolving to the updated task
 * @throws {TaskValidationError} If validation fails
 * @throws {TaskOperationError} If update fails
 */
export async function updateTask(taskId, updates) {
  try {
    if (!taskId || typeof taskId !== 'string') {
      throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
    }
    
    if (!updates || typeof updates !== 'object') {
      throw new TaskOperationError('Updates must be a valid object', 'INVALID_UPDATES');
    }
    
    // Get existing task
    const existingTask = await getTask(taskId, { includeDeleted: true });
    
    if (!existingTask) {
      throw new TaskOperationError(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND');
    }
    
    // Don't allow updating soft-deleted tasks
    if (existingTask.deletedAt) {
      throw new TaskOperationError(
        `Cannot update soft-deleted task ${taskId}`,
        'TASK_DELETED'
      );
    }
    
    // Merge updates with existing task
    const mergedTask = {
      ...existingTask,
      ...updates,
      id: taskId // Ensure ID cannot be changed
    };
    
    // Validate the merged task (allow partial updates)
    const validation = validateAndSanitizeTask(mergedTask, { allowPartial: true });
    
    if (!validation.isValid) {
      throw new TaskValidationError(
        `Task validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    
    // Normalize the updated task
    const normalizedTask = normalizeTask(validation.task);
    
    // Ensure updatedAt is set to current time
    normalizedTask.updatedAt = new Date().toISOString();
    
    // Handle status change to completed
    if (normalizedTask.status === TASK_STATUSES.COMPLETED && !normalizedTask.completedAt) {
      normalizedTask.completedAt = normalizedTask.updatedAt;
    }
    
    // Handle status change away from completed
    if (normalizedTask.status !== TASK_STATUSES.COMPLETED && normalizedTask.completedAt) {
      normalizedTask.completedAt = null;
    }
    
    // Track status change for automation hooks
    const statusChangedToCompleted = 
      existingTask.status !== TASK_STATUSES.COMPLETED && 
      normalizedTask.status === TASK_STATUSES.COMPLETED;
    
    // Update in IndexedDB
    await tasksStore.update(taskId, normalizedTask);
    
    // Trigger automation hooks
    try {
      await onTaskUpdated(normalizedTask, existingTask);
      
      // If status changed to completed, also trigger completion hook
      if (statusChangedToCompleted) {
        await onTaskCompleted(normalizedTask);
      }
    } catch (error) {
      // Don't fail task update if automation hook fails
      console.error('[Automation] Error in task.updated hook:', error);
    }
    
    return normalizedTask;
  } catch (error) {
    if (error instanceof TaskValidationError || error instanceof TaskOperationError) {
      throw error;
    }
    
    throw new TaskOperationError(
      `Failed to update task: ${error.message}`,
      'UPDATE_ERROR'
    );
  }
}

/**
 * Soft deletes a task (marks as deleted without removing from storage)
 * @param {string} taskId - Task ID to soft delete
 * @returns {Promise<Object>} Promise resolving to the soft-deleted task
 * @throws {TaskOperationError} If soft delete fails
 */
export async function deleteTask(taskId) {
  try {
    if (!taskId || typeof taskId !== 'string') {
      throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
    }
    
    // Get existing task
    const existingTask = await getTask(taskId, { includeDeleted: true });
    
    if (!existingTask) {
      throw new TaskOperationError(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND');
    }
    
    // Check if already soft-deleted
    if (existingTask.deletedAt) {
      return existingTask; // Already deleted, return as-is
    }
    
    // Use the store's softDelete method
    const deletedTask = await tasksStore.softDelete(taskId);
    
    return normalizeTask(deletedTask);
  } catch (error) {
    if (error instanceof TaskOperationError) {
      throw error;
    }
    
    throw new TaskOperationError(
      `Failed to delete task: ${error.message}`,
      'DELETE_ERROR'
    );
  }
}

/**
 * Hard deletes a task (permanently removes from storage)
 * Use with caution - this cannot be undone
 * @param {string} taskId - Task ID to hard delete
 * @returns {Promise<void>}
 * @throws {TaskOperationError} If hard delete fails
 */
export async function hardDeleteTask(taskId) {
  try {
    if (!taskId || typeof taskId !== 'string') {
      throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
    }
    
    // Check if task exists
    const existingTask = await getTask(taskId, { includeDeleted: true });
    
    if (!existingTask) {
      throw new TaskOperationError(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND');
    }
    
    // Permanently delete from IndexedDB
    await tasksStore.delete(taskId);
  } catch (error) {
    if (error instanceof TaskOperationError) {
      throw error;
    }
    
    throw new TaskOperationError(
      `Failed to hard delete task: ${error.message}`,
      'HARD_DELETE_ERROR'
    );
  }
}

/**
 * Restores a soft-deleted task
 * @param {string} taskId - Task ID to restore
 * @returns {Promise<Object>} Promise resolving to the restored task
 * @throws {TaskOperationError} If restore fails
 */
export async function restoreTask(taskId) {
  try {
    if (!taskId || typeof taskId !== 'string') {
      throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
    }
    
    // Get task including deleted ones
    const existingTask = await getTask(taskId, { includeDeleted: true });
    
    if (!existingTask) {
      throw new TaskOperationError(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND');
    }
    
    // Check if task is actually deleted
    if (!existingTask.deletedAt) {
      return existingTask; // Not deleted, return as-is
    }
    
    // Restore by directly updating in store (bypassing updateTask's soft-delete check)
    const restoredTask = await tasksStore.update(taskId, {
      deletedAt: null,
      status: TASK_STATUSES.PENDING,
      updatedAt: new Date().toISOString()
    });
    
    return normalizeTask(restoredTask);
  } catch (error) {
    if (error instanceof TaskOperationError) {
      throw error;
    }
    
    throw new TaskOperationError(
      `Failed to restore task: ${error.message}`,
      'RESTORE_ERROR'
    );
  }
}

/**
 * Adds a dependency to a task
 * @param {string} taskId - Task ID
 * @param {string} dependencyId - Task ID to add as a dependency
 * @param {Object} options - Options
 * @param {boolean} options.includeDeleted - Include soft-deleted tasks in validation (default: false)
 * @returns {Promise<Object>} Promise resolving to the updated task
 * @throws {CircularDependencyError} If adding the dependency would create a cycle
 * @throws {TaskOperationError} If operation fails
 */
export async function addDependency(taskId, dependencyId, options = {}) {
  try {
    // Validate that adding this dependency won't create a circular dependency
    await validateDependencyAddition(taskId, dependencyId, options);

    // Get the current task
    const task = await getTask(taskId, { includeDeleted: options.includeDeleted });
    if (!task) {
      throw new TaskOperationError(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND');
    }

    // Check if dependency already exists
    const dependencies = task.dependencies || [];
    if (dependencies.includes(dependencyId)) {
      return task; // Already a dependency, return as-is
    }

    // Add the dependency
    return await updateTask(taskId, {
      dependencies: [...dependencies, dependencyId]
    });
  } catch (error) {
    if (error instanceof CircularDependencyError || error instanceof TaskOperationError) {
      throw error;
    }

    throw new TaskOperationError(
      `Failed to add dependency: ${error.message}`,
      'ADD_DEPENDENCY_ERROR'
    );
  }
}

/**
 * Removes a dependency from a task
 * @param {string} taskId - Task ID
 * @param {string} dependencyId - Task ID to remove as a dependency
 * @returns {Promise<Object>} Promise resolving to the updated task
 * @throws {TaskOperationError} If operation fails
 */
export async function removeDependency(taskId, dependencyId) {
  try {
    if (!taskId || typeof taskId !== 'string') {
      throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
    }

    if (!dependencyId || typeof dependencyId !== 'string') {
      throw new TaskOperationError('Dependency ID is required and must be a string', 'INVALID_ID');
    }

    // Get the current task
    const task = await getTask(taskId);
    if (!task) {
      throw new TaskOperationError(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND');
    }

    // Check if dependency exists
    const dependencies = task.dependencies || [];
    if (!dependencies.includes(dependencyId)) {
      return task; // Not a dependency, return as-is
    }

    // Remove the dependency
    return await updateTask(taskId, {
      dependencies: dependencies.filter(id => id !== dependencyId)
    });
  } catch (error) {
    if (error instanceof TaskOperationError) {
      throw error;
    }

    throw new TaskOperationError(
      `Failed to remove dependency: ${error.message}`,
      'REMOVE_DEPENDENCY_ERROR'
    );
  }
}

/**
 * Sets a task as a subtask of another task
 * @param {string} subtaskId - Task ID that will become a subtask
 * @param {string} parentId - Task ID that will be the parent
 * @param {Object} options - Options
 * @param {boolean} options.includeDeleted - Include soft-deleted tasks in validation (default: false)
 * @returns {Promise<Object>} Promise resolving to the updated subtask
 * @throws {CircularDependencyError} If setting as subtask would create a cycle
 * @throws {TaskOperationError} If operation fails
 */
export async function addSubtask(subtaskId, parentId, options = {}) {
  try {
    // Validate that setting this as a subtask won't create a circular dependency
    await validateSubtaskCreation(subtaskId, parentId, options);

    // Update the subtask to set its parentId
    return await updateTask(subtaskId, {
      parentId
    });
  } catch (error) {
    if (error instanceof CircularDependencyError || error instanceof TaskOperationError) {
      throw error;
    }

    throw new TaskOperationError(
      `Failed to add subtask: ${error.message}`,
      'ADD_SUBTASK_ERROR'
    );
  }
}

/**
 * Removes a task from being a subtask (makes it a top-level task)
 * @param {string} subtaskId - Task ID to remove from subtask status
 * @returns {Promise<Object>} Promise resolving to the updated task
 * @throws {TaskOperationError} If operation fails
 */
export async function removeSubtask(subtaskId) {
  try {
    if (!subtaskId || typeof subtaskId !== 'string') {
      throw new TaskOperationError('Subtask ID is required and must be a string', 'INVALID_ID');
    }

    // Get the current task
    const task = await getTask(subtaskId);
    if (!task) {
      throw new TaskOperationError(`Task with ID ${subtaskId} not found`, 'TASK_NOT_FOUND');
    }

    // Check if it's already not a subtask
    if (!task.parentId) {
      return task; // Already a top-level task, return as-is
    }

    // Remove the parentId
    return await updateTask(subtaskId, {
      parentId: null
    });
  } catch (error) {
    if (error instanceof TaskOperationError) {
      throw error;
    }

    throw new TaskOperationError(
      `Failed to remove subtask: ${error.message}`,
      'REMOVE_SUBTASK_ERROR'
    );
  }
}

/**
 * Moves a subtask to a different parent
 * @param {string} subtaskId - Task ID to move
 * @param {string} newParentId - New parent task ID (null to make it top-level)
 * @param {Object} options - Options
 * @param {boolean} options.includeDeleted - Include soft-deleted tasks in validation (default: false)
 * @returns {Promise<Object>} Promise resolving to the updated subtask
 * @throws {CircularDependencyError} If moving would create a cycle
 * @throws {TaskOperationError} If operation fails
 */
export async function moveSubtask(subtaskId, newParentId, options = {}) {
  try {
    if (!subtaskId || typeof subtaskId !== 'string') {
      throw new TaskOperationError('Subtask ID is required and must be a string', 'INVALID_ID');
    }

    // If newParentId is null, just remove the subtask status
    if (newParentId === null) {
      return await removeSubtask(subtaskId);
    }

    if (typeof newParentId !== 'string') {
      throw new TaskOperationError('New parent ID must be a string or null', 'INVALID_ID');
    }

    // Validate that moving to the new parent won't create a circular dependency
    await validateSubtaskCreation(subtaskId, newParentId, options);

    // Update the subtask to set its new parentId
    return await updateTask(subtaskId, {
      parentId: newParentId
    });
  } catch (error) {
    if (error instanceof CircularDependencyError || error instanceof TaskOperationError) {
      throw error;
    }

    throw new TaskOperationError(
      `Failed to move subtask: ${error.message}`,
      'MOVE_SUBTASK_ERROR'
    );
  }
}

/**
 * Starts time tracking for a task
 * @param {string} taskId - Task ID to start tracking for
 * @returns {Promise<Object>} Promise resolving to the task with updated status
 * @throws {TaskOperationError} If task not found or timer cannot be started
 */
export async function startTimeTracking(taskId) {
  try {
    if (!taskId || typeof taskId !== 'string') {
      throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
    }

    // Get the task to ensure it exists
    const task = await getTask(taskId);
    if (!task) {
      throw new TaskOperationError(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND');
    }

    // Check if task is soft-deleted
    if (task.deletedAt) {
      throw new TaskOperationError('Cannot start timer for a deleted task', 'TASK_DELETED');
    }

    // Stop any existing timer (if switching tasks)
    const stoppedTimer = stopAnyTimer();

    // Start timer for this task
    startTimer(taskId);

    // Update task status to in-progress if it's pending
    if (task.status === TASK_STATUSES.PENDING) {
      return await updateTask(taskId, {
        status: TASK_STATUSES.IN_PROGRESS
      });
    }

    return task;
  } catch (error) {
    if (error instanceof TaskOperationError) {
      throw error;
    }

    // Handle timer errors
    if (error.message.includes('Timer is already active')) {
      throw new TaskOperationError(
        error.message,
        'TIMER_ALREADY_ACTIVE'
      );
    }

    throw new TaskOperationError(
      `Failed to start time tracking: ${error.message}`,
      'START_TIMER_ERROR'
    );
  }
}

/**
 * Stops time tracking for a task and updates timeSpent
 * @param {string} taskId - Task ID to stop tracking for
 * @returns {Promise<Object>} Promise resolving to the updated task
 * @throws {TaskOperationError} If task not found or timer cannot be stopped
 */
export async function stopTimeTracking(taskId) {
  try {
    if (!taskId || typeof taskId !== 'string') {
      throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
    }

    // Get the task to ensure it exists
    const task = await getTask(taskId);
    if (!task) {
      throw new TaskOperationError(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND');
    }

    // Stop the timer and get elapsed time
    const timerResult = stopTimer(taskId);
    const elapsedMinutes = timerResult.elapsedMinutes;

    // Update task with accumulated time
    const newTimeSpent = (task.timeSpent || 0) + elapsedMinutes;

    return await updateTask(taskId, {
      timeSpent: newTimeSpent
    });
  } catch (error) {
    if (error instanceof TaskOperationError) {
      throw error;
    }

    // Handle timer errors
    if (error.message.includes('No timer is currently active')) {
      throw new TaskOperationError(
        'No timer is currently active for this task',
        'NO_ACTIVE_TIMER'
      );
    }

    if (error.message.includes('Timer is active for task')) {
      throw new TaskOperationError(
        error.message,
        'WRONG_TASK_TIMER'
      );
    }

    throw new TaskOperationError(
      `Failed to stop time tracking: ${error.message}`,
      'STOP_TIMER_ERROR'
    );
  }
}

/**
 * Adds manual time entry to a task
 * @param {string} taskId - Task ID to add time to
 * @param {number} minutes - Minutes to add (must be positive)
 * @returns {Promise<Object>} Promise resolving to the updated task
 * @throws {TaskOperationError} If validation fails or task not found
 */
export async function addManualTimeEntry(taskId, minutes) {
  try {
    if (!taskId || typeof taskId !== 'string') {
      throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
    }

    // Validate manual time entry
    const validation = validateManualTimeEntry(minutes);
    if (!validation.isValid) {
      throw new TaskOperationError(
        validation.error,
        'INVALID_TIME_ENTRY'
      );
    }

    // Get the task to ensure it exists
    const task = await getTask(taskId);
    if (!task) {
      throw new TaskOperationError(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND');
    }

    // Check if task is soft-deleted
    if (task.deletedAt) {
      throw new TaskOperationError('Cannot add time entry for a deleted task', 'TASK_DELETED');
    }

    // Round minutes to nearest integer (validation requires integer)
    const roundedMinutes = Math.round(minutes);
    
    // Update task with accumulated time
    const newTimeSpent = (task.timeSpent || 0) + roundedMinutes;

    return await updateTask(taskId, {
      timeSpent: newTimeSpent
    });
  } catch (error) {
    if (error instanceof TaskOperationError) {
      throw error;
    }

    throw new TaskOperationError(
      `Failed to add manual time entry: ${error.message}`,
      'ADD_TIME_ENTRY_ERROR'
    );
  }
}

// Export createTask as named export for convenience
export { createTaskOperation as createTask };

export default {
  createTask: createTaskOperation,
  getTask,
  getTasks,
  updateTask,
  deleteTask,
  hardDeleteTask,
  restoreTask,
  addDependency,
  removeDependency,
  addSubtask,
  removeSubtask,
  moveSubtask,
  startTimeTracking,
  stopTimeTracking,
  addManualTimeEntry,
  TaskOperationError
};

