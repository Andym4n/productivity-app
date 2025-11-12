import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  parseDate,
  getStartOfDay,
  getEndOfDay,
  addDaysToDate,
  getDaysDifference,
  areSameDay,
  isDateToday,
  isDatePast,
  isDateFuture,
  getRelativeTime,
  formatDuration,
  getCurrentDateTime
} from '../../src/utils/dateUtils.js';

describe('Date Utilities', () => {
  const testDate = new Date('2024-01-15T10:30:00Z');
  const testDateString = '2024-01-15T10:30:00Z';

  describe('formatDate', () => {
    it('should format a date object', () => {
      const formatted = formatDate(testDate);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should format a date string', () => {
      const formatted = formatDate(testDateString);
      expect(formatted).toBeTruthy();
    });

    it('should handle invalid dates', () => {
      const formatted = formatDate('invalid');
      expect(formatted).toBe('Invalid date');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const formatted = formatDateTime(testDate);
      expect(formatted).toContain('at');
    });
  });

  describe('formatTime', () => {
    it('should format time only', () => {
      const formatted = formatTime(testDate);
      expect(formatted).toBeTruthy();
    });
  });

  describe('parseDate', () => {
    it('should parse valid ISO date string', () => {
      const parsed = parseDate(testDateString);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getTime()).toBe(testDate.getTime());
    });

    it('should return null for invalid date string', () => {
      const parsed = parseDate('invalid');
      expect(parsed).toBeNull();
    });
  });

  describe('getStartOfDay', () => {
    it('should return start of day', () => {
      const start = getStartOfDay(testDate);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day', () => {
      const end = getEndOfDay(testDate);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
    });
  });

  describe('addDaysToDate', () => {
    it('should add days to a date', () => {
      const newDate = addDaysToDate(testDate, 5);
      const diff = getDaysDifference(newDate, testDate);
      expect(diff).toBe(5);
    });
  });

  describe('getDaysDifference', () => {
    it('should calculate days difference', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-20');
      const diff = getDaysDifference(date2, date1);
      expect(diff).toBe(5);
    });
  });

  describe('areSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2024-01-15T10:00:00');
      const date2 = new Date('2024-01-15T20:00:00');
      expect(areSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-16');
      expect(areSameDay(date1, date2)).toBe(false);
    });
  });

  describe('isDateToday', () => {
    it('should return true for today', () => {
      expect(isDateToday(new Date())).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = addDaysToDate(new Date(), -1);
      expect(isDateToday(yesterday)).toBe(false);
    });
  });

  describe('isDatePast', () => {
    it('should return true for past date', () => {
      const past = addDaysToDate(new Date(), -1);
      expect(isDatePast(past)).toBe(true);
    });

    it('should return false for future date', () => {
      const future = addDaysToDate(new Date(), 1);
      expect(isDatePast(future)).toBe(false);
    });
  });

  describe('isDateFuture', () => {
    it('should return true for future date', () => {
      const future = addDaysToDate(new Date(), 1);
      expect(isDateFuture(future)).toBe(true);
    });

    it('should return false for past date', () => {
      const past = addDaysToDate(new Date(), -1);
      expect(isDateFuture(past)).toBe(false);
    });
  });

  describe('getRelativeTime', () => {
    it('should return relative time string', () => {
      const past = addDaysToDate(new Date(), -1);
      const relative = getRelativeTime(past);
      expect(relative).toContain('ago');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes only', () => {
      expect(formatDuration(30)).toBe('30m');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m');
    });

    it('should format hours only', () => {
      expect(formatDuration(120)).toBe('2h');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0m');
    });

    it('should handle negative', () => {
      expect(formatDuration(-10)).toBe('0m');
    });
  });

  describe('getCurrentDateTime', () => {
    it('should return ISO string', () => {
      const current = getCurrentDateTime();
      expect(typeof current).toBe('string');
      expect(parseDate(current)).toBeInstanceOf(Date);
    });
  });
});

