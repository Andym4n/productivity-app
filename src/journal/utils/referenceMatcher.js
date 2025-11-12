/**
 * Reference Matcher Utility
 * 
 * Matches extracted UUIDs and dates with existing tasks and events
 * for auto-linking functionality.
 */

import { tasksStore, eventsStore } from '../../storage/index.js';

/**
 * Default date proximity window (in days) for matching dates
 * Events/tasks within this window of a mentioned date will be considered matches
 */
const DEFAULT_PROXIMITY_DAYS = 7;

/**
 * Validates if a UUID string is a valid UUID format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid UUID format
 */
function isValidUUID(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Finds tasks by their IDs
 * @param {Array<string>} taskIds - Array of task IDs to find
 * @returns {Promise<Array<Object>>} Promise resolving to array of found tasks
 */
export async function findTasksByIds(taskIds) {
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return [];
  }

  const validIds = taskIds.filter(isValidUUID);
  if (validIds.length === 0) {
    return [];
  }

  const tasks = [];
  for (const id of validIds) {
    try {
      const task = await tasksStore.get(id);
      if (task && !task.deletedAt) {
        tasks.push(task);
      }
    } catch (error) {
      // Task not found or error - skip it
      console.warn(`Failed to find task ${id}:`, error.message);
    }
  }

  return tasks;
}

/**
 * Finds events by their IDs
 * @param {Array<string>} eventIds - Array of event IDs to find
 * @returns {Promise<Array<Object>>} Promise resolving to array of found events
 */
export async function findEventsByIds(eventIds) {
  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return [];
  }

  const validIds = eventIds.filter(isValidUUID);
  if (validIds.length === 0) {
    return [];
  }

  const events = [];
  for (const id of validIds) {
    try {
      const event = await eventsStore.get(id);
      if (event) {
        events.push(event);
      }
    } catch (error) {
      // Event not found or error - skip it
      console.warn(`Failed to find event ${id}:`, error.message);
    }
  }

  return events;
}

/**
 * Finds tasks by date proximity
 * Matches tasks with due dates within the proximity window of the reference date
 * @param {Date} referenceDate - Reference date to match against
 * @param {number} proximityDays - Number of days for proximity window (default: 7)
 * @returns {Promise<Array<Object>>} Promise resolving to array of matching tasks
 */
export async function findTasksByDateProximity(referenceDate, proximityDays = DEFAULT_PROXIMITY_DAYS) {
  if (!referenceDate || !(referenceDate instanceof Date)) {
    return [];
  }

  try {
    // Calculate date range
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - proximityDays);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(referenceDate);
    endDate.setDate(endDate.getDate() + proximityDays);
    endDate.setHours(23, 59, 59, 999);

    // Get all tasks and filter by due date
    const allTasks = await tasksStore.getActive();
    
    return allTasks.filter(task => {
      if (!task.dueDate || task.deletedAt) {
        return false;
      }

      const taskDueDate = new Date(task.dueDate);
      return taskDueDate >= startDate && taskDueDate <= endDate;
    });
  } catch (error) {
    console.error('Error finding tasks by date proximity:', error);
    return [];
  }
}

/**
 * Finds events by date proximity
 * Matches events with start times within the proximity window of the reference date
 * @param {Date} referenceDate - Reference date to match against
 * @param {number} proximityDays - Number of days for proximity window (default: 7)
 * @returns {Promise<Array<Object>>} Promise resolving to array of matching events
 */
export async function findEventsByDateProximity(referenceDate, proximityDays = DEFAULT_PROXIMITY_DAYS) {
  if (!referenceDate || !(referenceDate instanceof Date)) {
    return [];
  }

  try {
    // Calculate date range
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - proximityDays);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(referenceDate);
    endDate.setDate(endDate.getDate() + proximityDays);
    endDate.setHours(23, 59, 59, 999);

    // Use the store's getByDateRange method
    return await eventsStore.getByDateRange(startDate, endDate);
  } catch (error) {
    console.error('Error finding events by date proximity:', error);
    return [];
  }
}

/**
 * Matches references (UUIDs and dates) with tasks and events
 * @param {Object} references - References object from extractReferences
 * @param {Object} options - Options
 * @param {Date} options.referenceDate - Reference date for date matching (default: today)
 * @param {number} options.proximityDays - Days for proximity window (default: 7)
 * @returns {Promise<Object>} Promise resolving to matched tasks and events
 */
export async function matchReferences(references, options = {}) {
  const {
    referenceDate = new Date(),
    proximityDays = DEFAULT_PROXIMITY_DAYS
  } = options;

  const { uuids = [], dates = [] } = references;

  // Find tasks and events by IDs
  const tasksById = await findTasksByIds(uuids);
  const eventsById = await findEventsByIds(uuids);

  // Find tasks and events by date proximity
  const tasksByDate = [];
  const eventsByDate = [];

  for (const dateRef of dates) {
    const dateTasks = await findTasksByDateProximity(dateRef.date, proximityDays);
    const dateEvents = await findEventsByDateProximity(dateRef.date, proximityDays);

    tasksByDate.push(...dateTasks);
    eventsByDate.push(...dateEvents);
  }

  // Combine and deduplicate by ID
  const allTasks = [...tasksById];
  const allEvents = [...eventsById];

  const taskIds = new Set(tasksById.map(t => t.id));
  const eventIds = new Set(eventsById.map(e => e.id));

  for (const task of tasksByDate) {
    if (!taskIds.has(task.id)) {
      taskIds.add(task.id);
      allTasks.push(task);
    }
  }

  for (const event of eventsByDate) {
    if (!eventIds.has(event.id)) {
      eventIds.add(event.id);
      allEvents.push(event);
    }
  }

  return {
    tasks: allTasks,
    events: allEvents
  };
}

export default {
  findTasksByIds,
  findEventsByIds,
  findTasksByDateProximity,
  findEventsByDateProximity,
  matchReferences
};

