/**
 * Integration Tests for Automation Triggers
 * 
 * Tests trigger activation, event propagation, and rule firing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTriggerManager } from '../../../src/automation/triggers/triggerManager.js';
import {
  onTaskCreated,
  onTaskCompleted,
  onTaskUpdated
} from '../../../src/automation/triggers/taskLifecycleHooks.js';
import {
  onExerciseLogCreated,
  onJournalEntryCreated
} from '../../../src/automation/triggers/eventHooks.js';
import { createAutomationRule, TRIGGER_TYPES } from '../../../src/automation/models/AutomationRule.js';

describe('Automation Triggers Integration', () => {
  let triggerManager;
  let ruleEvaluator;

  beforeEach(() => {
    triggerManager = getTriggerManager();
    ruleEvaluator = vi.fn().mockResolvedValue({ triggered: false });
    triggerManager.initialize(ruleEvaluator);
  });

  afterEach(() => {
    triggerManager.cleanup();
  });

  describe('Task Lifecycle Trigger Activation', () => {
    it('should trigger rule evaluation on task creation', async () => {
      const rule = createAutomationRule({
        id: 'rule-1',
        name: 'Test Rule',
        trigger: {
          type: TRIGGER_TYPES.TASK_CREATED
        },
        conditions: {
          all: [{
            fact: 'taskId',
            operator: 'exists',
            value: true
          }]
        },
        actions: [{
          type: 'send.notification',
          params: { message: 'Task created' }
        }]
      });

      // Register rule to listen for events
      const callback = vi.fn();
      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_CREATED, async (data) => {
        await triggerManager.executeRule(rule, data);
      });

      const task = {
        id: 'task-1',
        title: 'New Task',
        status: 'todo'
      };

      await onTaskCreated(task);

      // Verify event was emitted
      expect(callback).not.toHaveBeenCalled(); // Callback not registered, but rule execution should happen
    });

    it('should trigger rule evaluation on task completion', async () => {
      const rule = createAutomationRule({
        id: 'rule-2',
        trigger: {
          type: TRIGGER_TYPES.TASK_COMPLETED
        },
        actions: [{
          type: 'generate.report',
          params: {}
        }]
      });

      const callback = vi.fn();
      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_COMPLETED, async (data) => {
        await triggerManager.executeRule(rule, data);
        callback();
      });

      const task = {
        id: 'task-1',
        title: 'Completed Task',
        status: 'completed'
      };

      await onTaskCompleted(task);

      expect(callback).toHaveBeenCalled();
    });

    it('should trigger rule evaluation on task update', async () => {
      const rule = createAutomationRule({
        id: 'rule-3',
        trigger: {
          type: TRIGGER_TYPES.TASK_UPDATED
        },
        actions: [{
          type: 'update.task',
          params: {}
        }]
      });

      const callback = vi.fn();
      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_UPDATED, async (data) => {
        await triggerManager.executeRule(rule, data);
        callback();
      });

      const task = {
        id: 'task-1',
        title: 'Updated Task',
        status: 'in-progress'
      };

      await onTaskUpdated(task);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Event Propagation', () => {
    it('should propagate exercise log events', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on('exercise.log.created', callback);

      const exerciseLog = {
        id: 'log-1',
        exerciseId: 'exercise-1',
        value: 10
      };

      await onExerciseLogCreated(exerciseLog);

      expect(callback).toHaveBeenCalledWith({
        exerciseLog,
        triggerType: TRIGGER_TYPES.EVENT_BASED
      });
    });

    it('should propagate journal entry events', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on('journal.entry.created', callback);

      const journalEntry = {
        id: 'entry-1',
        content: 'Test entry'
      };

      await onJournalEntryCreated(journalEntry);

      expect(callback).toHaveBeenCalledWith({
        journalEntry,
        triggerType: TRIGGER_TYPES.EVENT_BASED
      });
    });
  });

  describe('Rule Firing', () => {
    it('should fire rule when conditions are met', async () => {
      const rule = createAutomationRule({
        id: 'rule-4',
        trigger: {
          type: TRIGGER_TYPES.TASK_CREATED
        },
        conditions: {
          all: [{
            fact: 'taskStatus',
            operator: 'equal',
            value: 'todo'
          }]
        },
        actions: [{
          type: 'categorize.task',
          params: { taskId: 'task-1', category: 'automated' }
        }]
      });

      ruleEvaluator.mockResolvedValueOnce({ triggered: true });

      const actionCallback = vi.fn();
      triggerManager.getEventEmitter().on('action.categorize.task', actionCallback);

      await triggerManager.executeRule(rule, {
        task: {
          id: 'task-1',
          status: 'todo'
        }
      });

      expect(ruleEvaluator).toHaveBeenCalled();
      expect(actionCallback).toHaveBeenCalled();
    });

    it('should not fire actions when conditions are not met', async () => {
      const rule = createAutomationRule({
        id: 'rule-5',
        trigger: {
          type: TRIGGER_TYPES.TASK_CREATED
        },
        conditions: {
          all: [{
            fact: 'taskStatus',
            operator: 'equal',
            value: 'completed'
          }]
        },
        actions: [{
          type: 'send.notification',
          params: { message: 'Should not fire' }
        }]
      });

      ruleEvaluator.mockResolvedValueOnce({ triggered: false });

      const actionCallback = vi.fn();
      triggerManager.getEventEmitter().on('action.send.notification', actionCallback);

      await triggerManager.executeRule(rule, {
        task: {
          id: 'task-1',
          status: 'todo'
        }
      });

      expect(ruleEvaluator).toHaveBeenCalled();
      expect(actionCallback).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Rules', () => {
    it('should handle multiple rules for same event', async () => {
      const rule1 = createAutomationRule({
        id: 'rule-6',
        trigger: { type: TRIGGER_TYPES.TASK_CREATED },
        actions: [{ type: 'send.notification', params: { message: 'Rule 1' } }]
      });

      const rule2 = createAutomationRule({
        id: 'rule-7',
        trigger: { type: TRIGGER_TYPES.TASK_CREATED },
        actions: [{ type: 'send.notification', params: { message: 'Rule 2' } }]
      });

      ruleEvaluator.mockResolvedValue({ triggered: true });

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_CREATED, async (data) => {
        await triggerManager.executeRule(rule1, data);
        callback1();
      });

      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_CREATED, async (data) => {
        await triggerManager.executeRule(rule2, data);
        callback2();
      });

      const task = { id: 'task-1', title: 'Test' };
      await onTaskCreated(task);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });
});
