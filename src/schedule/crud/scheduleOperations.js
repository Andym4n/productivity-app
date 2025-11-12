/**
 * Work Schedule CRUD Operations
 * 
 * Provides create, read, update, and delete operations for work schedules
 * with validation and proper time handling.
 */

import { createWorkSchedule, normalizeWorkSchedule } from '../models/index.js';
import { validateWorkSchedule, ScheduleValidationError } from '../models/validateSchedule.js';
import workScheduleStore from '../../storage/indexeddb/stores/workScheduleStore.js';

/**
 * Custom error class for schedule operations
 */
export class ScheduleOperationError extends Error {
  constructor(message, code = 'SCHEDULE_OPERATION_ERROR') {
    super(message);
    this.name = 'ScheduleOperationError';
    this.code = code;
  }
}

// Using singleton workScheduleStore instance imported above

/**
 * Creates a new work schedule
 * @param {Object} scheduleData - Work schedule data
 * @returns {Promise<Object>} Promise resolving to the created schedule
 * @throws {ScheduleValidationError} If validation fails
 * @throws {ScheduleOperationError} If creation fails
 */
export async function createSchedule(scheduleData) {
  console.log('[Adder] Creating schedule:', { name: scheduleData.name, timezone: scheduleData.timezone });
  try {
    // Create schedule using model (sets defaults, generates ID, timestamps)
    const schedule = createWorkSchedule(scheduleData);
    console.log('[Adder] Schedule model created:', { id: schedule.id, name: schedule.name });
    
    // Validate the complete schedule with defaults
    validateWorkSchedule(schedule);
    console.log('[Adder] Schedule validation passed');
    
    // Normalize the schedule (ensures dates are ISO strings, times are valid)
    const normalizedSchedule = normalizeWorkSchedule(schedule);
    
    // Store in IndexedDB
    const store = workScheduleStore;
    await store.create(normalizedSchedule);
    console.log('[Adder] Schedule created successfully:', { id: normalizedSchedule.id, name: normalizedSchedule.name });
    
    return normalizedSchedule;
  } catch (error) {
    console.error('[Adder] Error creating schedule:', { error: error.message, code: error.code, scheduleData });
    if (error instanceof ScheduleValidationError) {
      throw error;
    }
    
    // Handle IndexedDB errors
    if (error.name === 'ConstraintError' || error.message.includes('already exists')) {
      console.warn('[Adder] Duplicate schedule detected:', scheduleData.id || 'unknown');
      throw new ScheduleOperationError(
        `Work schedule with ID ${scheduleData.id || 'unknown'} already exists`,
        'DUPLICATE_SCHEDULE'
      );
    }
    
    throw new ScheduleOperationError(
      `Failed to create work schedule: ${error.message}`,
      'CREATE_ERROR'
    );
  }
}

/**
 * Retrieves a work schedule by ID
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise<Object|null>} Promise resolving to the schedule or null if not found
 * @throws {ScheduleOperationError} If retrieval fails
 */
export async function getSchedule(scheduleId) {
  try {
    if (!scheduleId || typeof scheduleId !== 'string') {
      throw new ScheduleOperationError('Schedule ID is required and must be a string', 'INVALID_ID');
    }
    
    const store = workScheduleStore;
    const schedule = await store.get(scheduleId);
    
    if (!schedule) {
      return null;
    }
    
    return schedule;
  } catch (error) {
    if (error instanceof ScheduleOperationError) {
      throw error;
    }
    
    throw new ScheduleOperationError(
      `Failed to retrieve work schedule: ${error.message}`,
      'READ_ERROR'
    );
  }
}

/**
 * Retrieves all work schedules
 * @returns {Promise<Array>} Promise resolving to array of schedules
 * @throws {ScheduleOperationError} If retrieval fails
 */
export async function getAllSchedules() {
  try {
    const store = workScheduleStore;
    const schedules = await store.getAll();
    
    // Sort by updatedAt descending
    return schedules.sort((a, b) => {
      const dateA = new Date(a.updatedAt);
      const dateB = new Date(b.updatedAt);
      return dateB - dateA;
    });
  } catch (error) {
    throw new ScheduleOperationError(
      `Failed to retrieve work schedules: ${error.message}`,
      'READ_ERROR'
    );
  }
}

/**
 * Retrieves active work schedules
 * @returns {Promise<Array>} Promise resolving to array of active schedules
 * @throws {ScheduleOperationError} If retrieval fails
 */
export async function getActiveSchedules() {
  try {
    const store = workScheduleStore;
    return await store.getActiveSchedules();
  } catch (error) {
    throw new ScheduleOperationError(
      `Failed to retrieve active schedules: ${error.message}`,
      'READ_ERROR'
    );
  }
}

/**
 * Retrieves the current active schedule
 * @returns {Promise<Object|null>} Promise resolving to the current schedule or null
 * @throws {ScheduleOperationError} If retrieval fails
 */
export async function getCurrentSchedule() {
  try {
    const store = workScheduleStore;
    return await store.getCurrentSchedule();
  } catch (error) {
    throw new ScheduleOperationError(
      `Failed to retrieve current schedule: ${error.message}`,
      'READ_ERROR'
    );
  }
}

/**
 * Updates an existing work schedule
 * @param {string} scheduleId - Schedule ID
 * @param {Object} updates - Schedule updates
 * @returns {Promise<Object>} Promise resolving to the updated schedule
 * @throws {ScheduleValidationError} If validation fails
 * @throws {ScheduleOperationError} If update fails
 */
export async function updateSchedule(scheduleId, updates) {
  try {
    if (!scheduleId || typeof scheduleId !== 'string') {
      throw new ScheduleOperationError('Schedule ID is required and must be a string', 'INVALID_ID');
    }
    
    // Get existing schedule
    const store = workScheduleStore;
    const existing = await store.get(scheduleId);
    
    if (!existing) {
      throw new ScheduleOperationError(
        `Work schedule with ID ${scheduleId} not found`,
        'NOT_FOUND'
      );
    }
    
    // Merge updates with existing schedule
    const updated = {
      ...existing,
      ...updates,
      id: scheduleId, // Ensure ID doesn't change
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString() // Update timestamp
    };
    
    // Validate the updated schedule
    validateWorkSchedule(updated);
    
    // Normalize the schedule
    const normalizedSchedule = normalizeWorkSchedule(updated);
    
    // Update in IndexedDB
    await store.update(scheduleId, normalizedSchedule);
    
    return normalizedSchedule;
  } catch (error) {
    if (error instanceof ScheduleValidationError || error instanceof ScheduleOperationError) {
      throw error;
    }
    
    throw new ScheduleOperationError(
      `Failed to update work schedule: ${error.message}`,
      'UPDATE_ERROR'
    );
  }
}

/**
 * Deletes a work schedule
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise<boolean>} Promise resolving to true if deleted
 * @throws {ScheduleOperationError} If deletion fails
 */
export async function deleteSchedule(scheduleId) {
  try {
    if (!scheduleId || typeof scheduleId !== 'string') {
      throw new ScheduleOperationError('Schedule ID is required and must be a string', 'INVALID_ID');
    }
    
    const store = workScheduleStore;
    const existing = await store.get(scheduleId);
    
    if (!existing) {
      throw new ScheduleOperationError(
        `Work schedule with ID ${scheduleId} not found`,
        'NOT_FOUND'
      );
    }
    
    // Delete from IndexedDB
    await store.delete(scheduleId);
    
    return true;
  } catch (error) {
    if (error instanceof ScheduleOperationError) {
      throw error;
    }
    
    throw new ScheduleOperationError(
      `Failed to delete work schedule: ${error.message}`,
      'DELETE_ERROR'
    );
  }
}

/**
 * Activates a work schedule (sets isActive to true, deactivates others)
 * @param {string} scheduleId - Schedule ID to activate
 * @returns {Promise<Object>} Promise resolving to the activated schedule
 * @throws {ScheduleOperationError} If activation fails
 */
export async function activateSchedule(scheduleId) {
  try {
    // Get all active schedules
    const activeSchedules = await getActiveSchedules();
    
    // Deactivate all current active schedules
    for (const schedule of activeSchedules) {
      if (schedule.id !== scheduleId) {
        await updateSchedule(schedule.id, { isActive: false });
      }
    }
    
    // Activate the target schedule
    return await updateSchedule(scheduleId, { isActive: true });
  } catch (error) {
    if (error instanceof ScheduleOperationError) {
      throw error;
    }
    
    throw new ScheduleOperationError(
      `Failed to activate work schedule: ${error.message}`,
      'ACTIVATE_ERROR'
    );
  }
}

export default {
  createSchedule,
  getSchedule,
  getAllSchedules,
  getActiveSchedules,
  getCurrentSchedule,
  updateSchedule,
  deleteSchedule,
  activateSchedule,
  ScheduleOperationError
};

