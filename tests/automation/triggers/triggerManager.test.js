/**
 * Tests for Automation Trigger Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTriggerManager } from '../../../src/automation/triggers/triggerManager.js';
import { TRIGGER_TYPES, createAutomationRule } from '../../../src/automation/models/AutomationRule.js';

describe('TriggerManager', () => {
  let triggerManager;

  beforeEach(() => {
    triggerManager = getTriggerManager();
    triggerManager.initialize();
  });

  afterEach(() => {
    triggerManager.cleanup();
  });

  describe('Event Emitter', () => {
    it('should emit and receive events', async () => {
      const callback = vi.fn();
      const unsubscribe = triggerManager.getEventEmitter().on('test.event', callback);

      await triggerManager.getEventEmitter().emit('test.event', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
      unsubscribe();
    });

    it('should handle multiple listeners for same event', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      triggerManager.getEventEmitter().on('test.event', callback1);
      triggerManager.getEventEmitter().on('test.event', callback2);

      await triggerManager.getEventEmitter().emit('test.event', { data: 'test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should allow unsubscribing from events', async () => {
      const callback = vi.fn();
      const unsubscribe = triggerManager.getEventEmitter().on('test.event', callback);

      unsubscribe();
      await triggerManager.getEventEmitter().emit('test.event', { data: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle errors in callbacks gracefully', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = vi.fn();

      triggerManager.getEventEmitter().on('test.event', errorCallback);
      triggerManager.getEventEmitter().on('test.event', normalCallback);

      // Should not throw
      await expect(
        triggerManager.getEventEmitter().emit('test.event', { data: 'test' })
      ).resolves.not.toThrow();

      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('Task Lifecycle Events', () => {
    it('should emit task.created event', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_CREATED, callback);

      const task = { id: 'task-1', title: 'Test Task' };
      await triggerManager.emitTaskEvent(TRIGGER_TYPES.TASK_CREATED, task);

      expect(callback).toHaveBeenCalledWith({
        task,
        triggerType: TRIGGER_TYPES.TASK_CREATED
      });
    });

    it('should emit task.completed event', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_COMPLETED, callback);

      const task = { id: 'task-1', title: 'Test Task', status: 'completed' };
      await triggerManager.emitTaskEvent(TRIGGER_TYPES.TASK_COMPLETED, task);

      expect(callback).toHaveBeenCalledWith({
        task,
        triggerType: TRIGGER_TYPES.TASK_COMPLETED
      });
    });

    it('should emit task.updated event', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on(TRIGGER_TYPES.TASK_UPDATED, callback);

      const task = { id: 'task-1', title: 'Updated Task' };
      await triggerManager.emitTaskEvent(TRIGGER_TYPES.TASK_UPDATED, task);

      expect(callback).toHaveBeenCalledWith({
        task,
        triggerType: TRIGGER_TYPES.TASK_UPDATED
      });
    });
  });

  describe('Time-based Triggers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should register daily time-based trigger', () => {
      const rule = createAutomationRule({
        id: 'rule-1',
        trigger: {
          type: TRIGGER_TYPES.TIME_BASED,
          config: {
            schedule: {
              type: 'daily',
              time: '10:00'
            }
          }
        }
      });

      expect(() => triggerManager.registerRule(rule)).not.toThrow();
      expect(triggerManager.timeBasedTriggers.has(rule.id)).toBe(true);
    });

    it('should register weekly time-based trigger', () => {
      const rule = createAutomationRule({
        id: 'rule-2',
        trigger: {
          type: TRIGGER_TYPES.TIME_BASED,
          config: {
            schedule: {
              type: 'weekly',
              time: '09:00'
            }
          }
        }
      });

      expect(() => triggerManager.registerRule(rule)).not.toThrow();
      expect(triggerManager.timeBasedTriggers.has(rule.id)).toBe(true);
    });

    it('should register custom schedule trigger', () => {
      const rule = createAutomationRule({
        id: 'rule-3',
        trigger: {
          type: TRIGGER_TYPES.SCHEDULE_BASED,
          config: {
            schedule: {
              type: 'custom',
              expression: '0 0 * * *'
            }
          }
        }
      });

      expect(() => triggerManager.registerRule(rule)).not.toThrow();
      expect(triggerManager.timeBasedTriggers.has(rule.id)).toBe(true);
    });

    it('should not register disabled rules', () => {
      const rule = createAutomationRule({
        id: 'rule-4',
        enabled: false,
        trigger: {
          type: TRIGGER_TYPES.TIME_BASED,
          config: {
            schedule: {
              type: 'daily',
              time: '10:00'
            }
          }
        }
      });

      triggerManager.registerRule(rule);
      expect(triggerManager.timeBasedTriggers.has(rule.id)).toBe(false);
    });

    it('should unregister time-based triggers', () => {
      const rule = createAutomationRule({
        id: 'rule-5',
        trigger: {
          type: TRIGGER_TYPES.TIME_BASED,
          config: {
            schedule: {
              type: 'daily',
              time: '10:00'
            }
          }
        }
      });

      triggerManager.registerRule(rule);
      expect(triggerManager.timeBasedTriggers.has(rule.id)).toBe(true);

      triggerManager.unregisterRule(rule.id);
      expect(triggerManager.timeBasedTriggers.has(rule.id)).toBe(false);
    });
  });

  describe('Rule Execution', () => {
    it('should execute rule with context', async () => {
      const ruleEvaluator = vi.fn().mockResolvedValue({ triggered: true });
      triggerManager.setRuleEvaluator(ruleEvaluator);

      const rule = createAutomationRule({
        id: 'rule-1',
        actions: [{ type: 'send.notification', params: { message: 'Test' } }]
      });

      await triggerManager.executeRule(rule, { task: { id: 'task-1' } });

      expect(ruleEvaluator).toHaveBeenCalledWith(
        rule,
        expect.objectContaining({
          task: { id: 'task-1' },
          taskId: 'task-1'
        })
      );
    });

    it('should not execute disabled rules', async () => {
      const ruleEvaluator = vi.fn();
      triggerManager.setRuleEvaluator(ruleEvaluator);

      const rule = createAutomationRule({
        id: 'rule-1',
        enabled: false
      });

      await triggerManager.executeRule(rule);

      expect(ruleEvaluator).not.toHaveBeenCalled();
    });

    it('should handle rule evaluation errors gracefully', async () => {
      const ruleEvaluator = vi.fn().mockRejectedValue(new Error('Evaluation error'));
      triggerManager.setRuleEvaluator(ruleEvaluator);

      const rule = createAutomationRule({
        id: 'rule-1'
      });

      await expect(triggerManager.executeRule(rule)).resolves.not.toThrow();
    });
  });

  describe('Facts Building', () => {
    it('should build facts from task context', () => {
      const context = {
        task: {
          id: 'task-1',
          status: 'in-progress',
          priority: 'high'
        }
      };

      const facts = triggerManager.buildFactsFromContext(context);

      expect(facts).toMatchObject({
        task: context.task,
        taskId: 'task-1',
        taskStatus: 'in-progress',
        taskPriority: 'high',
        timestamp: expect.any(String)
      });
    });

    it('should build facts from exercise context', () => {
      const context = {
        exercise: {
          id: 'exercise-1',
          type: 'running'
        }
      };

      const facts = triggerManager.buildFactsFromContext(context);

      expect(facts).toMatchObject({
        exercise: context.exercise,
        timestamp: expect.any(String)
      });
    });

    it('should build facts from journal context', () => {
      const context = {
        journalEntry: {
          id: 'entry-1',
          content: 'Test entry'
        }
      };

      const facts = triggerManager.buildFactsFromContext(context);

      expect(facts).toMatchObject({
        journalEntry: context.journalEntry,
        timestamp: expect.any(String)
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all triggers and listeners', () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on('test.event', callback);

      const rule = createAutomationRule({
        id: 'rule-1',
        trigger: {
          type: TRIGGER_TYPES.TIME_BASED,
          config: {
            schedule: {
              type: 'daily',
              time: '10:00'
            }
          }
        }
      });

      triggerManager.registerRule(rule);

      triggerManager.cleanup();

      expect(triggerManager.timeBasedTriggers.size).toBe(0);
      // Event listeners should be cleared
      triggerManager.getEventEmitter().emit('test.event', {});
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
