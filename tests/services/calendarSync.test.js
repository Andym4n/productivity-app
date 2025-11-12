import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initDatabase, closeDatabase } from '../../src/storage/indexeddb/database.js';
import calendarSync from '../../src/services/calendarSync.js';
import googleCalendar from '../../src/services/googleCalendar.js';
import eventsStore from '../../src/storage/indexeddb/stores/eventsStore.js';
import { generateId } from '../../src/utils/id.js';

// Mock Google Calendar service
vi.mock('../../src/services/googleCalendar.js', () => ({
  default: {
    listCalendars: vi.fn(),
    listEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn()
  }
}));

describe('CalendarSyncManager', () => {
  beforeEach(async () => {
    // Clear localStorage
    localStorage.clear();
    
    // Initialize database
    await initDatabase();
    
    // Initialize sync manager
    await calendarSync.initialize();
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up events
    const allEvents = await eventsStore.getAll();
    await Promise.all(allEvents.map(event => eventsStore.delete(event.id)));
    
    // Close database
    await closeDatabase();
    
    // Clear localStorage
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with empty metadata', async () => {
      const status = calendarSync.getSyncStatus();
      expect(status.syncing).toBe(false);
      expect(status.hasSyncTokens).toBe(false);
      expect(status.failedSyncs).toBe(0);
    });

    it('should load existing sync metadata', async () => {
      const metadata = {
        syncTokens: { primary: 'test-token' },
        lastSync: { primary: Date.now() },
        failedSyncs: 0
      };
      localStorage.setItem('calendar_sync_metadata', JSON.stringify(metadata));
      
      await calendarSync.initialize();
      const status = calendarSync.getSyncStatus();
      expect(status.hasSyncTokens).toBe(true);
    });
  });

  describe('Full Sync', () => {
    it('should perform full sync and store events locally', async () => {
      const mockEvents = [
        {
          id: 'event1',
          summary: 'Test Event 1',
          description: 'Description 1',
          start: { dateTime: '2024-01-01T10:00:00Z' },
          end: { dateTime: '2024-01-01T11:00:00Z' },
          status: 'confirmed',
          updated: '2024-01-01T09:00:00Z'
        },
        {
          id: 'event2',
          summary: 'Test Event 2',
          start: { dateTime: '2024-01-02T14:00:00Z' },
          end: { dateTime: '2024-01-02T15:00:00Z' },
          status: 'confirmed',
          updated: '2024-01-02T13:00:00Z'
        }
      ];

      googleCalendar.listEvents.mockResolvedValue({
        items: mockEvents,
        nextSyncToken: 'sync-token-123'
      });

      const results = await calendarSync.fullSync('primary');

      expect(results.type).toBe('full');
      expect(results.added).toBe(2);
      expect(results.updated).toBe(0);
      expect(results.deleted).toBe(0);
      expect(results.errors).toHaveLength(0);

      // Verify events were stored locally
      const localEvents = await eventsStore.getAll();
      expect(localEvents).toHaveLength(2);
      
      // Find events by googleEventId (order is not guaranteed)
      const event1 = localEvents.find(e => e.googleEventId === 'event1');
      const event2 = localEvents.find(e => e.googleEventId === 'event2');
      
      expect(event1).toBeDefined();
      expect(event1.title).toBe('Test Event 1');
      expect(event1.synced).toBe(true);
      
      expect(event2).toBeDefined();
      expect(event2.title).toBe('Test Event 2');
      expect(event2.synced).toBe(true);

      // Verify sync token was stored
      const status = calendarSync.getSyncStatus();
      expect(status.hasSyncTokens).toBe(true);
    });

    it('should handle pagination during full sync', async () => {
      const page1Events = Array.from({ length: 250 }, (_, i) => ({
        id: `event-${i}`,
        summary: `Event ${i}`,
        start: { dateTime: `2024-01-01T${10 + i}:00:00Z` },
        end: { dateTime: `2024-01-01T${11 + i}:00:00Z` },
        status: 'confirmed',
        updated: '2024-01-01T09:00:00Z'
      }));

      const page2Events = [
        {
          id: 'event-250',
          summary: 'Event 250',
          start: { dateTime: '2024-01-01T20:00:00Z' },
          end: { dateTime: '2024-01-01T21:00:00Z' },
          status: 'confirmed',
          updated: '2024-01-01T19:00:00Z'
        }
      ];

      googleCalendar.listEvents
        .mockResolvedValueOnce({
          items: page1Events,
          nextPageToken: 'page-token-1'
        })
        .mockResolvedValueOnce({
          items: page2Events,
          nextSyncToken: 'sync-token-123'
        });

      const results = await calendarSync.fullSync('primary');

      expect(results.added).toBe(251);
      expect(googleCalendar.listEvents).toHaveBeenCalledTimes(2);
    });

    it('should handle time window options', async () => {
      const options = {
        timeMin: '2024-01-01T00:00:00Z',
        timeMax: '2024-01-31T23:59:59Z'
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [],
        nextSyncToken: 'sync-token-123'
      });

      await calendarSync.fullSync('primary', options);

      expect(googleCalendar.listEvents).toHaveBeenCalledWith(
        'primary',
        expect.objectContaining({
          timeMin: options.timeMin,
          timeMax: options.timeMax
        })
      );
    });

    it('should handle errors during full sync', async () => {
      googleCalendar.listEvents.mockRejectedValue(new Error('API Error'));

      await expect(calendarSync.fullSync('primary')).rejects.toThrow('API Error');

      const status = calendarSync.getSyncStatus();
      expect(status.failedSyncs).toBeGreaterThan(0);
    });

    it('should handle all-day events', async () => {
      const mockEvent = {
        id: 'event1',
        summary: 'All Day Event',
        start: { date: '2024-01-01' },
        end: { date: '2024-01-02' },
        status: 'confirmed',
        updated: '2024-01-01T09:00:00Z'
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [mockEvent],
        nextSyncToken: 'sync-token-123'
      });

      await calendarSync.fullSync('primary');

      const localEvents = await eventsStore.getAll();
      expect(localEvents[0].allDay).toBe(true);
      expect(localEvents[0].startTime).toBe('2024-01-01');
    });
  });

  describe('Incremental Sync', () => {
    beforeEach(() => {
      // Set up sync token
      const metadata = {
        syncTokens: { primary: 'existing-token' },
        lastSync: { primary: Date.now() },
        failedSyncs: 0
      };
      localStorage.setItem('calendar_sync_metadata', JSON.stringify(metadata));
      calendarSync.initialize();
    });

    it('should perform incremental sync with sync token', async () => {
      const mockChanges = [
        {
          id: 'event1',
          summary: 'Updated Event',
          start: { dateTime: '2024-01-01T10:00:00Z' },
          end: { dateTime: '2024-01-01T11:00:00Z' },
          status: 'confirmed',
          updated: '2024-01-01T10:00:00Z'
        }
      ];

      googleCalendar.listEvents.mockResolvedValue({
        items: mockChanges,
        nextSyncToken: 'new-sync-token'
      });

      const results = await calendarSync.incrementalSync('primary');

      expect(results.type).toBe('incremental');
      expect(results.added).toBe(1);
      expect(googleCalendar.listEvents).toHaveBeenCalledWith(
        'primary',
        expect.objectContaining({
          syncToken: 'existing-token',
          showDeleted: true
        })
      );
    });

    it('should fall back to full sync if no sync token exists', async () => {
      localStorage.clear();
      await calendarSync.initialize();

      googleCalendar.listEvents.mockResolvedValue({
        items: [],
        nextSyncToken: 'sync-token-123'
      });

      await calendarSync.incrementalSync('primary');

      // Should have called fullSync logic (no syncToken in request)
      expect(googleCalendar.listEvents).toHaveBeenCalledWith(
        'primary',
        expect.not.objectContaining({ syncToken: expect.anything() })
      );
    });

    it('should handle expired sync token (410 error)', async () => {
      const error = new Error('Sync token is no longer valid, a full sync is required. (410)');
      
      googleCalendar.listEvents
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          items: [],
          nextSyncToken: 'new-sync-token'
        });

      // Create a local event first
      await eventsStore.create({
        id: generateId(),
        googleEventId: 'event1',
        googleCalendarId: 'primary',
        title: 'Local Event',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        synced: true
      });

      const results = await calendarSync.incrementalSync('primary');

      // Should have cleared local events and performed full sync
      expect(results.type).toBe('full');
      const localEvents = await eventsStore.getAll();
      expect(localEvents).toHaveLength(0);
    });

    it('should handle deleted events from incremental sync', async () => {
      // Create a local event first
      await eventsStore.create({
        id: generateId(),
        googleEventId: 'event1',
        googleCalendarId: 'primary',
        title: 'Event to Delete',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        synced: true
      });

      const deletedEvent = {
        id: 'event1',
        status: 'cancelled',
        updated: '2024-01-01T11:00:00Z'
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [deletedEvent],
        nextSyncToken: 'new-sync-token'
      });

      const results = await calendarSync.incrementalSync('primary');

      expect(results.deleted).toBe(1);
      const localEvents = await eventsStore.getAll();
      expect(localEvents).toHaveLength(0);
    });

    it('should handle pagination during incremental sync', async () => {
      const page1 = Array.from({ length: 250 }, (_, i) => ({
        id: `event-${i}`,
        summary: `Event ${i}`,
        start: { dateTime: `2024-01-01T${10 + i}:00:00Z` },
        end: { dateTime: `2024-01-01T${11 + i}:00:00Z` },
        status: 'confirmed',
        updated: '2024-01-01T09:00:00Z'
      }));

      const page2 = [
        {
          id: 'event-250',
          summary: 'Event 250',
          start: { dateTime: '2024-01-01T20:00:00Z' },
          end: { dateTime: '2024-01-01T21:00:00Z' },
          status: 'confirmed',
          updated: '2024-01-01T19:00:00Z'
        }
      ];

      googleCalendar.listEvents
        .mockResolvedValueOnce({
          items: page1,
          nextPageToken: 'page-token-1'
        })
        .mockResolvedValueOnce({
          items: page2,
          nextSyncToken: 'sync-token-123'
        });

      const results = await calendarSync.incrementalSync('primary');

      expect(results.added).toBe(251);
      expect(googleCalendar.listEvents).toHaveBeenCalledTimes(2);
    });
  });

  describe('Conflict Resolution', () => {
    it('should update local event when Google event is newer', async () => {
      // Create local event
      const localEvent = await eventsStore.create({
        id: generateId(),
        googleEventId: 'event1',
        googleCalendarId: 'primary',
        title: 'Old Title',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        updated: new Date('2024-01-01T09:00:00Z').getTime(),
        synced: true
      });

      const googleEvent = {
        id: 'event1',
        summary: 'New Title',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        status: 'confirmed',
        updated: '2024-01-01T10:00:00Z' // Newer than local
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [googleEvent],
        nextSyncToken: 'sync-token-123'
      });

      await calendarSync.incrementalSync('primary');

      const updated = await eventsStore.get(localEvent.id);
      expect(updated.title).toBe('New Title');
      expect(updated.updated).toBe(new Date('2024-01-01T10:00:00Z').getTime());
    });

    it('should push local event when local is newer and not synced', async () => {
      // Create local event that's newer
      const localEvent = await eventsStore.create({
        id: generateId(),
        googleEventId: 'event1',
        googleCalendarId: 'primary',
        title: 'Local Update',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        updated: new Date('2024-01-01T11:00:00Z').getTime(),
        synced: false // Not synced
      });

      const googleEvent = {
        id: 'event1',
        summary: 'Google Title',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        status: 'confirmed',
        updated: '2024-01-01T09:00:00Z' // Older than local
      };

      const updatedGoogleEvent = {
        ...googleEvent,
        summary: 'Local Update',
        updated: '2024-01-01T11:00:00Z'
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [googleEvent],
        nextSyncToken: 'sync-token-123'
      });

      googleCalendar.updateEvent.mockResolvedValue(updatedGoogleEvent);

      await calendarSync.incrementalSync('primary');

      expect(googleCalendar.updateEvent).toHaveBeenCalled();
      const updated = await eventsStore.get(localEvent.id);
      expect(updated.synced).toBe(true);
    });

    it('should not update when timestamps are equal', async () => {
      const timestamp = new Date('2024-01-01T10:00:00Z').getTime();
      
      const localEvent = await eventsStore.create({
        id: generateId(),
        googleEventId: 'event1',
        googleCalendarId: 'primary',
        title: 'Local Title',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        updated: timestamp,
        synced: true
      });

      const googleEvent = {
        id: 'event1',
        summary: 'Google Title',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        status: 'confirmed',
        updated: '2024-01-01T10:00:00Z' // Same timestamp
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [googleEvent],
        nextSyncToken: 'sync-token-123'
      });

      await calendarSync.incrementalSync('primary');

      const updated = await eventsStore.get(localEvent.id);
      expect(updated.title).toBe('Local Title'); // Should remain unchanged
    });
  });

  describe('Push Local Changes', () => {
    it('should create new Google event for unsynced local event', async () => {
      const localEvent = await eventsStore.create({
        id: generateId(),
        googleCalendarId: 'primary',
        title: 'New Local Event',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        synced: false
      });

      const createdGoogleEvent = {
        id: 'google-event-123',
        summary: 'New Local Event',
        updated: '2024-01-01T10:00:00Z'
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [],
        nextSyncToken: 'sync-token-123'
      });

      googleCalendar.createEvent.mockResolvedValue(createdGoogleEvent);

      await calendarSync.incrementalSync('primary');

      expect(googleCalendar.createEvent).toHaveBeenCalled();
      const updated = await eventsStore.get(localEvent.id);
      expect(updated.googleEventId).toBe('google-event-123');
      expect(updated.synced).toBe(true);
    });

    it('should update Google event for modified unsynced local event', async () => {
      const localEvent = await eventsStore.create({
        id: generateId(),
        googleEventId: 'google-event-123',
        googleCalendarId: 'primary',
        title: 'Updated Title',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        synced: false
      });

      const updatedGoogleEvent = {
        id: 'google-event-123',
        summary: 'Updated Title',
        updated: '2024-01-01T11:00:00Z'
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [],
        nextSyncToken: 'sync-token-123'
      });

      googleCalendar.updateEvent.mockResolvedValue(updatedGoogleEvent);

      await calendarSync.incrementalSync('primary');

      expect(googleCalendar.updateEvent).toHaveBeenCalledWith(
        'primary',
        'google-event-123',
        expect.objectContaining({
          summary: 'Updated Title'
        })
      );
      
      const updated = await eventsStore.get(localEvent.id);
      expect(updated.synced).toBe(true);
    });

    it('should handle all-day events when pushing', async () => {
      const localEvent = await eventsStore.create({
        id: generateId(),
        googleCalendarId: 'primary',
        title: 'All Day Event',
        startTime: '2024-01-01',
        endTime: '2024-01-02',
        allDay: true,
        synced: false
      });

      googleCalendar.listEvents.mockResolvedValue({
        items: [],
        nextSyncToken: 'sync-token-123'
      });

      googleCalendar.createEvent.mockResolvedValue({
        id: 'google-event-123',
        updated: '2024-01-01T00:00:00Z'
      });

      await calendarSync.incrementalSync('primary');

      expect(googleCalendar.createEvent).toHaveBeenCalledWith(
        'primary',
        expect.objectContaining({
          start: { date: '2024-01-01' },
          end: { date: '2024-01-02' }
        })
      );
    });

    it('should track errors when pushing fails', async () => {
      const localEvent = await eventsStore.create({
        id: generateId(),
        googleCalendarId: 'primary',
        title: 'Failing Event',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        synced: false
      });

      googleCalendar.listEvents.mockResolvedValue({
        items: [],
        nextSyncToken: 'sync-token-123'
      });

      googleCalendar.createEvent.mockRejectedValue(new Error('API Error'));

      const results = await calendarSync.incrementalSync('primary');

      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].eventId).toBe(localEvent.id);
      expect(results.errors[0].error).toBe('API Error');
    });
  });

  describe('Sync All Calendars', () => {
    it('should sync all calendars', async () => {
      const calendars = [
        { id: 'primary', summary: 'Primary Calendar' },
        { id: 'calendar2', summary: 'Secondary Calendar' }
      ];

      googleCalendar.listCalendars.mockResolvedValue(calendars);
      googleCalendar.listEvents.mockResolvedValue({
        items: [],
        nextSyncToken: 'sync-token-123'
      });

      const results = await calendarSync.syncAll();

      expect(results).toHaveLength(2);
      expect(googleCalendar.listEvents).toHaveBeenCalledTimes(2);
    });

    it('should handle errors for individual calendars', async () => {
      const calendars = [
        { id: 'primary', summary: 'Primary Calendar' },
        { id: 'calendar2', summary: 'Secondary Calendar' }
      ];

      googleCalendar.listCalendars.mockResolvedValue(calendars);
      googleCalendar.listEvents
        .mockResolvedValueOnce({
          items: [],
          nextSyncToken: 'sync-token-123'
        })
        .mockRejectedValueOnce(new Error('Calendar Error'));

      const results = await calendarSync.syncAll();

      expect(results).toHaveLength(2);
      expect(results[1].error).toBe('Calendar Error');
    });

    it('should prevent concurrent syncs', async () => {
      googleCalendar.listCalendars.mockResolvedValue([
        { id: 'primary', summary: 'Primary Calendar' }
      ]);

      // Start first sync
      const sync1 = calendarSync.syncAll();

      // Try to start second sync immediately
      const sync2 = calendarSync.syncAll();

      const results2 = await sync2;
      expect(results2).toHaveLength(0); // Should return empty array

      // Wait for first sync to complete
      await sync1;
    });
  });

  describe('Sync Status', () => {
    it('should return current sync status', () => {
      const status = calendarSync.getSyncStatus();
      
      expect(status).toHaveProperty('syncing');
      expect(status).toHaveProperty('lastSync');
      expect(status).toHaveProperty('failedSyncs');
      expect(status).toHaveProperty('hasSyncTokens');
    });

    it('should update lastSync after successful sync', async () => {
      googleCalendar.listEvents.mockResolvedValue({
        items: [],
        nextSyncToken: 'sync-token-123'
      });

      await calendarSync.fullSync('primary');

      const status = calendarSync.getSyncStatus();
      expect(status.lastSync.primary).toBeDefined();
      expect(status.lastSync.primary).toBeGreaterThan(0);
    });
  });
});

