import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidUrl,
  isValidDateString,
  isValidTimeString,
  isValidString,
  isValidNumber,
  isValidPositiveInteger,
  isValidUUID,
  isValidTaskPriority,
  isValidTaskStatus,
  isValidTaskContext,
  isValidDateRange,
  sanitizeString,
  validateAndSanitizeInput
} from '../../src/utils/validation.js';

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
    });
  });

  describe('isValidDateString', () => {
    it('should validate correct date strings', () => {
      expect(isValidDateString('2024-01-15')).toBe(true);
      expect(isValidDateString('2024-01-15T10:30:00Z')).toBe(true);
    });

    it('should reject invalid date strings', () => {
      expect(isValidDateString('invalid')).toBe(false);
      expect(isValidDateString('')).toBe(false);
      expect(isValidDateString(null)).toBe(false);
    });
  });

  describe('isValidTimeString', () => {
    it('should validate correct time strings', () => {
      expect(isValidTimeString('10:30')).toBe(true);
      expect(isValidTimeString('23:59')).toBe(true);
      expect(isValidTimeString('00:00')).toBe(true);
    });

    it('should reject invalid time strings', () => {
      expect(isValidTimeString('25:00')).toBe(false);
      expect(isValidTimeString('10:60')).toBe(false);
      expect(isValidTimeString('10:30:00')).toBe(false);
      expect(isValidTimeString('')).toBe(false);
    });
  });

  describe('isValidString', () => {
    it('should validate strings with min length', () => {
      expect(isValidString('hello', 3)).toBe(true);
      expect(isValidString('hi', 3)).toBe(false);
    });

    it('should validate strings with max length', () => {
      expect(isValidString('hello', 1, 10)).toBe(true);
      expect(isValidString('this is too long', 1, 10)).toBe(false);
    });

    it('should reject non-strings', () => {
      expect(isValidString(123)).toBe(false);
      expect(isValidString(null)).toBe(false);
    });
  });

  describe('isValidNumber', () => {
    it('should validate numbers in range', () => {
      expect(isValidNumber(5, 0, 10)).toBe(true);
      expect(isValidNumber(15, 0, 10)).toBe(false);
      expect(isValidNumber(-5, 0, 10)).toBe(false);
    });

    it('should reject NaN', () => {
      expect(isValidNumber(NaN)).toBe(false);
    });
  });

  describe('isValidPositiveInteger', () => {
    it('should validate positive integers', () => {
      expect(isValidPositiveInteger(5)).toBe(true);
      expect(isValidPositiveInteger(0)).toBe(false);
      expect(isValidPositiveInteger(-5)).toBe(false);
      expect(isValidPositiveInteger(5.5)).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      expect(isValidUUID(validUUID)).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('isValidTaskPriority', () => {
    it('should validate task priorities', () => {
      expect(isValidTaskPriority('high')).toBe(true);
      expect(isValidTaskPriority('medium')).toBe(true);
      expect(isValidTaskPriority('low')).toBe(true);
      expect(isValidTaskPriority('invalid')).toBe(false);
    });
  });

  describe('isValidTaskStatus', () => {
    it('should validate task statuses', () => {
      expect(isValidTaskStatus('pending')).toBe(true);
      expect(isValidTaskStatus('completed')).toBe(true);
      expect(isValidTaskStatus('invalid')).toBe(false);
    });
  });

  describe('isValidTaskContext', () => {
    it('should validate task contexts', () => {
      expect(isValidTaskContext('work')).toBe(true);
      expect(isValidTaskContext('personal')).toBe(true);
      expect(isValidTaskContext('invalid')).toBe(false);
    });
  });

  describe('isValidDateRange', () => {
    it('should validate date ranges', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-20');
      expect(isValidDateRange(start, end)).toBe(true);
      expect(isValidDateRange(end, start)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>hello')).toBe('hello');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });
  });

  describe('validateAndSanitizeInput', () => {
    it('should validate required fields', () => {
      const result = validateAndSanitizeInput('', { required: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should validate min length', () => {
      const result = validateAndSanitizeInput('hi', { minLength: 5 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should validate max length', () => {
      const result = validateAndSanitizeInput('this is too long', { maxLength: 5 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('no more than');
    });

    it('should sanitize HTML', () => {
      const result = validateAndSanitizeInput('<script>alert("xss")</script>hello');
      expect(result.sanitized).toBe('hello');
    });
  });
});

