/**
 * Tests for Event Hooks (Exercise and Journal)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  onExerciseLogCreated,
  onExerciseGoalAchieved,
  onJournalEntryCreated,
  onJournalEntryUpdated,
  emitCustomEvent
} from '../../../src/automation/triggers/eventHooks.js';
import { getTriggerManager } from '../../../src/automation/triggers/triggerManager.js';
import { TRIGGER_TYPES } from '../../../src/automation/models/AutomationRule.js';

describe('Event Hooks', () => {
  let triggerManager;

  beforeEach(() => {
    triggerManager = getTriggerManager();
    triggerManager.initialize();
  });

  afterEach(() => {
    triggerManager.cleanup();
  });

  describe('Exercise Events', () => {
    it('should emit exercise.log.created event', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on('exercise.log.created', callback);

      const exerciseLog = {
        id: 'log-1',
        exerciseId: 'exercise-1',
        value: 10,
        unit: 'reps'
      };

      await onExerciseLogCreated(exerciseLog);

      expect(callback).toHaveBeenCalledWith({
        exerciseLog,
        triggerType: TRIGGER_TYPES.EVENT_BASED
      });
    });

    it('should emit exercise.goal.achieved event', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on('exercise.goal.achieved', callback);

      const goal = {
        id: 'goal-1',
        exerciseId: 'exercise-1',
        targetValue: 100
      };

      const progress = {
        currentValue: 100,
        percentage: 100
      };

      await onExerciseGoalAchieved(goal, progress);

      expect(callback).toHaveBeenCalledWith({
        goal,
        progress,
        triggerType: TRIGGER_TYPES.EVENT_BASED
      });
    });
  });

  describe('Journal Events', () => {
    it('should emit journal.entry.created event', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on('journal.entry.created', callback);

      const journalEntry = {
        id: 'entry-1',
        content: 'Test entry',
        date: '2024-01-01'
      };

      await onJournalEntryCreated(journalEntry);

      expect(callback).toHaveBeenCalledWith({
        journalEntry,
        triggerType: TRIGGER_TYPES.EVENT_BASED
      });
    });

    it('should emit journal.entry.updated event', async () => {
      const callback = vi.fn();
      triggerManager.getEventEmitter().on('journal.entry.updated', callback);

      const journalEntry = {
        id: 'entry-1',
        content: 'Updated entry',
        date: '2024-01-01'
      };

      await onJournalEntryUpdated(journalEntry);

      expect(callback).toHaveBeenCalledWith({
        journalEntry,
        triggerType: TRIGGER_TYPES.EVENT_BASED
      });
    });
  });

  describe('Custom Events', () => {
    it('should emit custom event', async () => {
      const callback = vi.fn();
      const eventType = 'custom.test.event';
      triggerManager.getEventEmitter().on(eventType, callback);

      const data = {
        customField: 'customValue',
        number: 42
      };

      await emitCustomEvent(eventType, data);

      expect(callback).toHaveBeenCalledWith({
        ...data,
        triggerType: TRIGGER_TYPES.EVENT_BASED
      });
    });
  });
});
