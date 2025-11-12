import { describe, it, expect } from 'vitest';
import {
  validateTask,
  validateAndSanitizeTask,
  validateTitle,
  validateDescription,
  validateDate,
  validateRecurrence,
  validateDependencies,
  validateTags,
  TaskValidationError
} from '../../../src/tasks/models/validateTask.js';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_CONTEXTS,
  RECURRENCE_PATTERNS
} from '../../../src/tasks/models/Task.js';

describe('Task Validation', () => {
  describe('validateTitle', () => {
    it('should validate a valid title', () => {
      const result = validateTitle('Test Task');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty title', () => {
      const result = validateTitle('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Title is required');
    });

    it('should reject non-string title', () => {
      const result = validateTitle(123);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Title is required');
    });

    it('should reject title with only whitespace', () => {
      const result = validateTitle('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Title cannot be empty');
    });

    it('should reject title longer than 500 characters', () => {
      const longTitle = 'a'.repeat(501);
      const result = validateTitle(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Title must be 500 characters or less');
    });

    it('should sanitize HTML from title', () => {
      const result = validateTitle('<script>alert("xss")</script>Test');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDescription', () => {
    it('should validate a valid description', () => {
      const result = validateDescription('Test description');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow null description', () => {
      const result = validateDescription(null);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow undefined description', () => {
      const result = validateDescription(undefined);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject non-string description', () => {
      const result = validateDescription(123);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Description must be a string');
    });

    it('should reject description longer than 5000 characters', () => {
      const longDesc = 'a'.repeat(5001);
      const result = validateDescription(longDesc);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Description must be 5000 characters or less');
    });
  });

  describe('validateDate', () => {
    it('should validate a valid Date object', () => {
      const result = validateDate(new Date());
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.date).toBeInstanceOf(Date);
    });

    it('should validate a valid ISO date string', () => {
      const result = validateDate('2024-01-01T00:00:00.000Z');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.date).toBeInstanceOf(Date);
    });

    it('should allow null date', () => {
      const result = validateDate(null);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.date).toBeNull();
    });

    it('should reject invalid date string', () => {
      const result = validateDate('invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid date format');
    });

    it('should reject non-date, non-string value', () => {
      const result = validateDate(123);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date must be a Date object or ISO string');
    });
  });

  describe('validateRecurrence', () => {
    it('should validate a valid daily recurrence', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1
      };
      const result = validateRecurrence(recurrence);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should validate a valid weekly recurrence', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.WEEKLY,
        interval: 1,
        daysOfWeek: [1, 3, 5]
      };
      const result = validateRecurrence(recurrence);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should validate a recurrence with endDate', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 1,
        endDate: '2024-12-31T00:00:00.000Z'
      };
      const result = validateRecurrence(recurrence);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow null recurrence', () => {
      const result = validateRecurrence(null);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject invalid pattern', () => {
      const recurrence = {
        pattern: 'invalid',
        interval: 1
      };
      const result = validateRecurrence(recurrence);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Recurrence pattern must be one of');
    });

    it('should reject invalid interval', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.DAILY,
        interval: 0
      };
      const result = validateRecurrence(recurrence);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('positive number');
    });

    it('should reject weekly recurrence without daysOfWeek', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.WEEKLY,
        interval: 1
      };
      const result = validateRecurrence(recurrence);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('daysOfWeek');
    });

    it('should reject weekly recurrence with empty daysOfWeek', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.WEEKLY,
        interval: 1,
        daysOfWeek: []
      };
      const result = validateRecurrence(recurrence);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least one day');
    });

    it('should reject invalid daysOfWeek values', () => {
      const recurrence = {
        pattern: RECURRENCE_PATTERNS.WEEKLY,
        interval: 1,
        daysOfWeek: [7, 8]
      };
      const result = validateRecurrence(recurrence);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('integers between 0 and 6');
    });
  });

  describe('validateDependencies', () => {
    it('should validate valid dependencies array', () => {
      const dependencies = ['task-1', 'task-2', 'task-3'];
      const result = validateDependencies(dependencies);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject non-array dependencies', () => {
      const result = validateDependencies('not-an-array');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Dependencies must be an array');
    });

    it('should reject empty string dependency IDs', () => {
      const result = validateDependencies(['task-1', '']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('non-empty strings');
    });

    it('should reject duplicate dependencies', () => {
      const result = validateDependencies(['task-1', 'task-2', 'task-1']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Dependencies must be unique');
    });
  });

  describe('validateTags', () => {
    it('should validate valid tags array', () => {
      const tags = ['urgent', 'important', 'work'];
      const result = validateTags(tags);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject non-array tags', () => {
      const result = validateTags('not-an-array');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tags must be an array');
    });

    it('should reject non-string tags', () => {
      const result = validateTags([123, 'tag']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('All tags must be strings');
    });

    it('should reject empty string tags', () => {
      const result = validateTags(['tag1', '   ', 'tag2']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tags cannot be empty strings');
    });

    it('should reject tags longer than 50 characters', () => {
      const longTag = 'a'.repeat(51);
      const result = validateTags([longTag]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Each tag must be 50 characters or less');
    });

    it('should reject duplicate tags (case-insensitive)', () => {
      const result = validateTags(['Tag1', 'tag1', 'Tag2']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tags must be unique');
    });
  });

  describe('validateTask', () => {
    it('should validate a complete valid task', () => {
      const task = {
        id: 'test-id',
        title: 'Test Task',
        description: 'Test Description',
        dueDate: '2024-01-01T00:00:00.000Z',
        priority: TASK_PRIORITIES.HIGH,
        status: TASK_STATUSES.PENDING,
        context: TASK_CONTEXTS.WORK,
        tags: ['urgent'],
        timeEstimate: 60,
        timeSpent: 0,
        dependencies: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };
      
      const result = validateTask(task);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.task).toEqual(task);
    });

    it('should reject task without title', () => {
      const task = {
        id: 'test-id',
        priority: TASK_PRIORITIES.HIGH
      };
      
      const result = validateTask(task);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Title'))).toBe(true);
    });

    it('should reject task with invalid priority', () => {
      const task = {
        title: 'Test Task',
        priority: 'invalid-priority'
      };
      
      const result = validateTask(task);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Priority'))).toBe(true);
    });

    it('should reject task with invalid status', () => {
      const task = {
        title: 'Test Task',
        status: 'invalid-status'
      };
      
      const result = validateTask(task);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Status'))).toBe(true);
    });

    it('should reject task with invalid context', () => {
      const task = {
        title: 'Test Task',
        context: 'invalid-context'
      };
      
      const result = validateTask(task);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Context'))).toBe(true);
    });

    it('should reject task with invalid timeEstimate', () => {
      const task = {
        title: 'Test Task',
        timeEstimate: -5
      };
      
      const result = validateTask(task);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Time estimate'))).toBe(true);
    });

    it('should reject task with invalid timeSpent', () => {
      const task = {
        title: 'Test Task',
        timeSpent: -10
      };
      
      const result = validateTask(task);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Time spent'))).toBe(true);
    });

    it('should validate partial task when allowPartial is true', () => {
      const task = {
        priority: TASK_PRIORITIES.HIGH
      };
      
      const result = validateTask(task, { allowPartial: true });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should require ID when requireId is true', () => {
      const task = {
        title: 'Test Task'
      };
      
      const result = validateTask(task, { requireId: true });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('ID'))).toBe(true);
    });

    it('should reject null or non-object task', () => {
      expect(validateTask(null).isValid).toBe(false);
      expect(validateTask('not-an-object').isValid).toBe(false);
      expect(validateTask(123).isValid).toBe(false);
    });
  });

  describe('validateAndSanitizeTask', () => {
    it('should sanitize HTML from task fields', () => {
      const task = {
        title: '<script>alert("xss")</script>Test Task',
        description: '<div>Test</div>',
        tags: ['<b>tag</b>']
      };
      
      const result = validateAndSanitizeTask(task, { allowPartial: true });
      expect(result.isValid).toBe(true);
      expect(result.task.title).not.toContain('<script>');
      expect(result.task.description).not.toContain('<div>');
      expect(result.task.tags[0]).not.toContain('<b>');
    });

    it('should validate after sanitization', () => {
      const task = {
        title: '   ', // Only whitespace
        priority: TASK_PRIORITIES.HIGH
      };
      
      const result = validateAndSanitizeTask(task, { allowPartial: true });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Title'))).toBe(true);
    });
  });
});

