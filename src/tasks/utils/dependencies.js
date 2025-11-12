/**
 * Dependency Management Utilities
 * 
 * Provides functions for managing task dependencies and detecting circular dependencies.
 */

import { getTask, getTasks, TaskOperationError } from '../crud/index.js';

/**
 * Custom error for circular dependency detection
 */
export class CircularDependencyError extends Error {
  constructor(message, cycle = []) {
    super(message);
    this.name = 'CircularDependencyError';
    this.cycle = cycle;
  }
}

/**
 * Detects circular dependencies in the dependency chain
 * Uses depth-first search to find cycles
 * @param {string} taskId - Task ID to check
 * @param {Object} taskMap - Map of taskId -> task (for efficient lookup)
 * @param {Set<string>} visited - Set of visited task IDs (for optimization)
 * @param {Set<string>} recursionStack - Set of tasks in current recursion path
 * @param {Array<string>} path - Current path being explored
 * @returns {Array<string>|null} Cycle path if found, null otherwise
 */
function detectCycle(taskId, taskMap, visited = new Set(), recursionStack = new Set(), path = []) {
  // If the task is in the recursion stack, we've found a cycle
  if (recursionStack.has(taskId)) {
    // Find the start of the cycle in the path
    const cycleStart = path.indexOf(taskId);
    return [...path.slice(cycleStart), taskId];
  }

  // If we've already fully visited this node (not in recursion stack),
  // we've already checked its dependencies and found no cycles
  if (visited.has(taskId)) {
    return null;
  }

  // Mark as visited and add to recursion stack
  visited.add(taskId);
  recursionStack.add(taskId);
  path.push(taskId);

  const task = taskMap.get(taskId);
  if (!task) {
    // Task doesn't exist, remove from stack and return
    recursionStack.delete(taskId);
    path.pop();
    return null;
  }

  // Check all dependencies
  const dependencies = task.dependencies || [];
  for (const depId of dependencies) {
    const cycle = detectCycle(depId, taskMap, visited, recursionStack, path);
    if (cycle) {
      return cycle;
    }
  }

  // Remove from recursion stack (backtrack)
  recursionStack.delete(taskId);
  path.pop();
  return null;
}

/**
 * Validates that adding a dependency won't create a circular dependency
 * @param {string} taskId - Task ID that will have the dependency
 * @param {string} dependencyId - Task ID to add as a dependency
 * @param {Object} options - Options
 * @param {boolean} options.includeDeleted - Include soft-deleted tasks in validation (default: false)
 * @returns {Promise<void>}
 * @throws {CircularDependencyError} If adding the dependency would create a cycle
 * @throws {TaskOperationError} If task or dependency doesn't exist
 */
export async function validateDependencyAddition(taskId, dependencyId, options = {}) {
  const { includeDeleted = false } = options;

  // Validate inputs
  if (!taskId || typeof taskId !== 'string') {
    throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
  }

  if (!dependencyId || typeof dependencyId !== 'string') {
    throw new TaskOperationError('Dependency ID is required and must be a string', 'INVALID_ID');
  }

  // Can't depend on itself
  if (taskId === dependencyId) {
    throw new CircularDependencyError(
      'A task cannot depend on itself',
      [taskId]
    );
  }

  // Get both tasks
  const task = await getTask(taskId, { includeDeleted });
  const dependency = await getTask(dependencyId, { includeDeleted });

  if (!task) {
    throw new TaskOperationError(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND');
  }

  if (!dependency) {
    throw new TaskOperationError(`Dependency task with ID ${dependencyId} not found`, 'TASK_NOT_FOUND');
  }

  // Check if dependency already exists
  if (task.dependencies && task.dependencies.includes(dependencyId)) {
    // Already a dependency, no cycle check needed
    return;
  }

  // Build a map of all tasks for efficient lookup
  const allTasks = await getTasks({ includeDeleted });
  const taskMap = new Map();
  allTasks.forEach(t => taskMap.set(t.id, t));

  // Create a temporary dependency to test for cycles
  // Simulate adding the dependency
  const testTask = {
    ...task,
    dependencies: [...(task.dependencies || []), dependencyId]
  };
  taskMap.set(taskId, testTask);

  // Check for cycles starting from taskId
  // If adding this dependency creates a path back to taskId, we have a cycle
  const cycle = detectCycle(taskId, taskMap);

  if (cycle) {
    throw new CircularDependencyError(
      `Adding this dependency would create a circular dependency: ${cycle.join(' -> ')}`,
      cycle
    );
  }
}

/**
 * Validates that setting a task as a subtask won't create a circular dependency
 * A subtask cannot have its parent (or any ancestor) as a dependency
 * @param {string} subtaskId - Task ID that will become a subtask
 * @param {string} parentId - Task ID that will be the parent
 * @param {Object} options - Options
 * @param {boolean} options.includeDeleted - Include soft-deleted tasks in validation (default: false)
 * @returns {Promise<void>}
 * @throws {CircularDependencyError} If setting as subtask would create a cycle
 * @throws {TaskOperationError} If task or parent doesn't exist
 */
export async function validateSubtaskCreation(subtaskId, parentId, options = {}) {
  const { includeDeleted = false } = options;

  // Validate inputs
  if (!subtaskId || typeof subtaskId !== 'string') {
    throw new TaskOperationError('Subtask ID is required and must be a string', 'INVALID_ID');
  }

  if (!parentId || typeof parentId !== 'string') {
    throw new TaskOperationError('Parent ID is required and must be a string', 'INVALID_ID');
  }

  // Can't be a subtask of itself
  if (subtaskId === parentId) {
    throw new CircularDependencyError(
      'A task cannot be a subtask of itself',
      [subtaskId]
    );
  }

  // Get both tasks
  const subtask = await getTask(subtaskId, { includeDeleted });
  const parent = await getTask(parentId, { includeDeleted });

  if (!subtask) {
    throw new TaskOperationError(`Subtask with ID ${subtaskId} not found`, 'TASK_NOT_FOUND');
  }

  if (!parent) {
    throw new TaskOperationError(`Parent task with ID ${parentId} not found`, 'TASK_NOT_FOUND');
  }

  // Check if parent is already a dependency of the subtask
  // This would create a cycle: subtask depends on parent, but parent contains subtask
  if (subtask.dependencies && subtask.dependencies.includes(parentId)) {
    throw new CircularDependencyError(
      `Cannot set task ${subtaskId} as a subtask of ${parentId} because ${parentId} is already a dependency of ${subtaskId}`,
      [subtaskId, parentId]
    );
  }

  // Check if any ancestor of the parent is a dependency of the subtask
  // Build ancestor chain
  const ancestors = new Set([parentId]);
  let currentAncestor = parent;
  while (currentAncestor.parentId) {
    ancestors.add(currentAncestor.parentId);
    currentAncestor = await getTask(currentAncestor.parentId, { includeDeleted });
    if (!currentAncestor) break;
  }

  // Check if any ancestor is in the subtask's dependencies
  const subtaskDeps = subtask.dependencies || [];
  for (const ancestorId of ancestors) {
    if (subtaskDeps.includes(ancestorId)) {
      throw new CircularDependencyError(
        `Cannot set task ${subtaskId} as a subtask of ${parentId} because ancestor ${ancestorId} is already a dependency of ${subtaskId}`,
        [subtaskId, ancestorId, parentId]
      );
    }
  }

  // Check if the parent (or any ancestor) depends on the subtask
  // This would create a cycle: parent depends on subtask, but subtask is contained in parent
  for (const ancestorId of ancestors) {
    const ancestor = await getTask(ancestorId, { includeDeleted });
    if (ancestor && ancestor.dependencies && ancestor.dependencies.includes(subtaskId)) {
      throw new CircularDependencyError(
        `Cannot set task ${subtaskId} as a subtask of ${parentId} because ancestor ${ancestorId} depends on ${subtaskId}`,
        [subtaskId, ancestorId, parentId]
      );
    }
  }
}

/**
 * Gets all dependencies of a task (transitive closure)
 * @param {string} taskId - Task ID
 * @param {Object} options - Options
 * @param {boolean} options.includeDeleted - Include soft-deleted tasks (default: false)
 * @returns {Promise<Array<Object>>} Promise resolving to array of dependency tasks
 */
export async function getAllDependencies(taskId, options = {}) {
  const { includeDeleted = false } = options;

  if (!taskId || typeof taskId !== 'string') {
    throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
  }

  const task = await getTask(taskId, { includeDeleted });
  if (!task) {
    throw new TaskOperationError(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND');
  }

  const dependencies = new Set();
  const visited = new Set();

  async function collectDependencies(currentTaskId) {
    if (visited.has(currentTaskId)) {
      return;
    }

    visited.add(currentTaskId);
    const currentTask = await getTask(currentTaskId, { includeDeleted });
    if (!currentTask) {
      return;
    }

    const deps = currentTask.dependencies || [];
    for (const depId of deps) {
      dependencies.add(depId);
      await collectDependencies(depId);
    }
  }

  await collectDependencies(taskId);

  // Fetch all dependency tasks
  const dependencyTasks = [];
  for (const depId of dependencies) {
    const depTask = await getTask(depId, { includeDeleted });
    if (depTask) {
      dependencyTasks.push(depTask);
    }
  }

  return dependencyTasks;
}

/**
 * Gets all tasks that depend on a given task
 * @param {string} taskId - Task ID
 * @param {Object} options - Options
 * @param {boolean} options.includeDeleted - Include soft-deleted tasks (default: false)
 * @returns {Promise<Array<Object>>} Promise resolving to array of tasks that depend on this task
 */
export async function getDependents(taskId, options = {}) {
  const { includeDeleted = false } = options;

  if (!taskId || typeof taskId !== 'string') {
    throw new TaskOperationError('Task ID is required and must be a string', 'INVALID_ID');
  }

  const allTasks = await getTasks({ includeDeleted });
  return allTasks.filter(task => 
    task.dependencies && task.dependencies.includes(taskId)
  );
}

export default {
  validateDependencyAddition,
  validateSubtaskCreation,
  getAllDependencies,
  getDependents,
  CircularDependencyError
};

