/**
 * Task Lifecycle Hooks
 * 
 * Provides hooks for task lifecycle events (created, completed, updated)
 * to trigger automation rules.
 */

import { getTriggerManager } from './triggerManager.js';
import { TRIGGER_TYPES } from '../models/AutomationRule.js';

/**
 * Hook into task creation
 * @param {Object} task - Created task object
 */
export async function onTaskCreated(task) {
  const triggerManager = getTriggerManager();
  await triggerManager.emitTaskEvent(TRIGGER_TYPES.TASK_CREATED, task);
}

/**
 * Hook into task completion
 * @param {Object} task - Completed task object
 */
export async function onTaskCompleted(task) {
  const triggerManager = getTriggerManager();
  await triggerManager.emitTaskEvent(TRIGGER_TYPES.TASK_COMPLETED, task);
}

/**
 * Hook into task update
 * @param {Object} task - Updated task object
 * @param {Object} previousTask - Previous task state (optional)
 */
export async function onTaskUpdated(task, previousTask = null) {
  const triggerManager = getTriggerManager();
  // Emit with task as the main object, previousTask in context
  await triggerManager.getEventEmitter().emit(TRIGGER_TYPES.TASK_UPDATED, {
    task,
    previousTask,
    triggerType: TRIGGER_TYPES.TASK_UPDATED
  });
}

export default {
  onTaskCreated,
  onTaskCompleted,
  onTaskUpdated
};
