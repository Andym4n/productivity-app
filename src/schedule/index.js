/**
 * Schedule Module Export
 * 
 * Main export file for the schedule module
 */

// CRUD Operations (primary API)
export * from './crud/index.js';

// Model Constants and Validators (public API)
export {
  SCHEDULE_TYPES,
  DAYS_OF_WEEK,
  SHIFT_TYPES,
  TIMEBLOCK_STATUSES,
  TIMEBLOCK_TYPES,
  validateWorkSchedule,
  validateTimeBlock,
  validateTimeBlockConflicts,
  ScheduleValidationError
} from './models/index.js';

// Utils
export * from './utils/index.js';

// Note: Model constructors (createWorkSchedule, createTimeBlock, etc.) 
// are not exported as they are internal implementation details.
// Use the CRUD operations instead (e.g., createSchedule, createTimeBlock from crud)

