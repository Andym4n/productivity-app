import { describe, it, expect, beforeEach, vi } from 'vitest';
import googleCalendar from '../../src/services/googleCalendar.js';
import googleAuth from '../../src/services/googleAuth.js';

// Mock googleAuth service
vi.mock('../../src/services/googleAuth.js', () => ({
  default: {
    getAccessToken: vi.fn()
  }
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('GoogleCalendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    googleAuth.getAccessToken.mockResolvedValue('mock-access-token');
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await googleCalendar.initialize();
      expect(googleCalendar.initialized).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await googleCalendar.initialize();
      const firstInit = googleCalendar.initialized;
      await googleCalendar.initialize();
      expect(googleCalendar.initialized).toBe(firstInit);
    });
  });

  describe('Authenticated Requests', () => {
    it('should make authenticated request with access token', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      });

      await googleCalendar.listCalendars();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/calendarList'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should throw error if not authenticated', async () => {
      googleAuth.getAccessToken.mockResolvedValue(null);

      await expect(googleCalendar.listCalendars()).rejects.toThrow(
        'Not authenticated with Google Calendar'
      );
    });

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'Invalid request' }
        })
      });

      await expect(googleCalendar.listCalendars()).rejects.toThrow('Invalid request');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(googleCalendar.listCalendars()).rejects.toThrow('Network error');
    });
  });

  describe('Calendar Operations', () => {
    it('should list calendars', async () => {
      const mockCalendars = [
        { id: 'primary', summary: 'Primary Calendar' },
        { id: 'calendar2', summary: 'Secondary Calendar' }
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockCalendars })
      });

      const calendars = await googleCalendar.listCalendars();

      expect(calendars).toEqual(mockCalendars);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/calendarList'),
        expect.any(Object)
      );
    });

    it('should get specific calendar', async () => {
      const mockCalendar = {
        id: 'primary',
        summary: 'Primary Calendar',
        timeZone: 'America/New_York'
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockCalendar
      });

      const calendar = await googleCalendar.getCalendar('primary');

      expect(calendar).toEqual(mockCalendar);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendars/primary'),
        expect.any(Object)
      );
    });

    it('should use primary as default calendar ID', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'primary' })
      });

      await googleCalendar.getCalendar();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendars/primary'),
        expect.any(Object)
      );
    });
  });

  describe('Event Operations', () => {
    it('should list events with default parameters', async () => {
      const mockEvents = [
        {
          id: 'event1',
          summary: 'Test Event',
          start: { dateTime: '2024-01-01T10:00:00Z' },
          end: { dateTime: '2024-01-01T11:00:00Z' }
        }
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockEvents })
      });

      const response = await googleCalendar.listEvents('primary');

      expect(response.items).toEqual(mockEvents);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendars/primary/events'),
        expect.any(Object)
      );
    });

    it('should list events with sync token for incremental sync', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [], nextSyncToken: 'sync-token-123' })
      });

      await googleCalendar.listEvents('primary', {
        syncToken: 'existing-token'
      });

      const url = global.fetch.mock.calls[0][0];
      expect(url).toContain('syncToken=existing-token');
      expect(url).toContain('showDeleted=true');
    });

    it('should list events with pagination', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [],
          nextPageToken: 'page-token-123'
        })
      });

      await googleCalendar.listEvents('primary', {
        pageToken: 'page-token-123'
      });

      const url = global.fetch.mock.calls[0][0];
      expect(url).toContain('pageToken=page-token-123');
    });

    it('should list events with time range', async () => {
      const timeMin = '2024-01-01T00:00:00Z';
      const timeMax = '2024-01-31T23:59:59Z';

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      });

      await googleCalendar.listEvents('primary', {
        timeMin,
        timeMax
      });

      const url = global.fetch.mock.calls[0][0];
      expect(url).toContain(`timeMin=${encodeURIComponent(timeMin)}`);
      expect(url).toContain(`timeMax=${encodeURIComponent(timeMax)}`);
    });

    it('should get single event', async () => {
      const mockEvent = {
        id: 'event1',
        summary: 'Test Event',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' }
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockEvent
      });

      const event = await googleCalendar.getEvent('primary', 'event1');

      expect(event).toEqual(mockEvent);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendars/primary/events/event1'),
        expect.any(Object)
      );
    });

    it('should create event', async () => {
      const eventData = {
        summary: 'New Event',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' }
      };

      const createdEvent = {
        id: 'new-event-123',
        ...eventData
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => createdEvent
      });

      const event = await googleCalendar.createEvent('primary', eventData);

      expect(event).toEqual(createdEvent);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendars/primary/events'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(eventData)
        })
      );
    });

    it('should update event', async () => {
      const eventData = {
        summary: 'Updated Event',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' }
      };

      const updatedEvent = {
        id: 'event1',
        ...eventData
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => updatedEvent
      });

      const event = await googleCalendar.updateEvent('primary', 'event1', eventData);

      expect(event).toEqual(updatedEvent);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendars/primary/events/event1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(eventData)
        })
      );
    });

    it('should patch event', async () => {
      const updates = {
        summary: 'Patched Summary'
      };

      const patchedEvent = {
        id: 'event1',
        summary: 'Patched Summary',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' }
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => patchedEvent
      });

      const event = await googleCalendar.patchEvent('primary', 'event1', updates);

      expect(event).toEqual(patchedEvent);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendars/primary/events/event1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates)
        })
      );
    });

    it('should delete event', async () => {
      global.fetch.mockResolvedValue({
        ok: true
      });

      await googleCalendar.deleteEvent('primary', 'event1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendars/primary/events/event1'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should handle all-day events', async () => {
      const eventData = {
        summary: 'All Day Event',
        start: { date: '2024-01-01' },
        end: { date: '2024-01-02' }
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'event1', ...eventData })
      });

      await googleCalendar.createEvent('primary', eventData);

      const call = global.fetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.start.date).toBe('2024-01-01');
      expect(body.end.date).toBe('2024-01-02');
    });
  });

  describe('Quick Add', () => {
    it('should quick add event using natural language', async () => {
      const text = 'Meeting tomorrow at 2pm';
      const createdEvent = {
        id: 'quick-event-123',
        summary: 'Meeting',
        start: { dateTime: '2024-01-02T14:00:00Z' },
        end: { dateTime: '2024-01-02T15:00:00Z' }
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => createdEvent
      });

      const event = await googleCalendar.quickAdd(text, 'primary');

      expect(event).toEqual(createdEvent);
      const url = global.fetch.mock.calls[0][0];
      expect(url).toContain('quickAdd');
      // URL encoding can use + or %20 for spaces, both are valid
      expect(url).toMatch(/text=(Meeting\+tomorrow\+at\+2pm|Meeting%20tomorrow%20at%202pm)/);
    });
  });

  describe('Webhook Operations', () => {
    it('should setup watch channel for push notifications', async () => {
      const channel = {
        id: 'channel-123',
        address: 'https://example.com/webhook',
        token: 'verification-token',
        expiration: Date.now() + 3600000
      };

      const watchResponse = {
        id: 'channel-123',
        resourceId: 'resource-123',
        expiration: channel.expiration
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => watchResponse
      });

      const response = await googleCalendar.watchEvents('primary', channel);

      expect(response).toEqual(watchResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendars/primary/events/watch'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('channel-123')
        })
      );
    });

    it('should stop watching channel', async () => {
      const channel = {
        id: 'channel-123',
        resourceId: 'resource-123'
      };

      global.fetch.mockResolvedValue({
        ok: true
      });

      await googleCalendar.stopWatching(channel);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/channels/stop'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(channel)
        })
      );
    });
  });

  describe('URL Encoding', () => {
    it('should properly encode calendar IDs with special characters', async () => {
      const calendarId = 'user@example.com';
      
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      });

      await googleCalendar.listEvents(calendarId);

      const url = global.fetch.mock.calls[0][0];
      expect(url).toContain(encodeURIComponent(calendarId));
    });

    it('should properly encode event IDs with special characters', async () => {
      const eventId = 'event@123#test';
      
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: eventId })
      });

      await googleCalendar.getEvent('primary', eventId);

      const url = global.fetch.mock.calls[0][0];
      expect(url).toContain(encodeURIComponent(eventId));
    });
  });
});

