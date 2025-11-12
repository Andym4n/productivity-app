import googleCalendar from './googleCalendar.js';
import { getDatabase } from '../storage/index.js';
import eventsStore from '../storage/indexeddb/stores/eventsStore.js';
import { generateId } from '../utils/id.js';
import { detectEventContext } from './contextDetection.js';

/**
 * Calendar Sync Manager
 * Handles bidirectional synchronization between local events and Google Calendar
 * Implements incremental sync with sync tokens and last-write-wins conflict resolution
 */

const SYNC_METADATA_KEY = 'calendar_sync_metadata';
const DEFAULT_CALENDAR_ID = 'primary';

/**
 * CalendarSyncManager - Manages bidirectional calendar synchronization
 */
class CalendarSyncManager {
  constructor() {
    this.syncing = false;
    this.syncMetadata = null;
  }

  /**
   * Initialize the sync manager
   */
  async initialize() {
    await this.loadSyncMetadata();
  }

  /**
   * Load sync metadata from localStorage
   */
  async loadSyncMetadata() {
    const stored = localStorage.getItem(SYNC_METADATA_KEY);
    if (stored) {
      this.syncMetadata = JSON.parse(stored);
    } else {
      this.syncMetadata = {
        syncTokens: {}, // calendarId -> syncToken
        lastSync: {}, // calendarId -> timestamp
        failedSyncs: 0
      };
    }
  }

  /**
   * Save sync metadata to localStorage
   */
  async saveSyncMetadata() {
    localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(this.syncMetadata));
  }

  /**
   * Perform full synchronization (initial sync)
   * @param {string} [calendarId='primary'] - Calendar to sync
   * @param {Object} options - Sync options
   * @param {string} [options.timeMin] - Start time for sync window
   * @param {string} [options.timeMax] - End time for sync window
   * @returns {Promise<Object>} Sync results
   */
  async fullSync(calendarId = DEFAULT_CALENDAR_ID, options = {}) {
    console.log(`Starting full sync for calendar: ${calendarId}`);
    
    const results = {
      calendarId,
      type: 'full',
      added: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };

    try {
      let pageToken = null;
      let allEvents = [];

      // Fetch all events (with optional time window)
      do {
        const response = await googleCalendar.listEvents(calendarId, {
          pageToken,
          timeMin: options.timeMin,
          timeMax: options.timeMax,
          maxResults: 250, // Max allowed by API
          showDeleted: false // Don't include deleted events in full sync
        });

        allEvents = allEvents.concat(response.items || []);
        pageToken = response.nextPageToken;

        // Store sync token from last page
        if (!pageToken && response.nextSyncToken) {
          this.syncMetadata.syncTokens[calendarId] = response.nextSyncToken;
        }
      } while (pageToken);

      console.log(`Fetched ${allEvents.length} events from Google Calendar`);

      // Process events and update local storage
      for (const googleEvent of allEvents) {
        try {
          await this.processGoogleEvent(googleEvent, calendarId, results);
        } catch (error) {
          console.error(`Error processing event ${googleEvent.id}:`, error);
          results.errors.push({ eventId: googleEvent.id, error: error.message });
        }
      }

      // Push local changes after pulling from Google
      await this.pushLocalChanges(calendarId, results);

      // Update sync metadata
      this.syncMetadata.lastSync[calendarId] = Date.now();
      this.syncMetadata.failedSyncs = 0;
      await this.saveSyncMetadata();

      console.log('Full sync completed:', results);
      return results;

    } catch (error) {
      console.error('Full sync failed:', error);
      this.syncMetadata.failedSyncs++;
      await this.saveSyncMetadata();
      throw error;
    }
  }

  /**
   * Perform incremental synchronization using sync token
   * @param {string} [calendarId='primary'] - Calendar to sync
   * @returns {Promise<Object>} Sync results
   */
  async incrementalSync(calendarId = DEFAULT_CALENDAR_ID) {
    const syncToken = this.syncMetadata.syncTokens[calendarId];
    
    if (!syncToken) {
      console.log('No sync token found, performing full sync');
      return this.fullSync(calendarId);
    }

    console.log(`Starting incremental sync for calendar: ${calendarId}`);
    
    const results = {
      calendarId,
      type: 'incremental',
      added: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };

    try {
      let pageToken = null;
      let changes = [];

      // Fetch changes since last sync
      do {
        try {
          const response = await googleCalendar.listEvents(calendarId, {
            syncToken,
            pageToken,
            showDeleted: true // Include deleted events for sync
          });

          changes = changes.concat(response.items || []);
          pageToken = response.nextPageToken;

          // Store new sync token from last page
          if (!pageToken && response.nextSyncToken) {
            this.syncMetadata.syncTokens[calendarId] = response.nextSyncToken;
          }
        } catch (error) {
          // Handle 410 Gone error (sync token expired)
          if (error.message.includes('410') || error.message.includes('Sync token')) {
            console.warn('Sync token expired, clearing and performing full sync');
            delete this.syncMetadata.syncTokens[calendarId];
            await this.clearLocalEvents(calendarId);
            await this.saveSyncMetadata();
            return this.fullSync(calendarId);
          }
          throw error;
        }
      } while (pageToken);

      console.log(`Fetched ${changes.length} changes from Google Calendar`);

      // Process changes
      for (const googleEvent of changes) {
        try {
          await this.processGoogleEvent(googleEvent, calendarId, results);
        } catch (error) {
          console.error(`Error processing event ${googleEvent.id}:`, error);
          results.errors.push({ eventId: googleEvent.id, error: error.message });
        }
      }

      // Push local changes to Google
      await this.pushLocalChanges(calendarId, results);

      // Update sync metadata
      this.syncMetadata.lastSync[calendarId] = Date.now();
      this.syncMetadata.failedSyncs = 0;
      await this.saveSyncMetadata();

      console.log('Incremental sync completed:', results);
      return results;

    } catch (error) {
      console.error('Incremental sync failed:', error);
      this.syncMetadata.failedSyncs++;
      await this.saveSyncMetadata();
      throw error;
    }
  }

  /**
   * Process a Google Calendar event (add, update, or delete locally)
   * @param {Object} googleEvent - Event from Google Calendar
   * @param {string} calendarId - Calendar ID
   * @param {Object} results - Results object to update
   */
  async processGoogleEvent(googleEvent, calendarId, results) {
    // Check if event is deleted/cancelled
    if (googleEvent.status === 'cancelled') {
      await this.deleteLocalEvent(googleEvent.id, results);
      return;
    }

    // Get local event if exists
    const localEvents = await eventsStore.query('byGoogleEventId', googleEvent.id);
    const localEvent = localEvents.length > 0 ? localEvents[0] : null;

    if (!localEvent) {
      // New event from Google - add locally
      await this.createLocalEvent(googleEvent, calendarId, results);
    } else {
      // Event exists - check for conflicts and resolve
      await this.resolveConflict(localEvent, googleEvent, calendarId, results);
    }
  }

  /**
   * Create a local event from Google Calendar event
   * @param {Object} googleEvent - Event from Google Calendar
   * @param {string} calendarId - Calendar ID
   * @param {Object} results - Results object to update
   */
  async createLocalEvent(googleEvent, calendarId, results) {
    // Prepare event data for context detection
    const eventForDetection = {
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || '',
      startTime: googleEvent.start.dateTime || googleEvent.start.date,
      endTime: googleEvent.end.dateTime || googleEvent.end.date,
      location: googleEvent.location || '',
      attendees: googleEvent.attendees || [],
      googleCalendarId: calendarId
    };

    // Detect context using context detection service
    let detectedContext = 'personal'; // Default fallback
    try {
      detectedContext = await detectEventContext(eventForDetection);
    } catch (error) {
      console.warn('Failed to detect context for event, using default:', error);
    }

    const localEvent = {
      id: generateId(), // Generate unique ID for local storage
      googleEventId: googleEvent.id,
      googleCalendarId: calendarId,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || '',
      startTime: googleEvent.start.dateTime || googleEvent.start.date,
      endTime: googleEvent.end.dateTime || googleEvent.end.date,
      allDay: !googleEvent.start.dateTime,
      location: googleEvent.location || '',
      status: googleEvent.status,
      updated: new Date(googleEvent.updated).getTime(),
      synced: true,
      context: detectedContext, // Use detected context
      attendees: googleEvent.attendees || [],
      reminders: googleEvent.reminders || {},
      recurrence: googleEvent.recurrence || null,
      recurringEventId: googleEvent.recurringEventId || null
    };

    await eventsStore.create(localEvent);
    results.added++;
    console.log(`Created local event: ${googleEvent.id} with context: ${detectedContext}`);
  }

  /**
   * Resolve conflict between local and Google Calendar event
   * Uses last-write-wins strategy based on updated timestamps
   * @param {Object} localEvent - Local event
   * @param {Object} googleEvent - Event from Google Calendar
   * @param {string} calendarId - Calendar ID
   * @param {Object} results - Results object to update
   */
  async resolveConflict(localEvent, googleEvent, calendarId, results) {
    const googleUpdated = new Date(googleEvent.updated).getTime();
    const localUpdated = localEvent.updated;

    // Last-write-wins: compare timestamps
    if (googleUpdated > localUpdated) {
      // Google is newer - update local
      // Prepare event data for context detection
      const eventForDetection = {
        title: googleEvent.summary || 'Untitled Event',
        description: googleEvent.description || '',
        startTime: googleEvent.start.dateTime || googleEvent.start.date,
        endTime: googleEvent.end.dateTime || googleEvent.end.date,
        location: googleEvent.location || '',
        attendees: googleEvent.attendees || [],
        googleCalendarId: calendarId
      };

      // Detect context using context detection service
      let detectedContext = localEvent.context || 'personal'; // Preserve existing or default
      try {
        detectedContext = await detectEventContext(eventForDetection);
      } catch (error) {
        console.warn('Failed to detect context during conflict resolution, preserving existing:', error);
      }

      await eventsStore.update(localEvent.id, {
        title: googleEvent.summary || 'Untitled Event',
        description: googleEvent.description || '',
        startTime: googleEvent.start.dateTime || googleEvent.start.date,
        endTime: googleEvent.end.dateTime || googleEvent.end.date,
        allDay: !googleEvent.start.dateTime,
        location: googleEvent.location || '',
        status: googleEvent.status,
        updated: googleUpdated,
        synced: true,
        context: detectedContext, // Use detected context
        attendees: googleEvent.attendees || [],
        reminders: googleEvent.reminders || {},
        recurrence: googleEvent.recurrence || null
      });
      results.updated++;
      console.log(`Updated local event from Google: ${googleEvent.id} with context: ${detectedContext}`);
    } else if (localUpdated > googleUpdated && !localEvent.synced) {
      // Local is newer and not synced - push to Google
      await this.updateGoogleEvent(localEvent, calendarId);
      await eventsStore.update(localEvent.id, { synced: true });
      results.updated++;
      console.log(`Updated Google event from local: ${googleEvent.id}`);
    }
    // If timestamps are equal or local is synced, no action needed
  }

  /**
   * Delete local event
   * @param {string} googleEventId - Google event ID
   * @param {Object} results - Results object to update
   */
  async deleteLocalEvent(googleEventId, results) {
    const localEvents = await eventsStore.query('byGoogleEventId', googleEventId);
    if (localEvents.length > 0) {
      await eventsStore.delete(localEvents[0].id);
      results.deleted++;
      console.log(`Deleted local event: ${googleEventId}`);
    }
  }

  /**
   * Push local changes to Google Calendar
   * @param {string} calendarId - Calendar ID
   * @param {Object} results - Results object to update
   */
  async pushLocalChanges(calendarId, results) {
    // Get all unsynced local events
    const allEvents = await eventsStore.getAll();
    const unsyncedEvents = allEvents.filter(
      event => !event.synced && event.googleCalendarId === calendarId
    );

    console.log(`Pushing ${unsyncedEvents.length} local changes to Google`);

    for (const localEvent of unsyncedEvents) {
      try {
        if (!localEvent.googleEventId) {
          // New local event - create in Google
          await this.createGoogleEvent(localEvent, calendarId);
        } else {
          // Modified local event - update in Google
          await this.updateGoogleEvent(localEvent, calendarId);
        }
        
        // Mark as synced
        await eventsStore.update(localEvent.id, { synced: true });
        
      } catch (error) {
        console.error(`Error pushing event ${localEvent.id}:`, error);
        results.errors.push({ eventId: localEvent.id, error: error.message });
      }
    }
  }

  /**
   * Create event in Google Calendar
   * @param {Object} localEvent - Local event to create
   * @param {string} calendarId - Calendar ID
   */
  async createGoogleEvent(localEvent, calendarId) {
    const googleEvent = {
      summary: localEvent.title,
      description: localEvent.description,
      location: localEvent.location,
      start: localEvent.allDay
        ? { date: localEvent.startTime.split('T')[0] }
        : { dateTime: localEvent.startTime },
      end: localEvent.allDay
        ? { date: localEvent.endTime.split('T')[0] }
        : { dateTime: localEvent.endTime },
      attendees: localEvent.attendees,
      reminders: localEvent.reminders,
      recurrence: localEvent.recurrence
    };

    const created = await googleCalendar.createEvent(calendarId, googleEvent);
    
    // Update local event with Google ID
    await eventsStore.update(localEvent.id, {
      googleEventId: created.id,
      googleCalendarId: calendarId,
      updated: new Date(created.updated).getTime()
    });

    console.log(`Created Google event: ${created.id}`);
  }

  /**
   * Update event in Google Calendar
   * @param {Object} localEvent - Local event to update
   * @param {string} calendarId - Calendar ID
   */
  async updateGoogleEvent(localEvent, calendarId) {
    const googleEvent = {
      summary: localEvent.title,
      description: localEvent.description,
      location: localEvent.location,
      start: localEvent.allDay
        ? { date: localEvent.startTime.split('T')[0] }
        : { dateTime: localEvent.startTime },
      end: localEvent.allDay
        ? { date: localEvent.endTime.split('T')[0] }
        : { dateTime: localEvent.endTime },
      attendees: localEvent.attendees,
      reminders: localEvent.reminders,
      recurrence: localEvent.recurrence
    };

    const updated = await googleCalendar.updateEvent(
      calendarId,
      localEvent.googleEventId,
      googleEvent
    );

    // Update local timestamp
    await eventsStore.update(localEvent.id, {
      updated: new Date(updated.updated).getTime()
    });

    console.log(`Updated Google event: ${updated.id}`);
  }

  /**
   * Clear all local events for a calendar
   * @param {string} calendarId - Calendar ID
   */
  async clearLocalEvents(calendarId) {
    const allEvents = await eventsStore.getAll();
    const calendarEvents = allEvents.filter(
      event => event.googleCalendarId === calendarId
    );
    
    await Promise.all(
      calendarEvents.map(event => eventsStore.delete(event.id))
    );
    
    console.log(`Cleared ${calendarEvents.length} local events for calendar ${calendarId}`);
  }

  /**
   * Sync all calendars
   * @returns {Promise<Array>} Array of sync results
   */
  async syncAll() {
    if (this.syncing) {
      console.warn('Sync already in progress');
      return [];
    }

    this.syncing = true;
    const allResults = [];

    try {
      // Get all user's calendars
      const calendars = await googleCalendar.listCalendars();
      
      // Sync each calendar
      for (const calendar of calendars) {
        try {
          const result = await this.incrementalSync(calendar.id);
          allResults.push(result);
        } catch (error) {
          console.error(`Error syncing calendar ${calendar.id}:`, error);
          allResults.push({
            calendarId: calendar.id,
            error: error.message
          });
        }
      }

      return allResults;

    } finally {
      this.syncing = false;
    }
  }

  /**
   * Get sync status
   * @returns {Object} Sync status information
   */
  getSyncStatus() {
    return {
      syncing: this.syncing,
      lastSync: this.syncMetadata.lastSync,
      failedSyncs: this.syncMetadata.failedSyncs,
      hasSyncTokens: Object.keys(this.syncMetadata.syncTokens).length > 0
    };
  }
}

// Export singleton instance
export const calendarSync = new CalendarSyncManager();

export default calendarSync;

