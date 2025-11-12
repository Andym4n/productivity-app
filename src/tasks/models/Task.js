/**
 * Task Model
 * 
 * Defines the structure and validation for Task objects as per PRD.
 * Tasks support CRUD operations, recurring patterns, subtasks, dependencies,
 * priorities, tags, and time tracking.
 */

import { parseISO, isValid } from 'date-fns';

/**
 * Generates a UUID v4
 * Uses crypto.randomUUID() if available (modern browsers/Node 14.17+),
 * otherwise falls back to a simple implementation
 * @returns {string} UUID string
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Task recurrence pattern types
 */
export const RECURRENCE_PATTERNS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom'
};

/**
 * Task priority levels
 */
export const TASK_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Task status values
 */
export const TASK_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Task context values
 */
export const TASK_CONTEXTS = {
  WORK: 'work',
  PERSONAL: 'personal'
};

/**
 * Creates a new Task object with default values
 * @param {Object} data - Task data
 * @returns {Object} Task object
 */
export function createTask(data = {}) {
  const now = new Date().toISOString();
  
  return {
    id: data.id || generateUUID(),
    title: data.title || '',
    description: data.description || '',
    dueDate: data.dueDate || null,
    priority: data.priority || TASK_PRIORITIES.MEDIUM,
    status: data.status || TASK_STATUSES.PENDING,
    context: data.context || TASK_CONTEXTS.PERSONAL,
    tags: Array.isArray(data.tags) ? data.tags : [],
    timeEstimate: data.timeEstimate || null,
    timeSpent: data.timeSpent || 0,
    parentId: data.parentId || null,
    dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
    recurrence: data.recurrence || null,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    completedAt: data.completedAt || null,
    deletedAt: data.deletedAt || null
  };
}

/**
 * Normalizes a Task object, ensuring all fields are properly formatted
 * @param {Object} task - Task object to normalize
 * @returns {Object} Normalized task object
 */
export function normalizeTask(task) {
  if (!task || typeof task !== 'object') {
    throw new Error('Task must be an object');
  }

  const normalized = { ...task };

  // Ensure dates are ISO strings or null
  const dateFields = ['dueDate', 'createdAt', 'updatedAt', 'completedAt', 'deletedAt'];
  dateFields.forEach(field => {
    if (normalized[field]) {
      if (normalized[field] instanceof Date) {
        normalized[field] = normalized[field].toISOString();
      } else if (typeof normalized[field] === 'string') {
        // Validate date string
        const date = parseISO(normalized[field]);
        if (!isValid(date)) {
          throw new Error(`Invalid date format for ${field}`);
        }
      }
    } else {
      normalized[field] = null;
    }
  });

  // Normalize recurrence endDate if present
  if (normalized.recurrence && normalized.recurrence.endDate) {
    if (normalized.recurrence.endDate instanceof Date) {
      normalized.recurrence.endDate = normalized.recurrence.endDate.toISOString();
    } else if (typeof normalized.recurrence.endDate === 'string') {
      const date = parseISO(normalized.recurrence.endDate);
      if (!isValid(date)) {
        throw new Error('Invalid date format for recurrence.endDate');
      }
    }
  }

  // Ensure arrays are arrays
  if (!Array.isArray(normalized.tags)) {
    normalized.tags = [];
  }
  if (!Array.isArray(normalized.dependencies)) {
    normalized.dependencies = [];
  }

  // Ensure numbers are numbers
  if (normalized.timeEstimate !== null && typeof normalized.timeEstimate !== 'number') {
    normalized.timeEstimate = Number(normalized.timeEstimate);
  }
  if (typeof normalized.timeSpent !== 'number') {
    normalized.timeSpent = Number(normalized.timeSpent) || 0;
  }

  return normalized;
}

/**
 * Task model type definition (for documentation)
 * @typedef {Object} Task
 * @property {string} id - UUID
 * @property {string} title - Required task title
 * @property {string} description - Optional task description
 * @property {string|null} dueDate - ISO date string or null
 * @property {string} priority - 'high' | 'medium' | 'low'
 * @property {string} status - 'pending' | 'in-progress' | 'completed' | 'cancelled'
 * @property {string} context - 'work' | 'personal'
 * @property {string[]} tags - Array of tag strings
 * @property {number|null} timeEstimate - Estimated time in minutes
 * @property {number} timeSpent - Actual time spent in minutes
 * @property {string|null} parentId - Parent task ID for subtasks
 * @property {string[]} dependencies - Array of task IDs this task depends on
 * @property {Object|null} recurrence - Recurrence pattern object
 * @property {string} recurrence.pattern - 'daily' | 'weekly' | 'monthly' | 'custom'
 * @property {number} recurrence.interval - Interval number (for daily, weekly, monthly patterns)
 * @property {number[]} recurrence.daysOfWeek - Days of week (0-6, 0=Sunday) for weekly patterns
 * @property {string|null} recurrence.endDate - ISO date string or null
 * @property {Object} recurrence.rruleOptions - rrule.js options object (for custom patterns only)
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 * @property {string|null} completedAt - ISO date string or null
 * @property {string|null} deletedAt - ISO date string or null (for soft delete)
 */

export default {
  createTask,
  normalizeTask,
  RECURRENCE_PATTERNS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_CONTEXTS
};

