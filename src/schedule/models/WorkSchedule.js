/**
 * Work Schedule Model
 * 
 * Defines the structure for work schedule configuration including
 * work hours, shifts, and availability preferences.
 */

import { parseISO, isValid, parse, format } from 'date-fns';

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
 * Work schedule types
 */
export const SCHEDULE_TYPES = {
  FIXED: 'fixed',           // Fixed hours every day
  FLEXIBLE: 'flexible',     // Flexible hours
  SHIFT: 'shift',           // Shift-based schedule
  CUSTOM: 'custom'          // Custom schedule per day
};

/**
 * Days of the week
 */
export const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

/**
 * Shift types
 */
export const SHIFT_TYPES = {
  MORNING: 'morning',     // Morning shift
  AFTERNOON: 'afternoon', // Afternoon shift
  EVENING: 'evening',     // Evening shift
  NIGHT: 'night',         // Night shift
  CUSTOM: 'custom'        // Custom shift
};

/**
 * Parse time string (HH:mm) to minutes since midnight
 * @param {string} timeStr - Time string in HH:mm format
 * @returns {number} Minutes since midnight
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error('Time string is required');
  }
  
  const parsed = parse(timeStr, 'HH:mm', new Date());
  if (!isValid(parsed)) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm`);
  }
  
  return parsed.getHours() * 60 + parsed.getMinutes();
}

/**
 * Format minutes since midnight to HH:mm string
 * @param {number} minutes - Minutes since midnight
 * @returns {string} Time string in HH:mm format
 */
export function formatMinutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Creates a new WorkSchedule object with default values
 * @param {Object} data - Work schedule data
 * @returns {Object} Work schedule object
 */
export function createWorkSchedule(data = {}) {
  const now = new Date().toISOString();
  
  return {
    id: data.id || generateUUID(),
    userId: data.userId || null, // For multi-user support
    scheduleType: data.scheduleType || SCHEDULE_TYPES.FIXED,
    name: data.name || 'Default Schedule',
    description: data.description || '',
    
    // Fixed schedule: same hours every day
    defaultStartTime: data.defaultStartTime || '09:00', // HH:mm format
    defaultEndTime: data.defaultEndTime || '17:00',     // HH:mm format
    
    // Weekly schedule: specific hours per day of week
    weeklySchedule: data.weeklySchedule || {
      [DAYS_OF_WEEK.MONDAY]: { enabled: true, startTime: '09:00', endTime: '17:00' },
      [DAYS_OF_WEEK.TUESDAY]: { enabled: true, startTime: '09:00', endTime: '17:00' },
      [DAYS_OF_WEEK.WEDNESDAY]: { enabled: true, startTime: '09:00', endTime: '17:00' },
      [DAYS_OF_WEEK.THURSDAY]: { enabled: true, startTime: '09:00', endTime: '17:00' },
      [DAYS_OF_WEEK.FRIDAY]: { enabled: true, startTime: '09:00', endTime: '17:00' },
      [DAYS_OF_WEEK.SATURDAY]: { enabled: false, startTime: '09:00', endTime: '17:00' },
      [DAYS_OF_WEEK.SUNDAY]: { enabled: false, startTime: '09:00', endTime: '17:00' }
    },
    
    // Shift-based schedule
    shifts: Array.isArray(data.shifts) ? data.shifts : [],
    
    // Breaks
    breakDuration: data.breakDuration || 60, // Minutes
    breakTimes: Array.isArray(data.breakTimes) ? data.breakTimes : [{ startTime: '12:00', duration: 60 }],
    
    // Availability preferences
    preferredWorkDays: Array.isArray(data.preferredWorkDays) ? data.preferredWorkDays : [1, 2, 3, 4, 5], // Mon-Fri
    minHoursPerDay: data.minHoursPerDay || 4,
    maxHoursPerDay: data.maxHoursPerDay || 10,
    minHoursPerWeek: data.minHoursPerWeek || 20,
    maxHoursPerWeek: data.maxHoursPerWeek || 50,
    
    // Metadata
    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Normalizes a WorkSchedule object
 * @param {Object} schedule - Work schedule object to normalize
 * @returns {Object} Normalized work schedule object
 */
export function normalizeWorkSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') {
    throw new Error('Work schedule must be an object');
  }

  const normalized = { ...schedule };

  // Ensure required fields
  if (!normalized.id) {
    throw new Error('Work schedule must have an id');
  }

  // Validate schedule type
  if (!Object.values(SCHEDULE_TYPES).includes(normalized.scheduleType)) {
    normalized.scheduleType = SCHEDULE_TYPES.FIXED;
  }

  // Ensure dates are ISO strings
  const dateFields = ['createdAt', 'updatedAt'];
  dateFields.forEach(field => {
    if (normalized[field]) {
      if (normalized[field] instanceof Date) {
        normalized[field] = normalized[field].toISOString();
      } else if (typeof normalized[field] === 'string') {
        const date = parseISO(normalized[field]);
        if (!isValid(date)) {
          throw new Error(`Invalid date format for ${field}`);
        }
      }
    }
  });

  // Validate time formats
  try {
    if (normalized.defaultStartTime) {
      parseTimeToMinutes(normalized.defaultStartTime);
    }
    if (normalized.defaultEndTime) {
      parseTimeToMinutes(normalized.defaultEndTime);
    }
  } catch (error) {
    throw new Error(`Invalid time format: ${error.message}`);
  }

  // Ensure arrays
  if (!Array.isArray(normalized.shifts)) {
    normalized.shifts = [];
  }
  if (!Array.isArray(normalized.breakTimes)) {
    normalized.breakTimes = [];
  }
  if (!Array.isArray(normalized.preferredWorkDays)) {
    normalized.preferredWorkDays = [1, 2, 3, 4, 5];
  }

  // Ensure weekly schedule structure
  if (!normalized.weeklySchedule || typeof normalized.weeklySchedule !== 'object') {
    normalized.weeklySchedule = {};
  }

  // Validate numeric fields
  const numericFields = ['breakDuration', 'minHoursPerDay', 'maxHoursPerDay', 'minHoursPerWeek', 'maxHoursPerWeek'];
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
 * Work Schedule model type definition (for documentation)
 * @typedef {Object} WorkSchedule
 * @property {string} id - UUID
 * @property {string|null} userId - User ID for multi-user support
 * @property {string} scheduleType - Type of schedule (fixed, flexible, shift, custom)
 * @property {string} name - Schedule name
 * @property {string} description - Schedule description
 * @property {string} defaultStartTime - Default start time (HH:mm)
 * @property {string} defaultEndTime - Default end time (HH:mm)
 * @property {Object} weeklySchedule - Schedule per day of week
 * @property {Array} shifts - Array of shift definitions
 * @property {number} breakDuration - Total break duration in minutes
 * @property {Array} breakTimes - Array of break time definitions
 * @property {Array<number>} preferredWorkDays - Preferred work days (0-6, Sunday-Saturday)
 * @property {number} minHoursPerDay - Minimum hours per day
 * @property {number} maxHoursPerDay - Maximum hours per day
 * @property {number} minHoursPerWeek - Minimum hours per week
 * @property {number} maxHoursPerWeek - Maximum hours per week
 * @property {string} timezone - Timezone string
 * @property {boolean} isActive - Whether schedule is active
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 */

export default {
  createWorkSchedule,
  normalizeWorkSchedule,
  parseTimeToMinutes,
  formatMinutesToTime,
  SCHEDULE_TYPES,
  DAYS_OF_WEEK,
  SHIFT_TYPES
};

