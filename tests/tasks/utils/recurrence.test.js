/**
 * Tests for Recurrence Utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Frequency } from 'rrule';
import { parseISO, addDays, addWeeks, addMonths } from 'date-fns';
import {
  convertToRRuleOptions,
  createRRule,
  getNextOccurrence,
  getNextOccurrences,
  validateRRulePattern,
  matchesRecurrence,
  getRecurrenceDescription
} from '../../../src/tasks/utils/recurrence.js';
import { RECURRENCE_PATTERNS } from '../../../src/tasks/models/Task.js';

describe('Recurrence Utilities', () => {
  let baseDate;

  beforeEach(() => {
    baseDate = new Date('2024-01-15T10:00:00Z'); // Monday
  });

  describe('convertToRRuleOptions', () => {
    it('should convert daily recurrence pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      const options = convertToRRuleOptions(recurrence, baseDate);

      expect(options.freq).toBe(Frequency.DAILY);
      expect(options.interval).toBe(1);
      expect(options.dtstart).toEqual(baseDate);
    });

    it('should convert daily recurrence with interval', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 3
      };

      const options = convertToRRuleOptions(recurrence, baseDate);

      expect(options.freq).toBe(Frequency.DAILY);
      expect(options.interval).toBe(3);
    });

    it('should convert weekly recurrence pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.WEEKLY,
        interval: 1,
        daysOfWeek: [1, 3, 5] // Monday, Wednesday, Friday (0=Sunday in our format)
      };

      const options = convertToRRuleOptions(recurrence, baseDate);

      expect(options.freq).toBe(Frequency.WEEKLY);
      expect(options.interval).toBe(1);
      // Our format: 1=Monday -> rrule: 0=Monday, 3=Wednesday -> rrule: 2, 5=Friday -> rrule: 4
      expect(options.byweekday).toEqual([0, 2, 4]);
    });

    it('should convert weekly recurrence with Sunday (0)', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.WEEKLY,
        interval: 1,
        daysOfWeek: [0, 6] // Sunday, Saturday
      };

      const options = convertToRRuleOptions(recurrence, baseDate);

      expect(options.freq).toBe(Frequency.WEEKLY);
      // Sunday (0) -> rrule: 6, Saturday (6) -> rrule: 5
      expect(options.byweekday).toEqual([6, 5]);
    });

    it('should convert monthly recurrence pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.MONTHLY,
        interval: 1
      };

      const options = convertToRRuleOptions(recurrence, baseDate);

      expect(options.freq).toBe(Frequency.MONTHLY);
      expect(options.interval).toBe(1);
    });

    it('should include endDate when provided', () => {
      const endDate = new Date('2024-12-31');
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1,
        endDate: endDate.toISOString()
      };

      const options = convertToRRuleOptions(recurrence, baseDate);

      expect(options.until).toEqual(endDate);
    });

    it('should handle custom recurrence pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.CUSTOM,
        rruleOptions: {
          freq: Frequency.DAILY,
          interval: 2,
          byweekday: [Frequency.MO, Frequency.WE, Frequency.FR]
        }
      };

      const options = convertToRRuleOptions(recurrence, baseDate);

      expect(options.freq).toBe(Frequency.DAILY);
      expect(options.interval).toBe(2);
      expect(options.byweekday).toEqual([Frequency.MO, Frequency.WE, Frequency.FR]);
      expect(options.dtstart).toEqual(baseDate);
    });

    it('should use current date if startDate not provided', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      const before = new Date();
      const options = convertToRRuleOptions(recurrence);
      const after = new Date();

      expect(options.dtstart.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(options.dtstart.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw error for invalid recurrence object', () => {
      expect(() => convertToRRuleOptions(null)).toThrow('Recurrence must be an object');
      expect(() => convertToRRuleOptions('invalid')).toThrow('Recurrence must be an object');
    });

    it('should throw error for invalid start date', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      expect(() => convertToRRuleOptions(recurrence, 'invalid-date')).toThrow('Invalid start date');
    });

    it('should throw error for unsupported pattern', () => {
      const recurrence = {
        pattern: 'invalid',
        interval: 1
      };

      expect(() => convertToRRuleOptions(recurrence, baseDate)).toThrow('Unsupported recurrence pattern');
    });

    it('should throw error for custom pattern without rruleOptions', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.CUSTOM
      };

      expect(() => convertToRRuleOptions(recurrence, baseDate)).toThrow('Custom recurrence pattern requires rruleOptions');
    });
  });

  describe('createRRule', () => {
    it('should create RRule instance for daily pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      const rrule = createRRule(recurrence, baseDate);

      expect(rrule).toBeDefined();
      expect(rrule.options.freq).toBe(Frequency.DAILY);
    });

    it('should create RRule instance for weekly pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.WEEKLY,
        interval: 1,
        daysOfWeek: [1, 3, 5]
      };

      const rrule = createRRule(recurrence, baseDate);

      expect(rrule).toBeDefined();
      expect(rrule.options.freq).toBe(Frequency.WEEKLY);
    });
  });

  describe('getNextOccurrence', () => {
    it('should get next occurrence for daily pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      const next = getNextOccurrence(recurrence, baseDate);

      expect(next).toBeDefined();
      expect(next.getTime()).toBeGreaterThan(baseDate.getTime());
      expect(next.getDate()).toBe(baseDate.getDate() + 1);
    });

    it('should get next occurrence for weekly pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.WEEKLY,
        interval: 1,
        daysOfWeek: [1] // Monday
      };

      const next = getNextOccurrence(recurrence, baseDate, baseDate);

      expect(next).toBeDefined();
      // Should be next Monday (7 days later)
      expect(next.getDate()).toBe(baseDate.getDate() + 7);
    });

    it('should return null for recurrence without pattern', () => {
      expect(getNextOccurrence(null, baseDate)).toBeNull();
      expect(getNextOccurrence({}, baseDate)).toBeNull();
    });

    it('should return null when endDate has passed', () => {
      const pastEndDate = new Date('2024-01-01');
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1,
        endDate: pastEndDate.toISOString()
      };

      const next = getNextOccurrence(recurrence, baseDate, baseDate);

      expect(next).toBeNull();
    });

    it('should get next occurrence after specified date', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      const afterDate = addDays(baseDate, 5);
      const next = getNextOccurrence(recurrence, baseDate, afterDate);

      expect(next).toBeDefined();
      expect(next.getTime()).toBeGreaterThan(afterDate.getTime());
    });

    it('should handle custom recurrence pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.CUSTOM,
        rruleOptions: {
          freq: Frequency.DAILY,
          interval: 2
        }
      };

      const next = getNextOccurrence(recurrence, baseDate);

      expect(next).toBeDefined();
      expect(next.getTime()).toBeGreaterThan(baseDate.getTime());
    });

    it('should return null for invalid dates', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      expect(getNextOccurrence(recurrence, 'invalid-date')).toBeNull();
      expect(getNextOccurrence(recurrence, baseDate, 'invalid-date')).toBeNull();
    });
  });

  describe('getNextOccurrences', () => {
    it('should get multiple next occurrences', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      const occurrences = getNextOccurrences(recurrence, baseDate, 5, baseDate);

      expect(occurrences).toHaveLength(5);
      occurrences.forEach((date, index) => {
        expect(date.getTime()).toBeGreaterThan(baseDate.getTime());
        if (index > 0) {
          expect(date.getTime()).toBeGreaterThan(occurrences[index - 1].getTime());
        }
      });
    });

    it('should return empty array for invalid recurrence', () => {
      expect(getNextOccurrences(null, baseDate, 5)).toEqual([]);
      expect(getNextOccurrences({}, baseDate, 5)).toEqual([]);
    });

    it('should respect endDate when generating occurrences', () => {
      const endDate = addDays(baseDate, 3);
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1,
        endDate: endDate.toISOString()
      };

      const occurrences = getNextOccurrences(recurrence, baseDate, 10, baseDate);

      // Should only generate occurrences up to endDate
      expect(occurrences.length).toBeLessThanOrEqual(4); // baseDate + 3 days
      occurrences.forEach(date => {
        expect(date.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should return empty array for count less than 1', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      expect(getNextOccurrences(recurrence, baseDate, 0)).toEqual([]);
      expect(getNextOccurrences(recurrence, baseDate, -1)).toEqual([]);
    });
  });

  describe('validateRRulePattern', () => {
    it('should validate valid daily pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      const validation = validateRRulePattern(recurrence, baseDate);

      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeNull();
    });

    it('should validate valid weekly pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.WEEKLY,
        interval: 1,
        daysOfWeek: [1, 3, 5]
      };

      const validation = validateRRulePattern(recurrence, baseDate);

      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeNull();
    });

    it('should validate valid custom pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.CUSTOM,
        rruleOptions: {
          freq: Frequency.DAILY,
          interval: 2
        }
      };

      const validation = validateRRulePattern(recurrence, baseDate);

      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeNull();
    });

    it('should invalidate invalid recurrence object', () => {
      const validation = validateRRulePattern(null);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Recurrence must be an object');
    });

    it('should invalidate pattern that generates no occurrences', () => {
      // Pattern with endDate in the past
      const pastEndDate = new Date('2020-01-01');
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1,
        endDate: pastEndDate.toISOString()
      };

      const validation = validateRRulePattern(recurrence, baseDate);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('does not generate any occurrences');
    });
  });

  describe('matchesRecurrence', () => {
    it('should match date that fits daily pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      const nextDay = addDays(baseDate, 1);
      const matches = matchesRecurrence(recurrence, nextDay, baseDate);

      expect(matches).toBe(true);
    });

    it('should not match date that does not fit pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.WEEKLY,
        interval: 1,
        daysOfWeek: [1] // Monday only
      };

      const tuesday = addDays(baseDate, 1); // Tuesday
      const matches = matchesRecurrence(recurrence, tuesday, baseDate);

      expect(matches).toBe(false);
    });

    it('should return false for invalid recurrence', () => {
      expect(matchesRecurrence(null, baseDate, baseDate)).toBe(false);
      expect(matchesRecurrence({}, baseDate, baseDate)).toBe(false);
    });

    it('should return false for invalid date', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      expect(matchesRecurrence(recurrence, 'invalid-date', baseDate)).toBe(false);
    });
  });

  describe('getRecurrenceDescription', () => {
    it('should generate description for daily pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };

      const description = getRecurrenceDescription(recurrence);

      expect(description).toBeDefined();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should generate description for weekly pattern', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.WEEKLY,
        interval: 1,
        daysOfWeek: [1, 3, 5]
      };

      const description = getRecurrenceDescription(recurrence);

      expect(description).toBeDefined();
      expect(typeof description).toBe('string');
    });

    it('should return error message for invalid recurrence', () => {
      const description = getRecurrenceDescription(null);

      expect(description).toBe('No recurrence');
    });

    it('should return error message for invalid pattern', () => {
      const recurrence = {
        pattern: 'invalid'
      };

      const description = getRecurrenceDescription(recurrence);

      expect(description).toBe('Invalid recurrence pattern');
    });
  });
});

