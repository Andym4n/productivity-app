/**
 * Time Block Store
 * 
 * IndexedDB store operations for time blocks
 */

import { BaseStore } from './baseStore.js';
import { parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

/**
 * TimeBlockStore class
 * Extends BaseStore with time block-specific operations
 */
class TimeBlockStore extends BaseStore {
  constructor() {
    super('timeBlocks');
  }

  /**
   * Get time blocks by date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Array of time blocks in the date range
   */
  async getByDateRange(startDate, endDate) {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const store = await this.getStore('readonly');
    const index = store.index('byStartTime');
    
    const range = IDBKeyRange.bound(startISO, endISO);
    const result = await this._toPromise(index.getAll(range));
    
    // Filter to ensure blocks actually fall within the range
    const blocks = (result || []).filter(block => {
      const blockStart = parseISO(block.startTime);
      const blockEnd = parseISO(block.endTime);
      // Block overlaps with range if it starts before range ends and ends after range starts
      return blockStart < end && blockEnd > start;
    });
    
    return blocks;
  }

  /**
   * Get time blocks for a specific date
   * @param {Date|string} date - Date to query
   * @returns {Promise<Array>} Array of time blocks for the date
   */
  async getByDate(date) {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);
    
    return this.getByDateRange(start, end);
  }

  /**
   * Get time blocks for a specific week
   * @param {Date|string} date - Any date within the week
   * @returns {Promise<Array>} Array of time blocks for the week
   */
  async getByWeek(date) {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;
    const start = startOfWeek(targetDate);
    const end = endOfWeek(targetDate);
    
    return this.getByDateRange(start, end);
  }

  /**
   * Get time blocks for a specific month
   * @param {Date|string} date - Any date within the month
   * @returns {Promise<Array>} Array of time blocks for the month
   */
  async getByMonth(date) {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;
    const start = startOfMonth(targetDate);
    const end = endOfMonth(targetDate);
    
    return this.getByDateRange(start, end);
  }

  /**
   * Get time blocks by project ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of time blocks for the project
   */
  async getByProjectId(projectId) {
    const store = await this.getStore('readonly');
    const index = store.index('byProjectId');
    
    const result = await this._toPromise(index.getAll(projectId));
    return result || [];
  }

  /**
   * Get time blocks by status
   * @param {string} status - Time block status
   * @returns {Promise<Array>} Array of time blocks with the specified status
   */
  async getByStatus(status) {
    const store = await this.getStore('readonly');
    const index = store.index('byStatus');
    
    const result = await this._toPromise(index.getAll(status));
    return result || [];
  }

  /**
   * Get time blocks by schedule ID
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<Array>} Array of time blocks for the schedule
   */
  async getByScheduleId(scheduleId) {
    const store = await this.getStore('readonly');
    const index = store.index('byScheduleId');
    
    const result = await this._toPromise(index.getAll(scheduleId));
    return result || [];
  }

  /**
   * Get time blocks by type
   * @param {string} type - Time block type
   * @returns {Promise<Array>} Array of time blocks of the specified type
   */
  async getByType(type) {
    const store = await this.getStore('readonly');
    const index = store.index('byType');
    
    const result = await this._toPromise(index.getAll(type));
    return result || [];
  }

  /**
   * Delete time blocks by schedule ID
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<number>} Number of deleted blocks
   */
  async deleteByScheduleId(scheduleId) {
    const blocks = await this.getByScheduleId(scheduleId);
    
    for (const block of blocks) {
      await this.delete(block.id);
    }
    
    return blocks.length;
  }
}

export default new TimeBlockStore();

