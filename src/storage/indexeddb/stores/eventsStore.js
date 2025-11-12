import { BaseStore } from './baseStore.js';

/**
 * Events store - handles CRUD operations for calendar events
 */
export class EventsStore extends BaseStore {
  constructor() {
    super('events');
  }

  /**
   * Gets events within a date range
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Promise<Array>} Promise resolving to filtered events
   */
  async getByDateRange(startDate, endDate) {
    const range = IDBKeyRange.bound(startDate, endDate);
    return await this.query('byStartTime', range);
  }

  /**
   * Gets events filtered by context
   * @param {string} context - Event context ('work' | 'personal')
   * @returns {Promise<Array>} Promise resolving to filtered events
   */
  async getByContext(context) {
    return await this.query('byContext', context);
  }

  /**
   * Gets events that need syncing with Google Calendar
   * @returns {Promise<Array>} Promise resolving to unsynced events
   */
  async getUnsynced() {
    return await this.query('bySynced', false);
  }

  /**
   * Gets an event by Google Calendar event ID
   * @param {string} googleEventId - Google Calendar event ID
   * @returns {Promise<Object|null>} Promise resolving to the event or null
   */
  async getByGoogleEventId(googleEventId) {
    return await this.queryOne('byGoogleEventId', googleEventId);
  }

  /**
   * Marks an event as synced
   * @param {string} eventId - Event ID to mark as synced
   * @returns {Promise<Object>} Promise resolving to the updated event
   */
  async markSynced(eventId) {
    return await this.update(eventId, {
      synced: true,
      lastSyncedAt: new Date().toISOString()
    });
  }
}

export default new EventsStore();

