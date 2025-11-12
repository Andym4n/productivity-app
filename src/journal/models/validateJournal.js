/**
 * Journal Entry Validation Logic
 * 
 * Validates Journal Entry objects according to PRD requirements.
 * Uses date-fns for date validation and existing validation utilities.
 */

import { parseISO, isValid } from 'date-fns';
import {
  isValidString,
  isValidUUID,
  sanitizeString
} from '../../utils/validation.js';
import { createEmptySlateValue } from './Journal.js';

/**
 * Validation error class
 */
export class JournalValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'JournalValidationError';
    this.field = field;
  }
}

/**
 * Validates Slate.js content format
 * @param {Array} content - Slate.js editor value
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateContent(content) {
  if (!Array.isArray(content)) {
    return { isValid: false, error: 'Content must be a Slate.js value (array)' };
  }

  if (content.length === 0) {
    return { isValid: false, error: 'Content cannot be empty' };
  }

  // Basic validation: each node should have a type and children
  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (!node || typeof node !== 'object') {
      return { isValid: false, error: `Content node ${i} must be an object` };
    }
    if (!node.type || typeof node.type !== 'string') {
      return { isValid: false, error: `Content node ${i} must have a type` };
    }
    if (!Array.isArray(node.children)) {
      return { isValid: false, error: `Content node ${i} must have children array` };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validates a date string or Date object
 * @param {Date|string|null} date - Date to validate
 * @returns {Object} { isValid: boolean, error: string|null, date: Date|null }
 */
export function validateDate(date) {
  if (date === null || date === undefined) {
    return { isValid: false, error: 'Date is required', date: null };
  }

  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = parseISO(date);
  } else {
    return { isValid: false, error: 'Date must be a Date object or ISO string', date: null };
  }

  if (!isValid(dateObj)) {
    return { isValid: false, error: 'Invalid date format', date: null };
  }

  return { isValid: true, error: null, date: dateObj };
}

/**
 * Validates a template name
 * @param {string|null} template - Template name
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateTemplate(template) {
  if (template === null || template === undefined) {
    return { isValid: true, error: null };
  }

  if (typeof template !== 'string') {
    return { isValid: false, error: 'Template must be a string or null' };
  }

  const sanitized = sanitizeString(template);
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Template cannot be an empty string' };
  }

  if (sanitized.length > 100) {
    return { isValid: false, error: 'Template name must be 100 characters or less' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates a mood value
 * @param {string|null} mood - Mood value
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateMood(mood) {
  if (mood === null || mood === undefined) {
    return { isValid: true, error: null };
  }

  if (typeof mood !== 'string') {
    return { isValid: false, error: 'Mood must be a string or null' };
  }

  const sanitized = sanitizeString(mood);
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Mood cannot be an empty string' };
  }

  if (sanitized.length > 50) {
    return { isValid: false, error: 'Mood must be 50 characters or less' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates an array of tags
 * @param {Array} tags - Array of tag strings
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateTags(tags) {
  if (!Array.isArray(tags)) {
    return { isValid: false, error: 'Tags must be an array' };
  }

  for (const tag of tags) {
    if (typeof tag !== 'string') {
      return { isValid: false, error: 'All tags must be strings' };
    }
    
    const sanitized = sanitizeString(tag);
    if (sanitized.length === 0) {
      return { isValid: false, error: 'Tags cannot be empty strings' };
    }
    
    if (sanitized.length > 50) {
      return { isValid: false, error: 'Each tag must be 50 characters or less' };
    }
  }

  // Check for duplicate tags (case-insensitive)
  const lowerTags = tags.map(t => sanitizeString(t).toLowerCase());
  const uniqueTags = new Set(lowerTags);
  if (uniqueTags.size !== tags.length) {
    return { isValid: false, error: 'Tags must be unique' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates media attachments object
 * @param {Object} media - Media object with images and audio arrays
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateMedia(media) {
  if (media === null || media === undefined) {
    return { isValid: true, error: null };
  }

  if (typeof media !== 'object') {
    return { isValid: false, error: 'Media must be an object' };
  }

  // Validate images array
  if (media.images !== undefined) {
    if (!Array.isArray(media.images)) {
      return { isValid: false, error: 'Media images must be an array' };
    }
    for (const image of media.images) {
      if (typeof image !== 'string') {
        return { isValid: false, error: 'All image URLs must be strings' };
      }
    }
  }

  // Validate audio array
  if (media.audio !== undefined) {
    if (!Array.isArray(media.audio)) {
      return { isValid: false, error: 'Media audio must be an array' };
    }
    for (const audio of media.audio) {
      if (typeof audio !== 'string') {
        return { isValid: false, error: 'All audio URLs must be strings' };
      }
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validates an array of linked task/event IDs
 * @param {Array} linkedIds - Array of IDs
 * @param {string} type - Type of IDs ('tasks' or 'events')
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateLinkedIds(linkedIds, type = 'tasks') {
  if (!Array.isArray(linkedIds)) {
    return { isValid: false, error: `Linked ${type} must be an array` };
  }

  for (const id of linkedIds) {
    if (typeof id !== 'string' || id.length === 0) {
      return { isValid: false, error: `All linked ${type} IDs must be non-empty strings` };
    }
  }

  // Check for duplicate IDs
  const uniqueIds = new Set(linkedIds);
  if (uniqueIds.size !== linkedIds.length) {
    return { isValid: false, error: `Linked ${type} IDs must be unique` };
  }

  return { isValid: true, error: null };
}

/**
 * Validates a complete Journal Entry object
 * @param {Object} entry - Journal entry object to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.requireId - Whether ID is required (default: false for new entries)
 * @param {boolean} options.allowPartial - Whether to allow partial updates (default: false)
 * @returns {Object} { isValid: boolean, errors: Array<string>, entry: Object|null }
 */
export function validateJournalEntry(entry, options = {}) {
  const { requireId = false, allowPartial = false } = options;
  const errors = [];

  if (!entry || typeof entry !== 'object') {
    return {
      isValid: false,
      errors: ['Journal entry must be an object'],
      entry: null
    };
  }

  // Validate ID if required or present
  if (requireId || entry.id) {
    if (!entry.id || typeof entry.id !== 'string') {
      errors.push('Journal entry ID is required and must be a string');
    }
  }

  // Validate content (required unless partial update)
  if (!allowPartial || entry.content !== undefined) {
    const contentValidation = validateContent(entry.content);
    if (!contentValidation.isValid) {
      errors.push(`Content: ${contentValidation.error}`);
    }
  }

  // Validate date (required unless partial update)
  if (!allowPartial || entry.date !== undefined) {
    const dateValidation = validateDate(entry.date);
    if (!dateValidation.isValid) {
      errors.push(`Date: ${dateValidation.error}`);
    }
  }

  // Validate template (optional)
  if (entry.template !== undefined) {
    const templateValidation = validateTemplate(entry.template);
    if (!templateValidation.isValid) {
      errors.push(`Template: ${templateValidation.error}`);
    }
  }

  // Validate mood (optional)
  if (entry.mood !== undefined) {
    const moodValidation = validateMood(entry.mood);
    if (!moodValidation.isValid) {
      errors.push(`Mood: ${moodValidation.error}`);
    }
  }

  // Validate tags
  if (entry.tags !== undefined) {
    const tagsValidation = validateTags(entry.tags);
    if (!tagsValidation.isValid) {
      errors.push(`Tags: ${tagsValidation.error}`);
    }
  }

  // Validate media
  if (entry.media !== undefined) {
    const mediaValidation = validateMedia(entry.media);
    if (!mediaValidation.isValid) {
      errors.push(`Media: ${mediaValidation.error}`);
    }
  }

  // Validate linked tasks
  if (entry.linkedTasks !== undefined) {
    const linkedTasksValidation = validateLinkedIds(entry.linkedTasks, 'tasks');
    if (!linkedTasksValidation.isValid) {
      errors.push(`Linked tasks: ${linkedTasksValidation.error}`);
    }
  }

  // Validate linked events
  if (entry.linkedEvents !== undefined) {
    const linkedEventsValidation = validateLinkedIds(entry.linkedEvents, 'events');
    if (!linkedEventsValidation.isValid) {
      errors.push(`Linked events: ${linkedEventsValidation.error}`);
    }
  }

  // Validate date fields
  const dateFields = ['createdAt', 'updatedAt'];
  for (const field of dateFields) {
    if (entry[field] !== undefined && entry[field] !== null) {
      const dateValidation = validateDate(entry[field]);
      if (!dateValidation.isValid) {
        errors.push(`${field}: ${dateValidation.error}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    entry: errors.length === 0 ? entry : null
  };
}

/**
 * Validates and sanitizes a journal entry object
 * @param {Object} entry - Journal entry object to validate and sanitize
 * @param {Object} options - Validation options
 * @returns {Object} { isValid: boolean, errors: Array<string>, entry: Object|null }
 */
export function validateAndSanitizeJournalEntry(entry, options = {}) {
  if (!entry || typeof entry !== 'object') {
    return {
      isValid: false,
      errors: ['Journal entry must be an object'],
      entry: null
    };
  }

  // Create sanitized copy
  const sanitized = { ...entry };

  // Sanitize string fields
  if (sanitized.template) {
    sanitized.template = sanitizeString(sanitized.template);
  }
  if (sanitized.mood) {
    sanitized.mood = sanitizeString(sanitized.mood);
  }
  if (Array.isArray(sanitized.tags)) {
    sanitized.tags = sanitized.tags.map(tag => sanitizeString(tag));
  }

  // Validate the sanitized entry
  return validateJournalEntry(sanitized, options);
}

export default {
  validateJournalEntry,
  validateAndSanitizeJournalEntry,
  validateContent,
  validateDate,
  validateTemplate,
  validateMood,
  validateTags,
  validateMedia,
  validateLinkedIds,
  JournalValidationError
};

