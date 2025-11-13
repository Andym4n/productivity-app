/**
 * Tests for Task Lifecycle Hooks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  onTaskCreated,
  onTaskCompleted,
  onTaskUpdated
} from '../../../src/automation/triggers/taskLifecycleHooks.js';
import { getTriggerManager } from '../../../src/automation/triggers/triggerManager.js';
import { TRIGGER_TYPES } from '../../../src/automation/models/AutomationRule.js';

describe('Task Lifecycle Hooks', () => {
  let triggerManager;

  beforeEach(() => {
    triggerManager = getTriggerManager();
    triggerManager.initialize();
  });

  afterEach(() => {
    triggerManager.cleanup();
  });

  describe('onTaskCreated', () => {
    it('should emit task.created event', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_CREATED, callback);

      const task = {
        id: 'task-1',
        title: 'New Task',
        status: 'todo'
      };

      await onTaskCreated(task);

      expect(callback).toHaveBeenCalledWith({
        task,
        triggerType: TRIGGER_TYPES.TASK_CREATED
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock emitTaskEvent to throw
      const originalEmit = triggerManager.emitTaskEvent;
      triggerManager.emitTaskEvent = vi.fn().mockRejectedValue(new Error('Test error'));

      const task = { id: 'task-1', title: 'Test' };

      // Should not throw
      await expect(onTaskCreated(task)).resolves.not.toThrow();

      triggerManager.emitTaskEvent = originalEmit;
    });
  });

  describe('onTaskCompleted', () => {
    it('should emit task.completed event', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_COMPLETED, callback);

      const task = {
        id: 'task-1',
        title: 'Completed Task',
        status: 'completed'
      };

      await onTaskCompleted(task);

      expect(callback).toHaveBeenCalledWith({
        task,
        triggerType: TRIGGER_TYPES.TASK_COMPLETED
      });
    });
  });

  describe('onTaskUpdated', () => {
    it('should emit task.updated event with task and previous task', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_UPDATED, callback);

      const previousTask = {
        id: 'task-1',
        title: 'Old Title',
        status: 'todo'
      };

      const updatedTask = {
        id: 'task-1',
        title: 'New Title',
        status: 'in-progress'
      };

      await onTaskUpdated(updatedTask, previousTask);

      expect(callback).toHaveBeenCalledWith({
        task: updatedTask,
        previousTask,
        triggerType: TRIGGER_TYPES.TASK_UPDATED
      });
    });

    it('should emit task.updated event without previous task', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_UPDATED, callback);

      const updatedTask = {
        id: 'task-1',
        title: 'Updated Task',
        status: 'in-progress'
      };

      await onTaskUpdated(updatedTask);

      expect(callback).toHaveBeenCalledWith({
        task: updatedTask,
        previousTask: null,
        triggerType: TRIGGER_TYPES.TASK_UPDATED
      });
    });
  });
});
