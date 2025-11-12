/**
 * Validation utilities for Work Schedule and Time Block models
 */

import { parseISO, isValid, isBefore, isAfter, differenceInMinutes } from 'date-fns';
import { parseTimeToMinutes } from './WorkSchedule.js';
import { SCHEDULE_TYPES, SHIFT_TYPES } from './WorkSchedule.js';
import { TIMEBLOCK_STATUSES, TIMEBLOCK_TYPES } from './TimeBlock.js';

/**
 * Custom validation error class
 */
export class ScheduleValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ScheduleValidationError';
    this.field = field;
  }
}

/**
 * Validate work schedule object
 * @param {Object} schedule - Work schedule object to validate
 * @throws {ScheduleValidationError} If validation fails
 */
export function validateWorkSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') {
    throw new ScheduleValidationError('Work schedule must be an object');
  }

  // Required fields
  if (!schedule.id || typeof schedule.id !== 'string') {
    throw new ScheduleValidationError('Work schedule must have a valid id', 'id');
  }

  if (!schedule.name || typeof schedule.name !== 'string') {
    throw new ScheduleValidationError('Work schedule must have a name', 'name');
  }

  // Validate schedule type
  if (!Object.values(SCHEDULE_TYPES).includes(schedule.scheduleType)) {
    throw new ScheduleValidationError(
      `Invalid schedule type: ${schedule.scheduleType}`,
      'scheduleType'
    );
  }

  // Validate times
  if (schedule.defaultStartTime) {
    try {
      parseTimeToMinutes(schedule.defaultStartTime);
    } catch (error) {
      throw new ScheduleValidationError(
        `Invalid default start time: ${error.message}`,
        'defaultStartTime'
      );
    }
  }

  if (schedule.defaultEndTime) {
    try {
      parseTimeToMinutes(schedule.defaultEndTime);
    } catch (error) {
      throw new ScheduleValidationError(
        `Invalid default end time: ${error.message}`,
        'defaultEndTime'
      );
    }
  }

  // Validate that end time is after start time
  if (schedule.defaultStartTime && schedule.defaultEndTime) {
    const startMinutes = parseTimeToMinutes(schedule.defaultStartTime);
    const endMinutes = parseTimeToMinutes(schedule.defaultEndTime);
    
    if (endMinutes <= startMinutes) {
      throw new ScheduleValidationError(
        'Default end time must be after start time',
        'defaultEndTime'
      );
    }
  }

  // Validate weekly schedule
  if (schedule.weeklySchedule) {
    if (typeof schedule.weeklySchedule !== 'object') {
      throw new ScheduleValidationError('Weekly schedule must be an object', 'weeklySchedule');
    }

    // Validate each day's schedule
    Object.entries(schedule.weeklySchedule).forEach(([day, daySchedule]) => {
      if (daySchedule && typeof daySchedule === 'object') {
        if (daySchedule.startTime) {
          try {
            parseTimeToMinutes(daySchedule.startTime);
          } catch (error) {
            throw new ScheduleValidationError(
              `Invalid start time for day ${day}: ${error.message}`,
              `weeklySchedule.${day}.startTime`
            );
          }
        }
        
        if (daySchedule.endTime) {
          try {
            parseTimeToMinutes(daySchedule.endTime);
          } catch (error) {
            throw new ScheduleValidationError(
              `Invalid end time for day ${day}: ${error.message}`,
              `weeklySchedule.${day}.endTime`
            );
          }
        }

        // Validate that end time is after start time
        if (daySchedule.startTime && daySchedule.endTime) {
          const startMinutes = parseTimeToMinutes(daySchedule.startTime);
          const endMinutes = parseTimeToMinutes(daySchedule.endTime);
          
          if (endMinutes <= startMinutes) {
            throw new ScheduleValidationError(
              `End time must be after start time for day ${day}`,
              `weeklySchedule.${day}`
            );
          }
        }
      }
    });
  }

  // Validate numeric constraints
  if (schedule.minHoursPerDay !== undefined && schedule.maxHoursPerDay !== undefined) {
    if (schedule.minHoursPerDay > schedule.maxHoursPerDay) {
      throw new ScheduleValidationError(
        'Minimum hours per day cannot exceed maximum hours per day',
        'minHoursPerDay'
      );
    }
  }

  if (schedule.minHoursPerWeek !== undefined && schedule.maxHoursPerWeek !== undefined) {
    if (schedule.minHoursPerWeek > schedule.maxHoursPerWeek) {
      throw new ScheduleValidationError(
        'Minimum hours per week cannot exceed maximum hours per week',
        'minHoursPerWeek'
      );
    }
  }

  return true;
}

/**
 * Validate time block object
 * @param {Object} block - Time block object to validate
 * @throws {ScheduleValidationError} If validation fails
 */
export function validateTimeBlock(block) {
  if (!block || typeof block !== 'object') {
    throw new ScheduleValidationError('Time block must be an object');
  }

  // Required fields
  if (!block.id || typeof block.id !== 'string') {
    throw new ScheduleValidationError('Time block must have a valid id', 'id');
  }

  if (!block.startTime) {
    throw new ScheduleValidationError('Time block must have a start time', 'startTime');
  }

  if (!block.endTime) {
    throw new ScheduleValidationError('Time block must have an end time', 'endTime');
  }

  // Validate dates
  const startTime = parseISO(block.startTime);
  const endTime = parseISO(block.endTime);

  if (!isValid(startTime)) {
    throw new ScheduleValidationError('Invalid start time format', 'startTime');
  }

  if (!isValid(endTime)) {
    throw new ScheduleValidationError('Invalid end time format', 'endTime');
  }

  // Validate time order
  if (!isBefore(startTime, endTime)) {
    throw new ScheduleValidationError('End time must be after start time', 'endTime');
  }

  // Validate duration
  const calculatedDuration = differenceInMinutes(endTime, startTime);
  if (block.duration && Math.abs(block.duration - calculatedDuration) > 1) {
    throw new ScheduleValidationError(
      'Duration does not match start and end times',
      'duration'
    );
  }

  // Validate status
  if (!Object.values(TIMEBLOCK_STATUSES).includes(block.status)) {
    throw new ScheduleValidationError(
      `Invalid time block status: ${block.status}`,
      'status'
    );
  }

  // Validate type
  if (!Object.values(TIMEBLOCK_TYPES).includes(block.type)) {
    throw new ScheduleValidationError(
      `Invalid time block type: ${block.type}`,
      'type'
    );
  }

  // Validate actual times if provided
  if (block.actualStartTime && block.actualEndTime) {
    const actualStart = parseISO(block.actualStartTime);
    const actualEnd = parseISO(block.actualEndTime);

    if (!isValid(actualStart)) {
      throw new ScheduleValidationError('Invalid actual start time format', 'actualStartTime');
    }

    if (!isValid(actualEnd)) {
      throw new ScheduleValidationError('Invalid actual end time format', 'actualEndTime');
    }

    if (!isBefore(actualStart, actualEnd)) {
      throw new ScheduleValidationError(
        'Actual end time must be after actual start time',
        'actualEndTime'
      );
    }
  }

  return true;
}

/**
 * Validate time block for conflicts with existing blocks
 * @param {Object} block - Time block to validate
 * @param {Array<Object>} existingBlocks - Array of existing time blocks
 * @returns {Object} Validation result { valid: boolean, conflicts: Array }
 */
export function validateTimeBlockConflicts(block, existingBlocks = []) {
  const conflicts = [];
  
  const blockStart = parseISO(block.startTime);
  const blockEnd = parseISO(block.endTime);

  for (const existing of existingBlocks) {
    // Skip comparing with itself
    if (existing.id === block.id) {
      continue;
    }

    // Skip cancelled blocks
    if (existing.status === TIMEBLOCK_STATUSES.CANCELLED) {
      continue;
    }

    const existingStart = parseISO(existing.startTime);
    const existingEnd = parseISO(existing.endTime);

    // Check for overlap
    if (blockStart < existingEnd && existingStart < blockEnd) {
      conflicts.push({
        blockId: existing.id,
        blockTitle: existing.title,
        startTime: existing.startTime,
        endTime: existing.endTime,
        type: 'overlap'
      });
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts
  };
}

export default {
  validateWorkSchedule,
  validateTimeBlock,
  validateTimeBlockConflicts,
  ScheduleValidationError
};

