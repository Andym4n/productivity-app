import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getActiveTimer,
  isTimerActive,
  getActiveTimerTaskId,
  startTimer,
  stopTimer,
  stopAnyTimer,
  getElapsedTime,
  validateManualTimeEntry
} from '../../../src/tasks/utils/timeTracking.js';

describe('Time Tracking Utilities', () => {
  beforeEach(() => {
    // Clear any active timer before each test
    stopAnyTimer();
  });

  describe('getActiveTimer', () => {
    it('should return null when no timer is active', () => {
      expect(getActiveTimer()).toBeNull();
    });

    it('should return active timer object', () => {
      const taskId = 'task-123';
      startTimer(taskId);
      
      const timer = getActiveTimer();
      expect(timer).not.toBeNull();
      expect(timer.taskId).toBe(taskId);
      expect(timer.startTime).toBeGreaterThan(0);
    });

    it('should return a copy of the timer, not the original', () => {
      const taskId = 'task-123';
      startTimer(taskId);
      
      const timer1 = getActiveTimer();
      const timer2 = getActiveTimer();
      
      expect(timer1).not.toBe(timer2);
      expect(timer1).toEqual(timer2);
    });
  });

  describe('isTimerActive', () => {
    it('should return false when no timer is active', () => {
      expect(isTimerActive()).toBe(false);
    });

    it('should return true when timer is active', () => {
      startTimer('task-123');
      expect(isTimerActive()).toBe(true);
    });
  });

  describe('getActiveTimerTaskId', () => {
    it('should return null when no timer is active', () => {
      expect(getActiveTimerTaskId()).toBeNull();
    });

    it('should return task ID when timer is active', () => {
      const taskId = 'task-123';
      startTimer(taskId);
      expect(getActiveTimerTaskId()).toBe(taskId);
    });
  });

  describe('startTimer', () => {
    it('should start a timer for a task', () => {
      const taskId = 'task-123';
      const timer = startTimer(taskId);
      
      expect(timer.taskId).toBe(taskId);
      expect(timer.startTime).toBeGreaterThan(0);
      expect(isTimerActive()).toBe(true);
    });

    it('should throw error if taskId is missing', () => {
      expect(() => startTimer()).toThrow('Task ID is required');
      expect(() => startTimer(null)).toThrow('Task ID is required');
      expect(() => startTimer(123)).toThrow('Task ID is required');
    });

    it('should throw error if timer is already active for different task', () => {
      startTimer('task-1');
      
      expect(() => startTimer('task-2'))
        .toThrow('Timer is already active for task task-1');
    });

    it('should return existing timer if already active for same task', () => {
      const taskId = 'task-123';
      const timer1 = startTimer(taskId);
      
      // Try to start again for same task
      const timer2 = startTimer(taskId);
      
      expect(timer1.startTime).toBe(timer2.startTime);
      expect(timer1.taskId).toBe(timer2.taskId);
    });
  });

  describe('stopTimer', () => {
    it('should stop timer and return elapsed time', async () => {
      const taskId = 'task-123';
      startTimer(taskId);
      
      // Wait a bit to ensure elapsed time > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = stopTimer(taskId);
      
      expect(result.taskId).toBe(taskId);
      expect(result.startTime).toBeGreaterThan(0);
      expect(result.endTime).toBeGreaterThan(result.startTime);
      expect(result.elapsedMinutes).toBeGreaterThanOrEqual(0);
      expect(isTimerActive()).toBe(false);
    });

    it('should throw error if taskId is missing', () => {
      expect(() => stopTimer()).toThrow('Task ID is required');
      expect(() => stopTimer(null)).toThrow('Task ID is required');
    });

    it('should throw error if no timer is active', () => {
      expect(() => stopTimer('task-123'))
        .toThrow('No timer is currently active');
    });

    it('should throw error if timer is for different task', () => {
      startTimer('task-1');
      
      expect(() => stopTimer('task-2'))
        .toThrow('Timer is active for task task-1');
    });

    it('should round elapsed time to nearest minute', async () => {
      const taskId = 'task-123';
      startTimer(taskId);
      
      // Wait less than a minute
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = stopTimer(taskId);
      expect(result.elapsedMinutes).toBe(0); // Less than 30 seconds rounds to 0
    });
  });

  describe('stopAnyTimer', () => {
    it('should return null when no timer is active', () => {
      expect(stopAnyTimer()).toBeNull();
    });

    it('should stop any active timer', async () => {
      const taskId = 'task-123';
      startTimer(taskId);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = stopAnyTimer();
      
      expect(result).not.toBeNull();
      expect(result.taskId).toBe(taskId);
      expect(result.elapsedMinutes).toBeGreaterThanOrEqual(0);
      expect(isTimerActive()).toBe(false);
    });
  });

  describe('getElapsedTime', () => {
    it('should calculate elapsed time without stopping timer', async () => {
      const taskId = 'task-123';
      startTimer(taskId);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const elapsed = getElapsedTime(taskId);
      
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(isTimerActive()).toBe(true); // Timer still active
    });

    it('should throw error if taskId is missing', () => {
      expect(() => getElapsedTime()).toThrow('Task ID is required');
    });

    it('should throw error if no timer is active', () => {
      expect(() => getElapsedTime('task-123'))
        .toThrow('No timer is currently active');
    });

    it('should throw error if timer is for different task', () => {
      startTimer('task-1');
      
      expect(() => getElapsedTime('task-2'))
        .toThrow('Timer is active for task task-1');
    });
  });

  describe('validateManualTimeEntry', () => {
    it('should validate positive minutes', () => {
      const result = validateManualTimeEntry(30);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject non-number values', () => {
      expect(validateManualTimeEntry('30').isValid).toBe(false);
      expect(validateManualTimeEntry(null).isValid).toBe(false);
      expect(validateManualTimeEntry(undefined).isValid).toBe(false);
      expect(validateManualTimeEntry({}).isValid).toBe(false);
    });

    it('should reject NaN', () => {
      const result = validateManualTimeEntry(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should reject negative values', () => {
      const result = validateManualTimeEntry(-10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('negative');
    });

    it('should reject zero', () => {
      const result = validateManualTimeEntry(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('greater than zero');
    });

    it('should reject values exceeding 24 hours', () => {
      const result = validateManualTimeEntry(1441);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('1440 minutes');
    });

    it('should accept exactly 24 hours', () => {
      const result = validateManualTimeEntry(1440);
      expect(result.isValid).toBe(true);
    });

    it('should accept decimal values', () => {
      const result = validateManualTimeEntry(30.5);
      expect(result.isValid).toBe(true);
    });
  });
});

