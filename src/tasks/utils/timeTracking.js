/**
 * Time Tracking Utilities
 * 
 * Manages timer state and provides utilities for time tracking operations.
 * Ensures only one timer can be active at a time across all tasks.
 */

/**
 * Active timer state
 * @type {Object|null}
 * @property {string} taskId - Task ID with active timer
 * @property {number} startTime - Timestamp when timer started (milliseconds)
 */
let activeTimer = null;

/**
 * Gets the currently active timer
 * @returns {Object|null} Active timer object or null if no timer is active
 */
export function getActiveTimer() {
  return activeTimer ? { ...activeTimer } : null;
}

/**
 * Checks if a timer is currently active
 * @returns {boolean} True if a timer is active
 */
export function isTimerActive() {
  return activeTimer !== null;
}

/**
 * Gets the task ID of the currently active timer
 * @returns {string|null} Task ID or null if no timer is active
 */
export function getActiveTimerTaskId() {
  return activeTimer ? activeTimer.taskId : null;
}

/**
 * Starts a timer for a task
 * @param {string} taskId - Task ID to start timer for
 * @returns {Object} Timer object with taskId and startTime
 * @throws {Error} If a timer is already active for another task
 */
export function startTimer(taskId) {
  if (!taskId || typeof taskId !== 'string') {
    throw new Error('Task ID is required and must be a string');
  }

  if (activeTimer && activeTimer.taskId !== taskId) {
    throw new Error(
      `Timer is already active for task ${activeTimer.taskId}. Stop it before starting a new timer.`
    );
  }

  // If timer is already active for this task, return existing timer
  if (activeTimer && activeTimer.taskId === taskId) {
    return { ...activeTimer };
  }

  // Start new timer
  activeTimer = {
    taskId,
    startTime: Date.now()
  };

  return { ...activeTimer };
}

/**
 * Stops the active timer and calculates elapsed time
 * @param {string} taskId - Task ID to stop timer for
 * @returns {Object} Timer result with taskId, startTime, endTime, and elapsedMinutes
 * @throws {Error} If no timer is active or timer is for a different task
 */
export function stopTimer(taskId) {
  if (!taskId || typeof taskId !== 'string') {
    throw new Error('Task ID is required and must be a string');
  }

  if (!activeTimer) {
    throw new Error('No timer is currently active');
  }

  if (activeTimer.taskId !== taskId) {
    throw new Error(
      `Timer is active for task ${activeTimer.taskId}, not ${taskId}. Stop the correct timer first.`
    );
  }

  const endTime = Date.now();
  const elapsedMs = endTime - activeTimer.startTime;
  const elapsedMinutes = Math.round(elapsedMs / 60000); // Round to nearest minute

  const result = {
    taskId: activeTimer.taskId,
    startTime: activeTimer.startTime,
    endTime,
    elapsedMinutes
  };

  // Clear active timer
  activeTimer = null;

  return result;
}

/**
 * Stops any active timer (useful for cleanup or switching tasks)
 * @returns {Object|null} Timer result if timer was active, null otherwise
 */
export function stopAnyTimer() {
  if (!activeTimer) {
    return null;
  }

  const endTime = Date.now();
  const elapsedMs = endTime - activeTimer.startTime;
  const elapsedMinutes = Math.round(elapsedMs / 60000);

  const result = {
    taskId: activeTimer.taskId,
    startTime: activeTimer.startTime,
    endTime,
    elapsedMinutes
  };

  activeTimer = null;

  return result;
}

/**
 * Calculates elapsed time for the active timer without stopping it
 * @param {string} taskId - Task ID to calculate elapsed time for
 * @returns {number} Elapsed time in minutes
 * @throws {Error} If no timer is active or timer is for a different task
 */
export function getElapsedTime(taskId) {
  if (!taskId || typeof taskId !== 'string') {
    throw new Error('Task ID is required and must be a string');
  }

  if (!activeTimer) {
    throw new Error('No timer is currently active');
  }

  if (activeTimer.taskId !== taskId) {
    throw new Error(
      `Timer is active for task ${activeTimer.taskId}, not ${taskId}`
    );
  }

  const elapsedMs = Date.now() - activeTimer.startTime;
  return Math.round(elapsedMs / 60000); // Round to nearest minute
}

/**
 * Validates manual time entry
 * @param {number} minutes - Minutes to add
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateManualTimeEntry(minutes) {
  if (typeof minutes !== 'number' || isNaN(minutes)) {
    return { isValid: false, error: 'Minutes must be a number' };
  }

  if (minutes < 0) {
    return { isValid: false, error: 'Minutes cannot be negative' };
  }

  if (minutes === 0) {
    return { isValid: false, error: 'Minutes must be greater than zero' };
  }

  // Maximum reasonable time entry (e.g., 24 hours = 1440 minutes)
  if (minutes > 1440) {
    return { isValid: false, error: 'Time entry cannot exceed 1440 minutes (24 hours)' };
  }

  return { isValid: true, error: null };
}

export default {
  getActiveTimer,
  isTimerActive,
  getActiveTimerTaskId,
  startTimer,
  stopTimer,
  stopAnyTimer,
  getElapsedTime,
  validateManualTimeEntry
};

