/**
 * Time Block Model
 * 
 * Defines the structure for time blocks - scheduled periods of work
 * allocated to specific projects or activities.
 */

import { parseISO, isValid, addMinutes, differenceInMinutes } from 'date-fns';

/**
 * Generates a UUID v4
 * @returns {string} UUID string
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Time block status values
 */
export const TIMEBLOCK_STATUSES = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Time block types
 */
export const TIMEBLOCK_TYPES = {
  WORK: 'work',
  MEETING: 'meeting',
  BREAK: 'break',
  FOCUS: 'focus',
  ADMIN: 'admin',
  OTHER: 'other'
};

/**
 * Creates a new TimeBlock object with default values
 * @param {Object} data - Time block data
 * @returns {Object} Time block object
 */
export function createTimeBlock(data = {}) {
  const now = new Date().toISOString();
  
  // Parse or create date-time objects
  let startTime, endTime;
  
  if (data.startTime) {
    startTime = data.startTime instanceof Date 
      ? data.startTime 
      : (typeof data.startTime === 'string' ? parseISO(data.startTime) : new Date());
  } else {
    startTime = new Date();
  }
  
  if (data.endTime) {
    endTime = data.endTime instanceof Date 
      ? data.endTime 
      : (typeof data.endTime === 'string' ? parseISO(data.endTime) : addMinutes(startTime, 60));
  } else {
    // Default to 1 hour after start time
    endTime = addMinutes(startTime, data.duration || 60);
  }

  // Calculate duration if not provided
  const duration = data.duration || differenceInMinutes(endTime, startTime);
  
  return {
    id: data.id || generateUUID(),
    scheduleId: data.scheduleId || null, // Reference to WorkSchedule
    userId: data.userId || null,         // For multi-user support
    
    // Time
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: duration, // Minutes
    
    // Type and categorization
    type: data.type || TIMEBLOCK_TYPES.WORK,
    status: data.status || TIMEBLOCK_STATUSES.SCHEDULED,
    
    // Project allocation
    projectId: data.projectId || null,
    projectName: data.projectName || null,
    
    // Details
    title: data.title || '',
    description: data.description || '',
    notes: data.notes || '',
    
    // References
    taskIds: Array.isArray(data.taskIds) ? data.taskIds : [],
    eventId: data.eventId || null, // Link to calendar event if applicable
    
    // Tracking
    actualStartTime: data.actualStartTime || null,
    actualEndTime: data.actualEndTime || null,
    actualDuration: data.actualDuration || null,
    
    // Metadata
    tags: Array.isArray(data.tags) ? data.tags : [],
    color: data.color || null, // For visual differentiation
    isRecurring: data.isRecurring || false,
    recurrenceRule: data.recurrenceRule || null,
    
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Normalizes a TimeBlock object, ensuring all fields are properly formatted
 * @param {Object} block - Time block object to normalize
 * @returns {Object} Normalized time block object
 */
export function normalizeTimeBlock(block) {
  if (!block || typeof block !== 'object') {
    throw new Error('Time block must be an object');
  }

  const normalized = { ...block };

  // Ensure required fields
  if (!normalized.id) {
    throw new Error('Time block must have an id');
  }

  // Validate and normalize dates
  const dateFields = ['startTime', 'endTime', 'actualStartTime', 'actualEndTime', 'createdAt', 'updatedAt'];
  dateFields.forEach(field => {
    if (normalized[field]) {
      if (normalized[field] instanceof Date) {
        normalized[field] = normalized[field].toISOString();
      } else if (typeof normalized[field] === 'string') {
        const date = parseISO(normalized[field]);
        if (!isValid(date)) {
          throw new Error(`Invalid date format for ${field}`);
        }
        normalized[field] = date.toISOString();
      }
    }
  });

  // Validate start time is before end time
  if (normalized.startTime && normalized.endTime) {
    const start = parseISO(normalized.startTime);
    const end = parseISO(normalized.endTime);
    
    if (end <= start) {
      throw new Error('End time must be after start time');
    }
    
    // Calculate duration if not provided
    if (!normalized.duration) {
      normalized.duration = differenceInMinutes(end, start);
    }
  }

  // Validate status
  if (!Object.values(TIMEBLOCK_STATUSES).includes(normalized.status)) {
    normalized.status = TIMEBLOCK_STATUSES.SCHEDULED;
  }

  // Validate type
  if (!Object.values(TIMEBLOCK_TYPES).includes(normalized.type)) {
    normalized.type = TIMEBLOCK_TYPES.WORK;
  }

  // Ensure arrays
  if (!Array.isArray(normalized.taskIds)) {
    normalized.taskIds = [];
  }
  if (!Array.isArray(normalized.tags)) {
    normalized.tags = [];
  }

  // Validate numeric fields
  const numericFields = ['duration', 'actualDuration'];
  numericFields.forEach(field => {
    if (normalized[field] !== undefined && normalized[field] !== null) {
      const num = Number(normalized[field]);
      if (isNaN(num) || num < 0) {
        throw new Error(`${field} must be a non-negative number`);
      }
      normalized[field] = num;
    }
  });

  return normalized;
}

/**
 * Calculate actual duration from actual times
 * @param {Object} block - Time block object
 * @returns {number|null} Actual duration in minutes, or null if not available
 */
export function calculateActualDuration(block) {
  if (!block.actualStartTime || !block.actualEndTime) {
    return null;
  }
  
  const start = parseISO(block.actualStartTime);
  const end = parseISO(block.actualEndTime);
  
  return differenceInMinutes(end, start);
}

/**
 * Check if a time block overlaps with another
 * @param {Object} block1 - First time block
 * @param {Object} block2 - Second time block
 * @returns {boolean} True if blocks overlap
 */
export function doTimeBlocksOverlap(block1, block2) {
  const start1 = parseISO(block1.startTime);
  const end1 = parseISO(block1.endTime);
  const start2 = parseISO(block2.startTime);
  const end2 = parseISO(block2.endTime);
  
  // Check if there's any overlap
  return start1 < end2 && start2 < end1;
}

/**
 * TimeBlock model type definition (for documentation)
 * @typedef {Object} TimeBlock
 * @property {string} id - UUID
 * @property {string|null} scheduleId - Reference to WorkSchedule
 * @property {string|null} userId - User ID for multi-user support
 * @property {string} startTime - ISO date-time string
 * @property {string} endTime - ISO date-time string
 * @property {number} duration - Duration in minutes
 * @property {string} type - Type of time block (work, meeting, break, focus, admin, other)
 * @property {string} status - Status (scheduled, in-progress, completed, cancelled)
 * @property {string|null} projectId - Project ID
 * @property {string|null} projectName - Project name
 * @property {string} title - Time block title
 * @property {string} description - Time block description
 * @property {string} notes - Additional notes
 * @property {Array<string>} taskIds - Associated task IDs
 * @property {string|null} eventId - Associated calendar event ID
 * @property {string|null} actualStartTime - Actual start time (ISO string)
 * @property {string|null} actualEndTime - Actual end time (ISO string)
 * @property {number|null} actualDuration - Actual duration in minutes
 * @property {Array<string>} tags - Tags for categorization
 * @property {string|null} color - Color for visual representation
 * @property {boolean} isRecurring - Whether time block is recurring
 * @property {string|null} recurrenceRule - Recurrence rule (RRule format)
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 */

export default {
  createTimeBlock,
  normalizeTimeBlock,
  calculateActualDuration,
  doTimeBlocksOverlap,
  TIMEBLOCK_STATUSES,
  TIMEBLOCK_TYPES
};

