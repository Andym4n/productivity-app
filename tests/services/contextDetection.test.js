/**
 * Unit tests for Context Detection Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectEventContext,
  getCurrentContext,
  detectEventsContext,
  CONTEXT_TYPES
} from '../../src/services/contextDetection.js';
import { getCurrentSchedule } from '../../src/schedule/crud/scheduleOperations.js';
import { parseISO } from 'date-fns';

// Mock the schedule operations
vi.mock('../../src/schedule/crud/scheduleOperations.js', () => ({
  getCurrentSchedule: vi.fn()
}));

describe('Context Detection Service', () => {
  // Mock work schedule
  const mockWorkSchedule = {
    id: 'schedule-1',
    isActive: true,
    scheduleType: 'fixed',
    defaultStartTime: '09:00',
    defaultEndTime: '17:00',
    preferredWorkDays: [1, 2, 3, 4, 5], // Mon-Fri
    weeklySchedule: {
      1: { enabled: true, startTime: '09:00', endTime: '17:00' }, // Monday
      2: { enabled: true, startTime: '09:00', endTime: '17:00' }, // Tuesday
      3: { enabled: true, startTime: '09:00', endTime: '17:00' }, // Wednesday
      4: { enabled: true, startTime: '09:00', endTime: '17:00' }, // Thursday
      5: { enabled: true, startTime: '09:00', endTime: '17:00' }, // Friday
      6: { enabled: false }, // Saturday
      0: { enabled: false }  // Sunday
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: return mock schedule
    getCurrentSchedule.mockResolvedValue(mockWorkSchedule);
  });

  describe('detectEventContext', () => {
    it('should detect work context for event during work hours on work day', async () => {
      const event = {
        title: 'Team Meeting',
        startTime: '2024-01-15T10:00:00Z', // Monday 10 AM
        endTime: '2024-01-15T11:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.WORK);
    });

    it('should detect personal context for event outside work hours', async () => {
      const event = {
        title: 'Dinner with Friends',
        startTime: '2024-01-15T19:00:00Z', // Monday 7 PM (after work)
        endTime: '2024-01-15T21:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.PERSONAL);
    });

    it('should detect personal context for event on weekend', async () => {
      const event = {
        title: 'Weekend Brunch',
        startTime: '2024-01-13T11:00:00Z', // Saturday 11 AM
        endTime: '2024-01-13T13:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.PERSONAL);
    });

    it('should detect work context based on work keywords', async () => {
      const event = {
        title: 'Sprint Planning Meeting',
        description: 'Team sync for next sprint',
        startTime: '2024-01-15T19:00:00Z', // Monday 7 PM (outside work hours)
        endTime: '2024-01-15T20:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.WORK);
    });

    it('should detect personal context based on personal keywords', async () => {
      const event = {
        title: 'Gym Workout',
        description: 'Personal fitness session',
        startTime: '2024-01-15T10:00:00Z', // Monday 10 AM (during work hours)
        endTime: '2024-01-15T11:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.PERSONAL);
    });

    it('should detect focus context for focus-related events', async () => {
      const event = {
        title: 'Deep Work - Focus Time',
        description: 'No meetings, heads down coding',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T12:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.FOCUS);
    });

    it('should detect focus context from focus keywords', async () => {
      const event = {
        title: 'Coding Session',
        description: 'Focus time for development work',
        startTime: '2024-01-15T14:00:00Z',
        endTime: '2024-01-15T16:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.FOCUS);
    });

    it('should detect work context from work email domains in attendees', async () => {
      const event = {
        title: 'Client Call',
        startTime: '2024-01-15T19:00:00Z', // Outside work hours
        endTime: '2024-01-15T20:00:00Z',
        attendees: [
          { email: 'john@company.com' },
          { email: 'jane@business.org' }
        ]
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.WORK);
    });

    it('should detect personal context from personal email domains in attendees', async () => {
      const event = {
        title: 'Birthday Party',
        startTime: '2024-01-15T10:00:00Z', // During work hours
        endTime: '2024-01-15T11:00:00Z',
        attendees: [
          { email: 'friend@gmail.com' },
          { email: 'family@yahoo.com' }
        ]
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.PERSONAL);
    });

    it('should default to personal when no schedule is available', async () => {
      getCurrentSchedule.mockResolvedValue(null);

      const event = {
        title: 'Some Event',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.PERSONAL);
    });

    it('should default to personal when schedule is inactive', async () => {
      getCurrentSchedule.mockResolvedValue({
        ...mockWorkSchedule,
        isActive: false
      });

      const event = {
        title: 'Team Meeting',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.PERSONAL);
    });

    it('should handle events with Date objects', async () => {
      const event = {
        title: 'Team Meeting',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z')
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.WORK);
    });

    it('should handle events without endTime', async () => {
      const event = {
        title: 'Team Meeting',
        startTime: '2024-01-15T10:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.WORK);
    });

    it('should prioritize focus over work context', async () => {
      const event = {
        title: 'Focus Time - Deep Work',
        description: 'Team meeting for project planning',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T12:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.FOCUS);
    });

    it('should use provided schedule instead of fetching', async () => {
      const customSchedule = {
        ...mockWorkSchedule,
        defaultStartTime: '08:00',
        defaultEndTime: '16:00',
        // Update weekly schedule to match new default times
        weeklySchedule: {
          ...mockWorkSchedule.weeklySchedule,
          1: { enabled: true, startTime: '08:00', endTime: '16:00' } // Monday
        }
      };

      const event = {
        title: 'Early Meeting',
        startTime: '2024-01-15T08:30:00Z', // Within custom schedule (Monday 08:30)
        endTime: '2024-01-15T09:00:00Z'
      };

      const context = await detectEventContext(event, customSchedule);
      expect(context).toBe(CONTEXT_TYPES.WORK);
      expect(getCurrentSchedule).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentContext', () => {
    it('should return work context during work hours on work day', async () => {
      // Mock current time to be Monday 10 AM
      vi.useFakeTimers();
      vi.setSystemTime(parseISO('2024-01-15T10:00:00Z')); // Monday 10 AM

      const context = await getCurrentContext();
      expect(context).toBe(CONTEXT_TYPES.WORK);

      vi.useRealTimers();
    });

    it('should return personal context outside work hours', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(parseISO('2024-01-15T19:00:00Z')); // Monday 7 PM

      const context = await getCurrentContext();
      expect(context).toBe(CONTEXT_TYPES.PERSONAL);

      vi.useRealTimers();
    });

    it('should return personal context on weekend', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(parseISO('2024-01-13T10:00:00Z')); // Saturday 10 AM

      const context = await getCurrentContext();
      expect(context).toBe(CONTEXT_TYPES.PERSONAL);

      vi.useRealTimers();
    });

    it('should return personal when no schedule is available', async () => {
      getCurrentSchedule.mockResolvedValue(null);

      vi.useFakeTimers();
      vi.setSystemTime(parseISO('2024-01-15T10:00:00Z'));

      const context = await getCurrentContext();
      expect(context).toBe(CONTEXT_TYPES.PERSONAL);

      vi.useRealTimers();
    });

    it('should use provided schedule instead of fetching', async () => {
      const customSchedule = {
        ...mockWorkSchedule,
        defaultStartTime: '08:00',
        defaultEndTime: '16:00'
      };

      vi.useFakeTimers();
      vi.setSystemTime(parseISO('2024-01-15T10:00:00Z'));

      const context = await getCurrentContext(customSchedule);
      expect(context).toBe(CONTEXT_TYPES.WORK);
      expect(getCurrentSchedule).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('detectEventsContext', () => {
    it('should detect context for multiple events', async () => {
      const events = [
        {
          title: 'Team Meeting',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z'
        },
        {
          title: 'Dinner with Friends',
          startTime: '2024-01-15T19:00:00Z',
          endTime: '2024-01-15T21:00:00Z'
        },
        {
          title: 'Focus Time',
          startTime: '2024-01-15T14:00:00Z',
          endTime: '2024-01-15T16:00:00Z'
        }
      ];

      const eventsWithContext = await detectEventsContext(events);
      
      expect(eventsWithContext).toHaveLength(3);
      expect(eventsWithContext[0].context).toBe(CONTEXT_TYPES.WORK);
      expect(eventsWithContext[1].context).toBe(CONTEXT_TYPES.PERSONAL);
      expect(eventsWithContext[2].context).toBe(CONTEXT_TYPES.FOCUS);
    });

    it('should handle empty array', async () => {
      const eventsWithContext = await detectEventsContext([]);
      expect(eventsWithContext).toEqual([]);
    });

    it('should use provided schedule for all events', async () => {
      const customSchedule = {
        ...mockWorkSchedule,
        defaultStartTime: '08:00',
        defaultEndTime: '16:00',
        // Update weekly schedule to match new default times
        weeklySchedule: {
          ...mockWorkSchedule.weeklySchedule,
          1: { enabled: true, startTime: '08:00', endTime: '16:00' } // Monday
        }
      };

      const events = [
        {
          title: 'Early Meeting',
          startTime: '2024-01-15T08:30:00Z', // Monday 08:30
          endTime: '2024-01-15T09:00:00Z'
        }
      ];

      const eventsWithContext = await detectEventsContext(events, customSchedule);
      expect(eventsWithContext[0].context).toBe(CONTEXT_TYPES.WORK);
      expect(getCurrentSchedule).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle event without title', async () => {
      const event = {
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.WORK); // During work hours
    });

    it('should handle event with only description', async () => {
      const event = {
        description: 'Team sync meeting',
        startTime: '2024-01-15T19:00:00Z',
        endTime: '2024-01-15T20:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.WORK); // Work keywords in description
    });

    it('should handle error when fetching schedule gracefully', async () => {
      getCurrentSchedule.mockRejectedValue(new Error('Database error'));

      const event = {
        title: 'Some Event',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.PERSONAL); // Default fallback
    });

    it('should handle weekly schedule without default times', async () => {
      const scheduleWithoutDefaults = {
        ...mockWorkSchedule,
        defaultStartTime: null,
        defaultEndTime: null
      };

      getCurrentSchedule.mockResolvedValue(scheduleWithoutDefaults);

      const event = {
        title: 'Team Meeting',
        startTime: '2024-01-15T10:00:00Z', // Monday
        endTime: '2024-01-15T11:00:00Z'
      };

      const context = await detectEventContext(event);
      expect(context).toBe(CONTEXT_TYPES.WORK); // Should use weekly schedule
    });
  });
});

