/**
 * Work Schedule Store
 * 
 * IndexedDB store operations for work schedules
 */

import { BaseStore } from './baseStore.js';

/**
 * WorkScheduleStore class
 * Extends BaseStore with work schedule-specific operations
 */
class WorkScheduleStore extends BaseStore {
  constructor() {
    super('workSchedule');
  }

  /**
   * Get all active work schedules
   * @returns {Promise<Array>} Array of active work schedules
   */
  async getActiveSchedules() {
    // IndexedDB doesn't reliably support boolean values as index keys
    // So we get all schedules and filter in JavaScript instead
    const allSchedules = await this.getAll();
    return allSchedules.filter(schedule => schedule.isActive === true) || [];
  }

  /**
   * Get schedules by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of work schedules for the user
   */
  async getByUserId(userId) {
    const store = await this.getStore('readonly');
    const index = store.index('byUserId');
    
    const result = await this._toPromise(index.getAll(userId));
    return result || [];
  }

  /**
   * Get schedules by type
   * @param {string} scheduleType - Schedule type
   * @returns {Promise<Array>} Array of work schedules of the specified type
   */
  async getByType(scheduleType) {
    const store = await this.getStore('readonly');
    const index = store.index('byScheduleType');
    
    const result = await this._toPromise(index.getAll(scheduleType));
    return result || [];
  }

  /**
   * Get the currently active schedule (most recently updated active schedule)
   * @returns {Promise<Object|null>} Active schedule or null
   */
  async getCurrentSchedule() {
    const activeSchedules = await this.getActiveSchedules();
    
    if (activeSchedules.length === 0) {
      return null;
    }

    // Return the most recently updated active schedule
    return activeSchedules.sort((a, b) => {
      const dateA = new Date(a.updatedAt);
      const dateB = new Date(b.updatedAt);
      return dateB - dateA;
    })[0];
  }
}

export default new WorkScheduleStore();

