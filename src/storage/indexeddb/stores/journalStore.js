import { BaseStore } from './baseStore.js';
import { extractText } from '../../../journal/utils/contentParser.js';

/**
 * Journal entries store - handles CRUD operations for journal entries
 */
export class JournalEntriesStore extends BaseStore {
  constructor() {
    super('journalEntries');
  }

  /**
   * Gets journal entries for a specific date
   * @param {Date} date - Date to query
   * @returns {Promise<Array>} Promise resolving to entries for that date
   */
  async getByDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const range = IDBKeyRange.bound(startOfDay, endOfDay);
    return await this.query('byDate', range);
  }

  /**
   * Gets journal entries within a date range
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Promise<Array>} Promise resolving to filtered entries
   */
  async getByDateRange(startDate, endDate) {
    const range = IDBKeyRange.bound(startDate, endDate);
    return await this.query('byDate', range);
  }

  /**
   * Gets journal entries by template
   * @param {string} templateName - Template name to filter by
   * @returns {Promise<Array>} Promise resolving to filtered entries
   */
  async getByTemplate(templateName) {
    return await this.query('byTemplate', templateName);
  }

  /**
   * Gets the most recent journal entries
   * @param {number} limit - Maximum number of entries to return
   * @returns {Promise<Array>} Promise resolving to recent entries
   */
  async getRecent(limit = 10) {
    try {
      // Use getAll and sort - more reliable than cursor operations
      const allEntries = await this.getAll();
      return allEntries
        .sort((a, b) => {
          const aDate = new Date(a.createdAt || a.date || 0);
          const bDate = new Date(b.createdAt || b.date || 0);
          return bDate.getTime() - aDate.getTime(); // Most recent first
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent journal entries:', error);
      return [];
    }
  }

  /**
   * Gets journal entries by mood
   * @param {string} mood - Mood value to filter by
   * @returns {Promise<Array>} Promise resolving to filtered entries
   */
  async getByMood(mood) {
    if (!mood) {
      return [];
    }
    return await this.query('byMood', mood);
  }

  /**
   * Gets journal entries that contain any of the specified tags
   * @param {Array<string>} tags - Array of tag strings to filter by
   * @returns {Promise<Array>} Promise resolving to filtered entries
   */
  async getByTags(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return [];
    }

    // Since tags is an array, we need to get all entries and filter in memory
    // This is less efficient but necessary for array-based queries
    const allEntries = await this.getAll();
    
    // Normalize tags to lowercase for case-insensitive matching
    const normalizedTags = tags.map(tag => tag.toLowerCase().trim());
    
    return allEntries.filter(entry => {
      if (!Array.isArray(entry.tags) || entry.tags.length === 0) {
        return false;
      }
      
      // Check if entry has any of the specified tags
      const entryTags = entry.tags.map(tag => tag.toLowerCase().trim());
      return normalizedTags.some(tag => entryTags.includes(tag));
    });
  }

  /**
   * Searches journal entries by full-text search in content
   * @param {string} searchQuery - Search query string
   * @returns {Promise<Array>} Promise resolving to matching entries
   */
  async searchContent(searchQuery) {
    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length === 0) {
      return [];
    }

    // Get all entries and filter in memory
    // For better performance with large datasets, consider implementing
    // a more sophisticated search index or using a library like Fuse.js
    const allEntries = await this.getAll();
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    return allEntries.filter(entry => {
      // Extract text from Slate.js content
      const contentText = extractText(entry.content || []);
      
      // Search in content, tags, and mood
      const searchableText = [
        contentText,
        ...(entry.tags || []),
        entry.mood || ''
      ].join(' ').toLowerCase();
      
      return searchableText.includes(normalizedQuery);
    });
  }
}

export default new JournalEntriesStore();

