/**
 * Integration tests for IndexedDB persistence
 * 
 * These tests verify that task data persists correctly across database sessions
 * and that all CRUD operations maintain data integrity with IndexedDB.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTask,
  getTask,
  getTasks,
  updateTask,
  deleteTask,
  restoreTask,
  hardDeleteTask,
  addDependency,
  addSubtask,
  startTimeTracking,
  stopTimeTracking,
  addManualTimeEntry
} from '../../../src/tasks/crud/index.js';
import { initDatabase, closeDatabase, getDatabase } from '../../../src/storage/indexeddb/database.js';
import { stopAnyTimer } from '../../../src/tasks/utils/timeTracking.js';
import { TASK_PRIORITIES, TASK_STATUSES, TASK_CONTEXTS } from '../../../src/tasks/models/Task.js';

describe('IndexedDB Persistence Integration Tests', () => {
  beforeEach(async () => {
    // Close any existing database connections
    await closeDatabase();
    // Initialize fresh database
    await initDatabase();
    // Clear any active timers
    stopAnyTimer();
  });

  afterEach(async () => {
    // Clean up: clear tasks store and close database
    try {
      const db = await getDatabase();
      if (db) {
        const transaction = db.transaction(['tasks'], 'readwrite');
        await transaction.objectStore('tasks').clear();
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
    await closeDatabase();
  });

  describe('Data Persistence Across Sessions', () => {
    it('should persist task data across database close/reopen', async () => {
      // Create a task with all fields
      const taskData = {
        title: 'Persistent Task',
        description: 'This task should persist',
        status: TASK_STATUSES.IN_PROGRESS,
        priority: TASK_PRIORITIES.HIGH,
        context: TASK_CONTEXTS.WORK,
        tags: ['important', 'urgent'],
        dueDate: new Date('2024-12-31'),
        timeEstimate: 120,
        timeSpent: 30,
        dependencies: [],
        recurrence: {
          pattern: 'daily',
          interval: 1
        }
      };

      const createdTask = await createTask(taskData);
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();
      expect(createdTask.title).toBe(taskData.title);

      // Close and reopen database to simulate new session
      await closeDatabase();
      await initDatabase();

      // Retrieve the task - it should still exist
      const retrievedTask = await getTask(createdTask.id);
      expect(retrievedTask).not.toBeNull();
      expect(retrievedTask.id).toBe(createdTask.id);
      expect(retrievedTask.title).toBe(taskData.title);
      expect(retrievedTask.description).toBe(taskData.description);
      expect(retrievedTask.status).toBe(taskData.status);
      expect(retrievedTask.priority).toBe(taskData.priority);
      expect(retrievedTask.context).toBe(taskData.context);
      expect(retrievedTask.tags).toEqual(taskData.tags);
      expect(retrievedTask.timeEstimate).toBe(taskData.timeEstimate);
      expect(retrievedTask.timeSpent).toBe(taskData.timeSpent);
      expect(retrievedTask.dependencies).toEqual(taskData.dependencies);
      expect(retrievedTask.recurrence).toEqual(taskData.recurrence);
    });

    it('should persist multiple tasks across sessions', async () => {
      // Create multiple tasks
      const task1 = await createTask({ title: 'Task 1', priority: TASK_PRIORITIES.HIGH });
      const task2 = await createTask({ title: 'Task 2', priority: TASK_PRIORITIES.MEDIUM });
      const task3 = await createTask({ title: 'Task 3', priority: TASK_PRIORITIES.LOW });

      // Close and reopen database
      await closeDatabase();
      await initDatabase();

      // All tasks should still exist
      const allTasks = await getTasks();
      expect(allTasks.length).toBe(3);
      
      const retrievedTask1 = await getTask(task1.id);
      const retrievedTask2 = await getTask(task2.id);
      const retrievedTask3 = await getTask(task3.id);

      expect(retrievedTask1.title).toBe('Task 1');
      expect(retrievedTask2.title).toBe('Task 2');
      expect(retrievedTask3.title).toBe('Task 3');
    });

    it('should persist task updates across sessions', async () => {
      // Create a task
      const task = await createTask({ title: 'Original Title' });

      // Update the task
      const updatedTask = await updateTask(task.id, {
        title: 'Updated Title',
        status: TASK_STATUSES.COMPLETED,
        priority: TASK_PRIORITIES.HIGH
      });

      // Close and reopen database
      await closeDatabase();
      await initDatabase();

      // Verify updates persisted
      const retrievedTask = await getTask(task.id);
      expect(retrievedTask.title).toBe('Updated Title');
      expect(retrievedTask.status).toBe(TASK_STATUSES.COMPLETED);
      expect(retrievedTask.priority).toBe(TASK_PRIORITIES.HIGH);
      expect(retrievedTask.updatedAt).toBeDefined();
      expect(retrievedTask.completedAt).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all task fields correctly', async () => {
      const taskData = {
        title: 'Complete Task',
        description: 'A task with all fields',
        status: TASK_STATUSES.PENDING,
        priority: TASK_PRIORITIES.MEDIUM,
        context: TASK_CONTEXTS.PERSONAL,
        tags: ['tag1', 'tag2', 'tag3'],
        dueDate: new Date('2024-12-25T10:00:00Z'),
        timeEstimate: 60,
        timeSpent: 15,
        dependencies: [],
        parentId: null,
        recurrence: {
          pattern: 'weekly',
          interval: 2,
          daysOfWeek: [1, 3, 5],
          endDate: new Date('2025-12-31')
        }
      };

      const createdTask = await createTask(taskData);

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      const retrievedTask = await getTask(createdTask.id);

      // Verify all fields
      expect(retrievedTask.title).toBe(taskData.title);
      expect(retrievedTask.description).toBe(taskData.description);
      expect(retrievedTask.status).toBe(taskData.status);
      expect(retrievedTask.priority).toBe(taskData.priority);
      expect(retrievedTask.context).toBe(taskData.context);
      expect(retrievedTask.tags).toEqual(taskData.tags);
      expect(retrievedTask.timeEstimate).toBe(taskData.timeEstimate);
      expect(retrievedTask.timeSpent).toBe(taskData.timeSpent);
      expect(retrievedTask.dependencies).toEqual(taskData.dependencies);
      expect(retrievedTask.parentId).toBeNull();
      expect(retrievedTask.recurrence).toEqual(taskData.recurrence);
      expect(retrievedTask.createdAt).toBeDefined();
      expect(retrievedTask.updatedAt).toBeDefined();
    });

    it('should preserve date fields as ISO strings', async () => {
      const dueDate = new Date('2024-12-25T10:00:00Z');
      const task = await createTask({
        title: 'Date Task',
        dueDate
      });

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      const retrievedTask = await getTask(task.id);
      
      // Dates should be stored and retrieved as ISO strings
      expect(typeof retrievedTask.dueDate).toBe('string');
      expect(retrievedTask.dueDate).toBe(dueDate.toISOString());
      expect(typeof retrievedTask.createdAt).toBe('string');
      expect(typeof retrievedTask.updatedAt).toBe('string');
    });

    it('should preserve complex nested structures', async () => {
      const recurrence = {
        pattern: 'custom',
        interval: 1,
        rruleOptions: {
          freq: 2, // Weekly
          byweekday: [1, 3, 5], // Monday, Wednesday, Friday
          dtstart: new Date('2024-01-01').toISOString(),
          until: new Date('2024-12-31').toISOString()
        }
      };

      const task = await createTask({
        title: 'Recurring Task',
        recurrence
      });

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      const retrievedTask = await getTask(task.id);
      expect(retrievedTask.recurrence).toEqual(recurrence);
      expect(retrievedTask.recurrence.rruleOptions).toEqual(recurrence.rruleOptions);
    });
  });

  describe('Soft Delete Persistence', () => {
    it('should persist soft-deleted tasks across sessions', async () => {
      const task = await createTask({ title: 'To Delete' });
      
      // Soft delete the task
      const deletedTask = await deleteTask(task.id);
      expect(deletedTask.deletedAt).toBeDefined();
      expect(deletedTask.status).toBe(TASK_STATUSES.CANCELLED);

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      // Task should still exist but be soft-deleted
      const retrievedTask = await getTask(task.id, { includeDeleted: true });
      expect(retrievedTask).not.toBeNull();
      expect(retrievedTask.deletedAt).toBeDefined();
      expect(retrievedTask.status).toBe(TASK_STATUSES.CANCELLED);

      // Should not appear in normal queries
      const allTasks = await getTasks();
      expect(allTasks.find(t => t.id === task.id)).toBeUndefined();
    });

    it('should persist restored tasks across sessions', async () => {
      const task = await createTask({ title: 'Restore Test' });
      
      // Soft delete
      await deleteTask(task.id);
      
      // Restore
      const restoredTask = await restoreTask(task.id);
      expect(restoredTask.deletedAt).toBeNull();
      expect(restoredTask.status).toBe(TASK_STATUSES.PENDING);

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      // Task should be restored
      const retrievedTask = await getTask(task.id);
      expect(retrievedTask).not.toBeNull();
      expect(retrievedTask.deletedAt).toBeNull();
      expect(retrievedTask.status).toBe(TASK_STATUSES.PENDING);
    });
  });

  describe('Relationships Persistence', () => {
    it('should persist dependencies across sessions', async () => {
      const task1 = await createTask({ title: 'Task 1' });
      const task2 = await createTask({ title: 'Task 2' });
      const task3 = await createTask({ title: 'Task 3' });

      // Add dependencies
      await addDependency(task2.id, task1.id);
      await addDependency(task3.id, task2.id);

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      // Verify dependencies persisted
      const retrievedTask2 = await getTask(task2.id);
      const retrievedTask3 = await getTask(task3.id);

      expect(retrievedTask2.dependencies).toContain(task1.id);
      expect(retrievedTask3.dependencies).toContain(task2.id);
    });

    it('should persist subtask relationships across sessions', async () => {
      const parent = await createTask({ title: 'Parent Task' });
      const child1 = await createTask({ title: 'Child 1' });
      const child2 = await createTask({ title: 'Child 2' });

      // Add subtasks
      await addSubtask(child1.id, parent.id);
      await addSubtask(child2.id, parent.id);

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      // Verify relationships persisted
      const retrievedParent = await getTask(parent.id);
      const retrievedChild1 = await getTask(child1.id);
      const retrievedChild2 = await getTask(child2.id);
      const subtasks = await getTasks({ parentId: parent.id });

      expect(retrievedChild1.parentId).toBe(parent.id);
      expect(retrievedChild2.parentId).toBe(parent.id);
      expect(subtasks.length).toBe(2);
      expect(subtasks.map(t => t.id)).toContain(child1.id);
      expect(subtasks.map(t => t.id)).toContain(child2.id);
    });
  });

  describe('Time Tracking Persistence', () => {
    it('should persist time tracking data across sessions', async () => {
      const task = await createTask({ title: 'Time Tracked Task' });

      // Add manual time entry
      await addManualTimeEntry(task.id, 30);
      
      // Start and stop timer (simulating some work)
      await startTimeTracking(task.id);
      // Simulate timer running (in real scenario, this would be time-based)
      await stopTimeTracking(task.id);

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      // Verify time persisted
      const retrievedTask = await getTask(task.id);
      expect(retrievedTask.timeSpent).toBeGreaterThanOrEqual(30);
    });

    it('should persist accumulated time across multiple sessions', async () => {
      const task = await createTask({ title: 'Accumulated Time' });

      // Add time in first session
      await addManualTimeEntry(task.id, 15);

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      // Add more time in second session
      await addManualTimeEntry(task.id, 20);

      // Verify accumulated time
      const retrievedTask = await getTask(task.id);
      expect(retrievedTask.timeSpent).toBe(35);
    });
  });

  describe('Query Persistence', () => {
    it('should maintain query results across sessions', async () => {
      // Create tasks with different statuses
      const pending1 = await createTask({ title: 'Pending 1', status: TASK_STATUSES.PENDING });
      const pending2 = await createTask({ title: 'Pending 2', status: TASK_STATUSES.PENDING });
      const completed1 = await createTask({ title: 'Completed 1', status: TASK_STATUSES.COMPLETED });
      const inProgress1 = await createTask({ title: 'In Progress 1', status: TASK_STATUSES.IN_PROGRESS });

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      // Query by status
      const pendingTasks = await getTasks({ status: TASK_STATUSES.PENDING });
      const completedTasks = await getTasks({ status: TASK_STATUSES.COMPLETED });
      const inProgressTasks = await getTasks({ status: TASK_STATUSES.IN_PROGRESS });

      expect(pendingTasks.length).toBe(2);
      expect(completedTasks.length).toBe(1);
      expect(inProgressTasks.length).toBe(1);
      expect(pendingTasks.map(t => t.id)).toContain(pending1.id);
      expect(pendingTasks.map(t => t.id)).toContain(pending2.id);
      expect(completedTasks[0].id).toBe(completed1.id);
      expect(inProgressTasks[0].id).toBe(inProgress1.id);
    });

    it('should maintain date range queries across sessions', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0); // Set to start of yesterday
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of today
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const task0 = await createTask({ title: 'Yesterday', dueDate: yesterday });
      const task1 = await createTask({ title: 'Today', dueDate: today });
      const task2 = await createTask({ title: 'Tomorrow', dueDate: tomorrow });
      const task3 = await createTask({ title: 'Next Week', dueDate: nextWeek });

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      // Query due or overdue (should include yesterday and today at start of day)
      const dueOrOverdue = await getTasks({ dueOrOverdue: true });
      expect(dueOrOverdue.length).toBeGreaterThanOrEqual(2);
      expect(dueOrOverdue.map(t => t.id)).toContain(task0.id);
      expect(dueOrOverdue.map(t => t.id)).toContain(task1.id);

      // Query date range (today through tomorrow)
      const rangeStart = new Date(today);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(tomorrow);
      rangeEnd.setHours(23, 59, 59, 999);
      
      const rangeTasks = await getTasks({
        dueDateStart: rangeStart,
        dueDateEnd: rangeEnd
      });
      expect(rangeTasks.length).toBeGreaterThanOrEqual(2);
      expect(rangeTasks.map(t => t.id)).toContain(task1.id);
      expect(rangeTasks.map(t => t.id)).toContain(task2.id);
      // task0 (yesterday) should not be in range
      expect(rangeTasks.map(t => t.id)).not.toContain(task0.id);
    });
  });

  describe('Performance and Data Integrity', () => {
    it('should handle bulk operations efficiently', async () => {
      // Create many tasks
      const tasks = [];
      for (let i = 0; i < 50; i++) {
        const task = await createTask({
          title: `Task ${i}`,
          priority: i % 3 === 0 ? TASK_PRIORITIES.HIGH : TASK_PRIORITIES.MEDIUM
        });
        tasks.push(task);
      }

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      // Retrieve all tasks
      const allTasks = await getTasks();
      expect(allTasks.length).toBe(50);

      // Verify all tasks are present
      const retrievedIds = allTasks.map(t => t.id);
      tasks.forEach(task => {
        expect(retrievedIds).toContain(task.id);
      });
    });

    it('should maintain referential integrity for dependencies', async () => {
      const task1 = await createTask({ title: 'Task 1' });
      const task2 = await createTask({ title: 'Task 2' });
      
      await addDependency(task2.id, task1.id);

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      // Hard delete task1
      await hardDeleteTask(task1.id);

      // Task2 should still exist but dependency should be broken
      const task2Retrieved = await getTask(task2.id);
      expect(task2Retrieved).not.toBeNull();
      // Note: In a production system, you might want to clean up broken dependencies
      // For now, we just verify the task still exists
      expect(task2Retrieved.dependencies).toContain(task1.id);
    });
  });

  describe('Error Handling with Persistence', () => {
    it('should handle duplicate task creation errors correctly', async () => {
      const task = await createTask({ title: 'Unique Task' });
      
      // Close and reopen
      await closeDatabase();
      await initDatabase();

      // Try to create a task with the same ID (should fail)
      try {
        await createTask({
          id: task.id, // Explicitly set same ID
          title: 'Duplicate'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.name).toBe('TaskOperationError');
        expect(error.code).toBe('DUPLICATE_TASK');
      }
    });

    it('should handle updates to non-existent tasks correctly', async () => {
      const fakeId = 'non-existent-id';

      // Close and reopen
      await closeDatabase();
      await initDatabase();

      try {
        await updateTask(fakeId, { title: 'Updated' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.name).toBe('TaskOperationError');
        expect(error.code).toBe('TASK_NOT_FOUND');
      }
    });
  });
});

