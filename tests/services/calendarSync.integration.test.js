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

describe('Calendar Sync Integration', () => {
  beforeEach(async () => {
    localStorage.clear();
    await initDatabase();
    await calendarSync.initialize();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    const allEvents = await eventsStore.getAll();
    await Promise.all(allEvents.map(event => eventsStore.delete(event.id)));
    await closeDatabase();
    localStorage.clear();
  });

  describe('Complete Sync Workflow', () => {
    it('should perform complete bidirectional sync cycle', async () => {
      // Initial state: Google has 2 events, local has 1 unsynced event
      const googleEvents = [
        {
          id: 'google-event-1',
          summary: 'Google Event 1',
          start: { dateTime: '2024-01-01T10:00:00Z' },
          end: { dateTime: '2024-01-01T11:00:00Z' },
          status: 'confirmed',
          updated: '2024-01-01T09:00:00Z'
        },
        {
          id: 'google-event-2',
          summary: 'Google Event 2',
          start: { dateTime: '2024-01-02T14:00:00Z' },
          end: { dateTime: '2024-01-02T15:00:00Z' },
          status: 'confirmed',
          updated: '2024-01-02T13:00:00Z'
        }
      ];

      // Create local unsynced event
      const localEvent = await eventsStore.create({
        id: generateId(),
        googleCalendarId: 'primary',
        title: 'Local Event',
        startTime: '2024-01-03T10:00:00Z',
        endTime: '2024-01-03T11:00:00Z',
        synced: false
      });

      // Mock Google API responses
      googleCalendar.listEvents.mockResolvedValue({
        items: googleEvents,
        nextSyncToken: 'sync-token-123'
      });

      const createdGoogleEvent = {
        id: 'google-event-3',
        summary: 'Local Event',
        updated: '2024-01-03T10:00:00Z'
      };

      googleCalendar.createEvent.mockResolvedValue(createdGoogleEvent);

      // Perform incremental sync
      const results = await calendarSync.incrementalSync('primary');

      // Verify pull phase: Google events added locally
      expect(results.added).toBe(2);
      const allLocalEvents = await eventsStore.getAll();
      expect(allLocalEvents).toHaveLength(3); // 2 from Google + 1 local

      // Verify push phase: Local event created in Google
      expect(googleCalendar.createEvent).toHaveBeenCalled();
      const syncedLocalEvent = await eventsStore.get(localEvent.id);
      expect(syncedLocalEvent.googleEventId).toBe('google-event-3');
      expect(syncedLocalEvent.synced).toBe(true);

      // Verify sync token stored
      const status = calendarSync.getSyncStatus();
      expect(status.hasSyncTokens).toBe(true);
    });

    it('should handle conflict resolution in bidirectional sync', async () => {
      // Create local event that exists in Google
      const localEvent = await eventsStore.create({
        id: generateId(),
        googleEventId: 'google-event-1',
        googleCalendarId: 'primary',
        title: 'Local Updated Title',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        updated: new Date('2024-01-01T11:00:00Z').getTime(), // Newer
        synced: false
      });

      // Google has older version
      const googleEvent = {
        id: 'google-event-1',
        summary: 'Google Original Title',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        status: 'confirmed',
        updated: '2024-01-01T09:00:00Z' // Older
      };

      const updatedGoogleEvent = {
        ...googleEvent,
        summary: 'Local Updated Title',
        updated: '2024-01-01T11:00:00Z'
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [googleEvent],
        nextSyncToken: 'sync-token-123'
      });

      googleCalendar.updateEvent.mockResolvedValue(updatedGoogleEvent);

      const results = await calendarSync.incrementalSync('primary');

      // Local should win and push to Google
      expect(googleCalendar.updateEvent).toHaveBeenCalled();
      const updated = await eventsStore.get(localEvent.id);
      expect(updated.synced).toBe(true);
      expect(results.updated).toBe(1);
    });

    it('should handle deleted events from Google during sync', async () => {
      // Create local event that matches Google event
      const localEvent = await eventsStore.create({
        id: generateId(),
        googleEventId: 'google-event-1',
        googleCalendarId: 'primary',
        title: 'Event to Delete',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        synced: true
      });

      // Google reports event as deleted
      const deletedEvent = {
        id: 'google-event-1',
        status: 'cancelled',
        updated: '2024-01-01T12:00:00Z'
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [deletedEvent],
        nextSyncToken: 'sync-token-123'
      });

      const results = await calendarSync.incrementalSync('primary');

      // Local event should be deleted
      expect(results.deleted).toBe(1);
      const remainingEvents = await eventsStore.getAll();
      expect(remainingEvents).toHaveLength(0);
    });

    it('should handle multiple calendars sync', async () => {
      const calendars = [
        { id: 'primary', summary: 'Primary Calendar' },
        { id: 'work', summary: 'Work Calendar' }
      ];

      const primaryEvents = [
        {
          id: 'event-1',
          summary: 'Primary Event',
          start: { dateTime: '2024-01-01T10:00:00Z' },
          end: { dateTime: '2024-01-01T11:00:00Z' },
          status: 'confirmed',
          updated: '2024-01-01T09:00:00Z'
        }
      ];

      const workEvents = [
        {
          id: 'event-2',
          summary: 'Work Event',
          start: { dateTime: '2024-01-01T14:00:00Z' },
          end: { dateTime: '2024-01-01T15:00:00Z' },
          status: 'confirmed',
          updated: '2024-01-01T13:00:00Z'
        }
      ];

      googleCalendar.listCalendars.mockResolvedValue(calendars);
      googleCalendar.listEvents
        .mockResolvedValueOnce({
          items: primaryEvents,
          nextSyncToken: 'sync-token-primary'
        })
        .mockResolvedValueOnce({
          items: workEvents,
          nextSyncToken: 'sync-token-work'
        });

      const results = await calendarSync.syncAll();

      expect(results).toHaveLength(2);
      expect(results[0].calendarId).toBe('primary');
      expect(results[1].calendarId).toBe('work');

      // Verify events stored with correct calendar IDs
      const allEvents = await eventsStore.getAll();
      expect(allEvents).toHaveLength(2);
      expect(allEvents.find(e => e.googleCalendarId === 'primary')).toBeDefined();
      expect(allEvents.find(e => e.googleCalendarId === 'work')).toBeDefined();
    });

    it('should maintain sync state across multiple syncs', async () => {
      // First sync
      googleCalendar.listEvents.mockResolvedValueOnce({
        items: [
          {
            id: 'event-1',
            summary: 'Event 1',
            start: { dateTime: '2024-01-01T10:00:00Z' },
            end: { dateTime: '2024-01-01T11:00:00Z' },
            status: 'confirmed',
            updated: '2024-01-01T09:00:00Z'
          }
        ],
        nextSyncToken: 'sync-token-1'
      });

      await calendarSync.fullSync('primary');

      // Second sync - should use incremental
      googleCalendar.listEvents.mockResolvedValueOnce({
        items: [
          {
            id: 'event-2',
            summary: 'Event 2',
            start: { dateTime: '2024-01-02T10:00:00Z' },
            end: { dateTime: '2024-01-02T11:00:00Z' },
            status: 'confirmed',
            updated: '2024-01-02T09:00:00Z'
          }
        ],
        nextSyncToken: 'sync-token-2'
      });

      const results = await calendarSync.incrementalSync('primary');

      // Should use sync token from first sync
      expect(googleCalendar.listEvents).toHaveBeenCalledWith(
        'primary',
        expect.objectContaining({
          syncToken: 'sync-token-1'
        })
      );

      expect(results.type).toBe('incremental');
      expect(results.added).toBe(1);

      // Verify both events exist
      const allEvents = await eventsStore.getAll();
      expect(allEvents).toHaveLength(2);
    });

    it('should handle sync errors gracefully and continue', async () => {
      // Create local unsynced event
      await eventsStore.create({
        id: generateId(),
        googleCalendarId: 'primary',
        title: 'Local Event',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        synced: false
      });

      // Google API fails on create
      googleCalendar.listEvents.mockResolvedValue({
        items: [],
        nextSyncToken: 'sync-token-123'
      });

      googleCalendar.createEvent.mockRejectedValue(new Error('API Error'));

      const results = await calendarSync.incrementalSync('primary');

      // Should complete sync but track error
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].error).toBe('API Error');

      // Sync metadata should still be updated
      const status = calendarSync.getSyncStatus();
      expect(status.hasSyncTokens).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty calendar sync', async () => {
      googleCalendar.listEvents.mockResolvedValue({
        items: [],
        nextSyncToken: 'sync-token-123'
      });

      const results = await calendarSync.fullSync('primary');

      expect(results.added).toBe(0);
      expect(results.errors).toHaveLength(0);
      const events = await eventsStore.getAll();
      expect(events).toHaveLength(0);
    });

    it('should handle events without summary', async () => {
      const eventWithoutSummary = {
        id: 'event-1',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        status: 'confirmed',
        updated: '2024-01-01T09:00:00Z'
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [eventWithoutSummary],
        nextSyncToken: 'sync-token-123'
      });

      await calendarSync.fullSync('primary');

      const events = await eventsStore.getAll();
      expect(events[0].title).toBe('Untitled Event');
    });

    it('should handle events with all optional fields', async () => {
      const fullEvent = {
        id: 'event-1',
        summary: 'Full Event',
        description: 'Description',
        location: 'Location',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        status: 'confirmed',
        updated: '2024-01-01T09:00:00Z',
        attendees: [
          { email: 'attendee@example.com', displayName: 'Attendee' }
        ],
        reminders: {
          useDefault: false,
          overrides: [{ method: 'email', minutes: 15 }]
        },
        recurrence: ['RRULE:FREQ=DAILY;COUNT=5']
      };

      googleCalendar.listEvents.mockResolvedValue({
        items: [fullEvent],
        nextSyncToken: 'sync-token-123'
      });

      await calendarSync.fullSync('primary');

      const events = await eventsStore.getAll();
      expect(events[0].description).toBe('Description');
      expect(events[0].location).toBe('Location');
      expect(events[0].attendees).toEqual(fullEvent.attendees);
      expect(events[0].reminders).toEqual(fullEvent.reminders);
      expect(events[0].recurrence).toEqual(fullEvent.recurrence);
    });
  });
});

