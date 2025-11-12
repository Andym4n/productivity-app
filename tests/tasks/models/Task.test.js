import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTask,
  normalizeTask,
  RECURRENCE_PATTERNS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_CONTEXTS
} from '../../../src/tasks/models/Task.js';

describe('Task Model', () => {
  describe('createTask', () => {
    it('should create a task with default values', () => {
      const task = createTask();
      
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('');
      expect(task.description).toBe('');
      expect(task.dueDate).toBeNull();
      expect(task.priority).toBe(TASK_PRIORITIES.MEDIUM);
      expect(task.status).toBe(TASK_STATUSES.PENDING);
      expect(task.context).toBe(TASK_CONTEXTS.PERSONAL);
      expect(task.tags).toEqual([]);
      expect(task.timeEstimate).toBeNull();
      expect(task.timeSpent).toBe(0);
      expect(task.parentId).toBeNull();
      expect(task.dependencies).toEqual([]);
      expect(task.recurrence).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
      expect(task.completedAt).toBeNull();
      expect(task.deletedAt).toBeNull();
    });

    it('should create a task with provided data', () => {
      const now = new Date().toISOString();
      const taskData = {
        id: 'test-id',
        title: 'Test Task',
        description: 'Test Description',
        priority: TASK_PRIORITIES.HIGH,
        status: TASK_STATUSES.IN_PROGRESS,
        context: TASK_CONTEXTS.WORK,
        tags: ['urgent', 'important'],
        timeEstimate: 60,
        timeSpent: 30
      };
      
      const task = createTask(taskData);
      
      expect(task.id).toBe('test-id');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.priority).toBe(TASK_PRIORITIES.HIGH);
      expect(task.status).toBe(TASK_STATUSES.IN_PROGRESS);
      expect(task.context).toBe(TASK_CONTEXTS.WORK);
      expect(task.tags).toEqual(['urgent', 'important']);
      expect(task.timeEstimate).toBe(60);
      expect(task.timeSpent).toBe(30);
    });

    it('should generate a UUID if id is not provided', () => {
      const task1 = createTask();
      const task2 = createTask();
      
      expect(task1.id).toBeDefined();
      expect(task2.id).toBeDefined();
      expect(task1.id).not.toBe(task2.id);
      // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(task1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should handle arrays correctly', () => {
      const task = createTask({
        tags: ['tag1', 'tag2'],
        dependencies: ['dep1', 'dep2']
      });
      
      expect(Array.isArray(task.tags)).toBe(true);
      expect(Array.isArray(task.dependencies)).toBe(true);
      expect(task.tags).toEqual(['tag1', 'tag2']);
      expect(task.dependencies).toEqual(['dep1', 'dep2']);
    });

    it('should handle non-array tags and dependencies', () => {
      const task = createTask({
        tags: 'not-an-array',
        dependencies: 'not-an-array'
      });
      
      expect(Array.isArray(task.tags)).toBe(true);
      expect(Array.isArray(task.dependencies)).toBe(true);
      expect(task.tags).toEqual([]);
      expect(task.dependencies).toEqual([]);
    });
  });

  describe('normalizeTask', () => {
    it('should normalize a valid task object', () => {
      const task = {
        id: 'test-id',
        title: 'Test Task',
        dueDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        tags: ['tag1'],
        dependencies: ['dep1'],
        timeEstimate: 60,
        timeSpent: 30
      };
      
      const normalized = normalizeTask(task);
      
      expect(typeof normalized.dueDate).toBe('string');
      expect(typeof normalized.createdAt).toBe('string');
      expect(normalized.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(normalized.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should normalize date strings', () => {
      const task = {
        id: 'test-id',
        title: 'Test Task',
        dueDate: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z'
      };
      
      const normalized = normalizeTask(task);
      
      expect(typeof normalized.dueDate).toBe('string');
      expect(typeof normalized.createdAt).toBe('string');
    });

    it('should set null dates to null', () => {
      const task = {
        id: 'test-id',
        title: 'Test Task',
        dueDate: null,
        completedAt: null
      };
      
      const normalized = normalizeTask(task);
      
      expect(normalized.dueDate).toBeNull();
      expect(normalized.completedAt).toBeNull();
    });

    it('should throw error for invalid task object', () => {
      expect(() => normalizeTask(null)).toThrow('Task must be an object');
      expect(() => normalizeTask('not-an-object')).toThrow('Task must be an object');
    });

    it('should throw error for invalid date format', () => {
      const task = {
        id: 'test-id',
        title: 'Test Task',
        dueDate: 'invalid-date'
      };
      
      expect(() => normalizeTask(task)).toThrow('Invalid date format for dueDate');
    });

    it('should normalize recurrence endDate', () => {
      const task = {
        id: 'test-id',
        title: 'Test Task',
        recurrence: {
          pattern: RECURRENCE_PATTERNS.DAILY,
          interval: 1,
          endDate: new Date('2024-12-31')
        }
      };
      
      const normalized = normalizeTask(task);
      
      expect(typeof normalized.recurrence.endDate).toBe('string');
      expect(normalized.recurrence.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should ensure arrays are arrays', () => {
      const task = {
        id: 'test-id',
        title: 'Test Task',
        tags: 'not-an-array',
        dependencies: 'not-an-array'
      };
      
      const normalized = normalizeTask(task);
      
      expect(Array.isArray(normalized.tags)).toBe(true);
      expect(Array.isArray(normalized.dependencies)).toBe(true);
    });

    it('should ensure numbers are numbers', () => {
      const task = {
        id: 'test-id',
        title: 'Test Task',
        timeEstimate: '60',
        timeSpent: '30'
      };
      
      const normalized = normalizeTask(task);
      
      expect(typeof normalized.timeEstimate).toBe('number');
      expect(typeof normalized.timeSpent).toBe('number');
      expect(normalized.timeEstimate).toBe(60);
      expect(normalized.timeSpent).toBe(30);
    });
  });

  describe('Constants', () => {
    it('should export correct recurrence patterns', () => {
      expect(RECURRENCE_PATTERNS.DAILY).toBe('daily');
      expect(RECURRENCE_PATTERNS.WEEKLY).toBe('weekly');
      expect(RECURRENCE_PATTERNS.MONTHLY).toBe('monthly');
      expect(RECURRENCE_PATTERNS.CUSTOM).toBe('custom');
    });

    it('should export correct task priorities', () => {
      expect(TASK_PRIORITIES.HIGH).toBe('high');
      expect(TASK_PRIORITIES.MEDIUM).toBe('medium');
      expect(TASK_PRIORITIES.LOW).toBe('low');
    });

    it('should export correct task statuses', () => {
      expect(TASK_STATUSES.PENDING).toBe('pending');
      expect(TASK_STATUSES.IN_PROGRESS).toBe('in-progress');
      expect(TASK_STATUSES.COMPLETED).toBe('completed');
      expect(TASK_STATUSES.CANCELLED).toBe('cancelled');
    });

    it('should export correct task contexts', () => {
      expect(TASK_CONTEXTS.WORK).toBe('work');
      expect(TASK_CONTEXTS.PERSONAL).toBe('personal');
    });
  });
});

