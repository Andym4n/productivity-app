/**
 * Journal Entry CRUD Operations
 * 
 * Provides create, read, update, and delete operations for journal entries
 * with validation and proper Slate.js content handling.
 */

import { createJournalEntryModel, normalizeJournalEntry } from '../models/index.js';
import { validateJournalEntry, validateAndSanitizeJournalEntry, JournalValidationError } from '../models/validateJournal.js';
import { sanitizeString } from '../../utils/validation.js';
import { journalStore } from '../../storage/index.js';
import { deleteBlobsByEntry } from '../services/mediaService.js';

/**
 * Custom error class for journal operations
 */
export class JournalOperationError extends Error {
  constructor(message, code = 'JOURNAL_OPERATION_ERROR') {
    super(message);
    this.name = 'JournalOperationError';
    this.code = code;
  }
}

/**
 * Creates a new journal entry
 * @param {Object} entryData - Journal entry data (content and date are required)
 * @returns {Promise<Object>} Promise resolving to the created journal entry
 * @throws {JournalValidationError} If validation fails
 * @throws {JournalOperationError} If creation fails
 */
export async function createJournalEntryOperation(entryData) {
  console.log('[Adder] Creating journal entry:', { date: entryData.date, template: entryData.template, mood: entryData.mood });
  try {
    // Sanitize input data first
    const sanitized = { ...entryData };
    if (sanitized.template) {
      sanitized.template = sanitizeString(sanitized.template);
    }
    if (sanitized.mood) {
      sanitized.mood = sanitizeString(sanitized.mood);
    }
    if (Array.isArray(sanitized.tags)) {
      sanitized.tags = sanitized.tags.map(tag => sanitizeString(tag));
    }

    // Create journal entry using model (sets defaults, generates ID, timestamps)
    const entry = createJournalEntryModel(sanitized);
    console.log('[Adder] Journal entry model created:', { id: entry.id, date: entry.date });
    
    // Validate the complete entry with defaults
    const validation = validateJournalEntry(entry);
    
    if (!validation.isValid) {
      console.error('[Adder] Journal entry validation failed:', validation.errors);
      throw new JournalValidationError(
        `Journal entry validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    
    // Normalize the entry (ensures dates are ISO strings, content is valid)
    const normalizedEntry = normalizeJournalEntry(validation.entry);
    
    // Store in IndexedDB
    await journalStore.create(normalizedEntry);
    console.log('[Adder] Journal entry created successfully:', { id: normalizedEntry.id, date: normalizedEntry.date });
    
    return normalizedEntry;
  } catch (error) {
    console.error('[Adder] Error creating journal entry:', { error: error.message, code: error.code, entryData });
    if (error instanceof JournalValidationError) {
      throw error;
    }
    
    // Handle IndexedDB errors
    if (error.name === 'ConstraintError' || error.message.includes('already exists')) {
      console.warn('[Adder] Duplicate journal entry detected:', entryData.id || 'unknown');
      throw new JournalOperationError(
        `Journal entry with ID ${entryData.id || 'unknown'} already exists`,
        'DUPLICATE_ENTRY'
      );
    }
    
    throw new JournalOperationError(
      `Failed to create journal entry: ${error.message}`,
      'CREATE_ERROR'
    );
  }
}

/**
 * Retrieves a journal entry by ID
 * @param {string} entryId - Journal entry ID
 * @returns {Promise<Object|null>} Promise resolving to the entry or null if not found
 * @throws {JournalOperationError} If retrieval fails
 */
export async function getJournalEntry(entryId) {
  try {
    if (!entryId || typeof entryId !== 'string') {
      throw new JournalOperationError('Journal entry ID is required and must be a string', 'INVALID_ID');
    }
    
    const entry = await journalStore.get(entryId);
    
    if (!entry) {
      return null;
    }
    
    // Normalize dates (they should already be ISO strings, but ensure consistency)
    return normalizeJournalEntry(entry);
  } catch (error) {
    if (error instanceof JournalOperationError) {
      throw error;
    }
    
    throw new JournalOperationError(
      `Failed to retrieve journal entry: ${error.message}`,
      'GET_ERROR'
    );
  }
}

/**
 * Retrieves multiple journal entries with optional filters
 * @param {Object} filters - Filter options
 * @param {Date|string} filters.date - Filter by specific date
 * @param {Date|string} filters.startDate - Start of date range
 * @param {Date|string} filters.endDate - End of date range
 * @param {string} filters.template - Filter by template name
 * @param {string} filters.mood - Filter by mood value
 * @param {Array<string>} filters.tags - Filter by tags (entries containing any of these tags)
 * @param {string} filters.searchQuery - Full-text search query (searches content, tags, mood)
 * @param {number} filters.limit - Limit number of results (for recent entries)
 * @returns {Promise<Array>} Promise resolving to array of journal entries
 * @throws {JournalOperationError} If retrieval fails
 */
export async function getJournalEntries(filters = {}) {
  try {
    const {
      date,
      startDate,
      endDate,
      template,
      mood,
      tags,
      searchQuery,
      limit
    } = filters;
    
    let entries = [];
    
    // Priority order: search > specific filters > date range > template > mood > tags > recent > all
    
    if (searchQuery) {
      // Full-text search takes priority
      entries = await journalStore.searchContent(searchQuery);
    } else if (date) {
      // Specific date filter
      const dateObj = date instanceof Date ? date : new Date(date);
      entries = await journalStore.getByDate(dateObj);
    } else if (startDate && endDate) {
      // Date range filter
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);
      entries = await journalStore.getByDateRange(start, end);
    } else if (template) {
      // Template filter
      entries = await journalStore.getByTemplate(template);
    } else if (mood) {
      // Mood filter
      entries = await journalStore.getByMood(mood);
    } else if (tags && Array.isArray(tags) && tags.length > 0) {
      // Tags filter
      entries = await journalStore.getByTags(tags);
    } else if (limit) {
      // Recent entries
      entries = await journalStore.getRecent(limit);
    } else {
      // Get all entries
      entries = await journalStore.getAll();
    }
    
    // Apply additional filters that can be combined
    // (e.g., if searchQuery is provided, we can still filter by mood/tags)
    if (searchQuery && entries.length > 0) {
      // Apply mood filter if provided
      if (mood) {
        entries = entries.filter(entry => entry.mood === mood);
      }
      
      // Apply tags filter if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const normalizedTags = tags.map(tag => tag.toLowerCase().trim());
        entries = entries.filter(entry => {
          if (!Array.isArray(entry.tags) || entry.tags.length === 0) {
            return false;
          }
          const entryTags = entry.tags.map(tag => tag.toLowerCase().trim());
          return normalizedTags.some(tag => entryTags.includes(tag));
        });
      }
      
      // Apply date range filter if provided
      if (startDate && endDate) {
        const start = startDate instanceof Date ? startDate : new Date(startDate);
        const end = endDate instanceof Date ? endDate : new Date(endDate);
        entries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= start && entryDate <= end;
        });
      } else if (date) {
        const dateObj = date instanceof Date ? date : new Date(date);
        const startOfDay = new Date(dateObj);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateObj);
        endOfDay.setHours(23, 59, 59, 999);
        entries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= startOfDay && entryDate <= endOfDay;
        });
      }
      
      // Apply template filter if provided
      if (template) {
        entries = entries.filter(entry => entry.template === template);
      }
    }
    
    // Apply limit if specified (for non-search queries)
    if (limit && !searchQuery) {
      entries = entries.slice(0, limit);
    }
    
    // Normalize all entries
    return entries.map(entry => normalizeJournalEntry(entry));
  } catch (error) {
    throw new JournalOperationError(
      `Failed to retrieve journal entries: ${error.message}`,
      'GET_ENTRIES_ERROR'
    );
  }
}

/**
 * Updates an existing journal entry
 * @param {string} entryId - Journal entry ID to update
 * @param {Object} updates - Partial journal entry data to update
 * @returns {Promise<Object>} Promise resolving to the updated journal entry
 * @throws {JournalValidationError} If validation fails
 * @throws {JournalOperationError} If update fails
 */
export async function updateJournalEntry(entryId, updates) {
  try {
    if (!entryId || typeof entryId !== 'string') {
      throw new JournalOperationError('Journal entry ID is required and must be a string', 'INVALID_ID');
    }
    
    if (!updates || typeof updates !== 'object') {
      throw new JournalOperationError('Updates must be a valid object', 'INVALID_UPDATES');
    }
    
    // Get existing entry
    const existingEntry = await getJournalEntry(entryId);
    
    if (!existingEntry) {
      throw new JournalOperationError(`Journal entry with ID ${entryId} not found`, 'ENTRY_NOT_FOUND');
    }
    
    // Merge updates with existing entry
    const mergedEntry = {
      ...existingEntry,
      ...updates,
      id: entryId // Ensure ID cannot be changed
    };
    
    // Validate the merged entry (allow partial updates)
    const validation = validateAndSanitizeJournalEntry(mergedEntry, { allowPartial: true });
    
    if (!validation.isValid) {
      throw new JournalValidationError(
        `Journal entry validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    
    // Normalize the updated entry
    const normalizedEntry = normalizeJournalEntry(validation.entry);
    
    // Ensure updatedAt is set to current time
    normalizedEntry.updatedAt = new Date().toISOString();
    
    // Update in IndexedDB
    await journalStore.update(entryId, normalizedEntry);
    
    return normalizedEntry;
  } catch (error) {
    if (error instanceof JournalValidationError || error instanceof JournalOperationError) {
      throw error;
    }
    
    throw new JournalOperationError(
      `Failed to update journal entry: ${error.message}`,
      'UPDATE_ERROR'
    );
  }
}

/**
 * Deletes a journal entry
 * @param {string} entryId - Journal entry ID to delete
 * @returns {Promise<void>}
 * @throws {JournalOperationError} If delete fails
 */
export async function deleteJournalEntry(entryId) {
  try {
    if (!entryId || typeof entryId !== 'string') {
      throw new JournalOperationError('Journal entry ID is required and must be a string', 'INVALID_ID');
    }
    
    // Check if entry exists
    const existingEntry = await getJournalEntry(entryId);
    
    if (!existingEntry) {
      throw new JournalOperationError(`Journal entry with ID ${entryId} not found`, 'ENTRY_NOT_FOUND');
    }
    
    // Delete associated media blobs
    try {
      await deleteBlobsByEntry(entryId);
    } catch (mediaError) {
      // Log but don't fail the delete operation if media cleanup fails
      console.warn(`Failed to delete media blobs for entry ${entryId}:`, mediaError);
    }
    
    // Permanently delete from IndexedDB
    await journalStore.delete(entryId);
  } catch (error) {
    if (error instanceof JournalOperationError) {
      throw error;
    }
    
    throw new JournalOperationError(
      `Failed to delete journal entry: ${error.message}`,
      'DELETE_ERROR'
    );
  }
}

// Export createJournalEntryOperation as named export for convenience
export { createJournalEntryOperation as createJournalEntry };

export default {
  createJournalEntry: createJournalEntryOperation,
  getJournalEntry,
  getJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
  JournalOperationError
};

