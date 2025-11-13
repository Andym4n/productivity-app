/**
 * Event Hooks for Exercise and Journal Modules
 * 
 * Provides event hooks for exercise and journal module events
 * to trigger automation rules.
 */

import { getTriggerManager } from './triggerManager.js';
import { TRIGGER_TYPES } from '../models/AutomationRule.js';

/**
 * Hook into exercise log creation
 * @param {Object} exerciseLog - Exercise log object
 */
export async function onExerciseLogCreated(exerciseLog) {
  const triggerManager = getTriggerManager();
  await triggerManager.emitEvent('exercise.log.created', {
    exerciseLog,
    triggerType: TRIGGER_TYPES.EVENT_BASED
  });
}

/**
 * Hook into exercise goal achievement
 * @param {Object} goal - Exercise goal object
 * @param {Object} progress - Progress data
 */
export async function onExerciseGoalAchieved(goal, progress) {
  const triggerManager = getTriggerManager();
  await triggerManager.emitEvent('exercise.goal.achieved', {
    goal,
    progress,
    triggerType: TRIGGER_TYPES.EVENT_BASED
  });
}

/**
 * Hook into journal entry creation
 * @param {Object} journalEntry - Journal entry object
 */
export async function onJournalEntryCreated(journalEntry) {
  const triggerManager = getTriggerManager();
  await triggerManager.emitEvent('journal.entry.created', {
    journalEntry,
    triggerType: TRIGGER_TYPES.EVENT_BASED
  });
}

/**
 * Hook into journal entry update
 * @param {Object} journalEntry - Updated journal entry object
 */
export async function onJournalEntryUpdated(journalEntry) {
  const triggerManager = getTriggerManager();
  await triggerManager.emitEvent('journal.entry.updated', {
    journalEntry,
    triggerType: TRIGGER_TYPES.EVENT_BASED
  });
}

/**
 * Generic event hook for custom events
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 */
export async function emitCustomEvent(eventType, data) {
  const triggerManager = getTriggerManager();
  await triggerManager.emitEvent(eventType, {
    ...data,
    triggerType: TRIGGER_TYPES.EVENT_BASED
  });
}

export default {
  onExerciseLogCreated,
  onExerciseGoalAchieved,
  onJournalEntryCreated,
  onJournalEntryUpdated,
  emitCustomEvent
};
