/**
 * Journal Entry Model
 * 
 * Defines the structure and validation for Journal Entry objects as per PRD.
 * Journal entries support rich text content (Slate.js format), media attachments,
 * templates, tags, mood, and auto-linking to tasks/events.
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
 * Creates a default empty Slate.js editor value
 * @returns {Array} Slate.js editor value (array of nodes)
 */
export function createEmptySlateValue() {
  return [
    {
      type: 'paragraph',
      children: [{ text: '' }]
    }
  ];
}

/**
 * Creates a new Journal Entry object with default values
 * @param {Object} data - Journal entry data
 * @returns {Object} Journal entry object
 */
export function createJournalEntry(data = {}) {
  const now = new Date().toISOString();
  const date = data.date || new Date();
  
  return {
    id: data.id || generateUUID(),
    content: data.content || createEmptySlateValue(), // Slate.js format (array of nodes)
    date: date instanceof Date ? date.toISOString() : (typeof date === 'string' ? date : new Date().toISOString()),
    template: data.template || null,
    mood: data.mood || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    media: {
      images: Array.isArray(data.media?.images) ? data.media.images : [], // Array of blob IDs
      audio: Array.isArray(data.media?.audio) ? data.media.audio : [] // Array of blob IDs
    },
    linkedTasks: Array.isArray(data.linkedTasks) ? data.linkedTasks : [],
    linkedEvents: Array.isArray(data.linkedEvents) ? data.linkedEvents : [],
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Normalizes a Journal Entry object, ensuring all fields are properly formatted
 * @param {Object} entry - Journal entry object to normalize
 * @returns {Object} Normalized journal entry object
 */
export function normalizeJournalEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Journal entry must be an object');
  }

  const normalized = { ...entry };

  // Ensure dates are ISO strings
  const dateFields = ['date', 'createdAt', 'updatedAt'];
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
    }
  });

  // Ensure content is a valid Slate.js value (array)
  if (!Array.isArray(normalized.content)) {
    normalized.content = createEmptySlateValue();
  }

  // Ensure arrays are arrays
  if (!Array.isArray(normalized.tags)) {
    normalized.tags = [];
  }
  if (!Array.isArray(normalized.linkedTasks)) {
    normalized.linkedTasks = [];
  }
  if (!Array.isArray(normalized.linkedEvents)) {
    normalized.linkedEvents = [];
  }

  // Ensure media object structure
  if (!normalized.media || typeof normalized.media !== 'object') {
    normalized.media = { images: [], audio: [] };
  }
  if (!Array.isArray(normalized.media.images)) {
    normalized.media.images = [];
  }
  if (!Array.isArray(normalized.media.audio)) {
    normalized.media.audio = [];
  }

  // Ensure template is string or null
  if (normalized.template !== null && typeof normalized.template !== 'string') {
    normalized.template = null;
  }

  // Ensure mood is string or null
  if (normalized.mood !== null && typeof normalized.mood !== 'string') {
    normalized.mood = null;
  }

  return normalized;
}

/**
 * Journal Entry model type definition (for documentation)
 * @typedef {Object} JournalEntry
 * @property {string} id - UUID
 * @property {Array} content - Slate.js editor value (array of nodes)
 * @property {string} date - ISO date string
 * @property {string|null} template - Template name or null
 * @property {string|null} mood - Mood value or null
 * @property {string[]} tags - Array of tag strings
 * @property {Object} media - Media attachments
 * @property {string[]} media.images - Array of blob IDs for images
 * @property {string[]} media.audio - Array of blob IDs for audio
 * @property {string[]} linkedTasks - Array of task IDs
 * @property {string[]} linkedEvents - Array of event IDs
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 */

export default {
  createJournalEntry,
  normalizeJournalEntry,
  createEmptySlateValue
};

