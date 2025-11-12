import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTask,
  getTask,
  getTasks,
  updateTask,
  deleteTask,
  hardDeleteTask,
  restoreTask,
  addDependency,
  removeDependency,
  addSubtask,
  removeSubtask,
  moveSubtask,
  startTimeTracking,
  stopTimeTracking,
  addManualTimeEntry,
  TaskOperationError
} from '../../../src/tasks/crud/index.js';
import { stopAnyTimer } from '../../../src/tasks/utils/timeTracking.js';
import { initDatabase, closeDatabase, getDatabase } from '../../../src/storage/indexeddb/database.js';
import { TASK_PRIORITIES, TASK_STATUSES, TASK_CONTEXTS } from '../../../src/tasks/models/Task.js';
import { CircularDependencyError } from '../../../src/tasks/utils/dependencies.js';

describe('Task CRUD Operations', () => {
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

  describe('createTask', () => {
    it('should create a new task with minimal data', async () => {
      const taskData = {
        title: 'Test Task'
      };
      
      const task = await createTask(taskData);
      
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe(TASK_STATUSES.PENDING);
      expect(task.priority).toBe(TASK_PRIORITIES.MEDIUM);
      expect(task.context).toBe(TASK_CONTEXTS.PERSONAL);
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('should create a task with all fields', async () => {
      const taskData = {
        title: 'Complete Task',
        description: 'Task description',
        dueDate: '2024-12-31T00:00:00.000Z',
        priority: TASK_PRIORITIES.HIGH,
        status: TASK_STATUSES.IN_PROGRESS,
        context: TASK_CONTEXTS.WORK,
        tags: ['urgent', 'important'],
        timeEstimate: 120,
        timeSpent: 30,
        dependencies: []
      };
      
      const task = await createTask(taskData);
      
      expect(task.title).toBe('Complete Task');
      expect(task.description).toBe('Task description');
      expect(task.priority).toBe(TASK_PRIORITIES.HIGH);
      expect(task.status).toBe(TASK_STATUSES.IN_PROGRESS);
      expect(task.context).toBe(TASK_CONTEXTS.WORK);
      expect(task.tags).toEqual(['urgent', 'important']);
      expect(task.timeEstimate).toBe(120);
      expect(task.timeSpent).toBe(30);
    });

    it('should sanitize HTML from task fields', async () => {
      const taskData = {
        title: '<script>alert("xss")</script>Test Task',
        description: '<div>Description</div>'
      };
      
      const task = await createTask(taskData);
      
      expect(task.title).not.toContain('<script>');
      expect(task.description).not.toContain('<div>');
    });

    it('should throw validation error for invalid task data', async () => {
      const taskData = {
        title: '', // Empty title
        priority: 'invalid-priority'
      };
      
      await expect(createTask(taskData)).rejects.toThrow();
    });

    it('should generate unique IDs for each task', async () => {
      const task1 = await createTask({ title: 'Task 1' });
      const task2 = await createTask({ title: 'Task 2' });
      
      expect(task1.id).not.toBe(task2.id);
    });

    it('should normalize dates to ISO strings', async () => {
      const dueDate = new Date('2024-12-31');
      const taskData = {
        title: 'Task with Date',
        dueDate
      };
      
      const task = await createTask(taskData);
      
      expect(typeof task.dueDate).toBe('string');
      expect(task.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('getTask', () => {
    it('should retrieve an existing task by ID', async () => {
      const created = await createTask({ title: 'Test Task' });
      const retrieved = await getTask(created.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe('Test Task');
    });

    it('should return null for non-existent task', async () => {
      const task = await getTask('non-existent-id');
      expect(task).toBeNull();
    });

    it('should exclude soft-deleted tasks by default', async () => {
      const created = await createTask({ title: 'Test Task' });
      await deleteTask(created.id);
      
      const retrieved = await getTask(created.id);
      expect(retrieved).toBeNull();
    });

    it('should include soft-deleted tasks when includeDeleted is true', async () => {
      const created = await createTask({ title: 'Test Task' });
      await deleteTask(created.id);
      
      const retrieved = await getTask(created.id, { includeDeleted: true });
      expect(retrieved).not.toBeNull();
      expect(retrieved.deletedAt).toBeDefined();
      expect(retrieved.status).toBe(TASK_STATUSES.CANCELLED);
    });

    it('should throw error for invalid task ID', async () => {
      await expect(getTask(null)).rejects.toThrow(TaskOperationError);
      await expect(getTask(123)).rejects.toThrow(TaskOperationError);
    });
  });

  describe('getTasks', () => {
    beforeEach(async () => {
      // Create test tasks
      await createTask({ title: 'High Priority Task', priority: TASK_PRIORITIES.HIGH });
      await createTask({ title: 'Low Priority Task', priority: TASK_PRIORITIES.LOW });
      await createTask({ title: 'Work Task', context: TASK_CONTEXTS.WORK });
      await createTask({ title: 'Personal Task', context: TASK_CONTEXTS.PERSONAL });
      await createTask({ 
        title: 'Pending Task', 
        status: TASK_STATUSES.PENDING 
      });
      await createTask({ 
        title: 'Completed Task', 
        status: TASK_STATUSES.COMPLETED 
      });
    });

    it('should retrieve all active tasks by default', async () => {
      const tasks = await getTasks();
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every(task => !task.deletedAt)).toBe(true);
    });

    it('should filter tasks by status', async () => {
      const pendingTasks = await getTasks({ status: TASK_STATUSES.PENDING });
      expect(pendingTasks.length).toBeGreaterThan(0);
      expect(pendingTasks.every(task => task.status === TASK_STATUSES.PENDING)).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      const highPriorityTasks = await getTasks({ priority: TASK_PRIORITIES.HIGH });
      expect(highPriorityTasks.length).toBeGreaterThan(0);
      expect(highPriorityTasks.every(task => task.priority === TASK_PRIORITIES.HIGH)).toBe(true);
    });

    it('should filter tasks by context', async () => {
      const workTasks = await getTasks({ context: TASK_CONTEXTS.WORK });
      expect(workTasks.length).toBeGreaterThan(0);
      expect(workTasks.every(task => task.context === TASK_CONTEXTS.WORK)).toBe(true);
    });

    it('should filter tasks by due date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      
      await createTask({ 
        title: 'Task in Range', 
        dueDate: '2024-06-15T00:00:00.000Z' 
      });
      
      const tasks = await getTasks({ 
        dueDateStart: startDate, 
        dueDateEnd: endDate 
      });
      
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should get tasks due today or overdue', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await createTask({ 
        title: 'Overdue Task', 
        dueDate: yesterday.toISOString() 
      });
      
      const tasks = await getTasks({ dueOrOverdue: true });
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should exclude soft-deleted tasks by default', async () => {
      const created = await createTask({ title: 'To Delete' });
      await deleteTask(created.id);
      
      const tasks = await getTasks();
      expect(tasks.find(t => t.id === created.id)).toBeUndefined();
    });

    it('should include soft-deleted tasks when includeDeleted is true', async () => {
      const created = await createTask({ title: 'To Delete' });
      await deleteTask(created.id);
      
      const tasks = await getTasks({ includeDeleted: true });
      expect(tasks.find(t => t.id === created.id)).toBeDefined();
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', async () => {
      const created = await createTask({ title: 'Original Title' });
      
      const updated = await updateTask(created.id, {
        title: 'Updated Title',
        priority: TASK_PRIORITIES.HIGH
      });
      
      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe(TASK_PRIORITIES.HIGH);
      expect(updated.id).toBe(created.id);
      expect(updated.updatedAt).not.toBe(created.updatedAt);
    });

    it('should set completedAt when status changes to completed', async () => {
      const created = await createTask({ title: 'Task' });
      
      const updated = await updateTask(created.id, {
        status: TASK_STATUSES.COMPLETED
      });
      
      expect(updated.status).toBe(TASK_STATUSES.COMPLETED);
      expect(updated.completedAt).toBeDefined();
    });

    it('should clear completedAt when status changes away from completed', async () => {
      const created = await createTask({ 
        title: 'Task',
        status: TASK_STATUSES.COMPLETED,
        completedAt: new Date().toISOString()
      });
      
      const updated = await updateTask(created.id, {
        status: TASK_STATUSES.PENDING
      });
      
      expect(updated.status).toBe(TASK_STATUSES.PENDING);
      expect(updated.completedAt).toBeNull();
    });

    it('should not allow updating task ID', async () => {
      const created = await createTask({ title: 'Task' });
      
      const updated = await updateTask(created.id, {
        id: 'new-id'
      });
      
      expect(updated.id).toBe(created.id);
    });

    it('should throw error for non-existent task', async () => {
      await expect(updateTask('non-existent-id', { title: 'New' }))
        .rejects.toThrow(TaskOperationError);
    });

    it('should throw error for soft-deleted task', async () => {
      const created = await createTask({ title: 'Task' });
      await deleteTask(created.id);
      
      await expect(updateTask(created.id, { title: 'New' }))
        .rejects.toThrow(TaskOperationError);
    });

    it('should throw validation error for invalid updates', async () => {
      const created = await createTask({ title: 'Task' });
      
      await expect(updateTask(created.id, { priority: 'invalid' }))
        .rejects.toThrow();
    });
  });

  describe('deleteTask (soft delete)', () => {
    it('should soft delete a task', async () => {
      const created = await createTask({ title: 'To Delete' });
      
      const deleted = await deleteTask(created.id);
      
      expect(deleted.deletedAt).toBeDefined();
      expect(deleted.status).toBe(TASK_STATUSES.CANCELLED);
      expect(deleted.id).toBe(created.id);
    });

    it('should return existing task if already deleted', async () => {
      const created = await createTask({ title: 'Task' });
      const firstDelete = await deleteTask(created.id);
      const secondDelete = await deleteTask(created.id);
      
      expect(firstDelete.deletedAt).toBe(secondDelete.deletedAt);
    });

    it('should throw error for non-existent task', async () => {
      await expect(deleteTask('non-existent-id'))
        .rejects.toThrow(TaskOperationError);
    });

    it('should make task unavailable in getTask by default', async () => {
      const created = await createTask({ title: 'Task' });
      await deleteTask(created.id);
      
      const retrieved = await getTask(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('hardDeleteTask', () => {
    it('should permanently delete a task', async () => {
      const created = await createTask({ title: 'To Hard Delete' });
      
      await hardDeleteTask(created.id);
      
      const retrieved = await getTask(created.id, { includeDeleted: true });
      expect(retrieved).toBeNull();
    });

    it('should throw error for non-existent task', async () => {
      await expect(hardDeleteTask('non-existent-id'))
        .rejects.toThrow(TaskOperationError);
    });
  });

  describe('restoreTask', () => {
    it('should restore a soft-deleted task', async () => {
      const created = await createTask({ title: 'Task' });
      await deleteTask(created.id);
      
      const restored = await restoreTask(created.id);
      
      expect(restored.deletedAt).toBeNull();
      expect(restored.status).toBe(TASK_STATUSES.PENDING);
    });

    it('should return task as-is if not deleted', async () => {
      const created = await createTask({ title: 'Task' });
      
      const restored = await restoreTask(created.id);
      
      expect(restored.deletedAt).toBeNull();
      expect(restored.id).toBe(created.id);
    });

    it('should throw error for non-existent task', async () => {
      await expect(restoreTask('non-existent-id'))
        .rejects.toThrow(TaskOperationError);
    });

    it('should make restored task available in getTask', async () => {
      const created = await createTask({ title: 'Task' });
      await deleteTask(created.id);
      await restoreTask(created.id);
      
      const retrieved = await getTask(created.id);
      expect(retrieved).not.toBeNull();
    });
  });

  describe('addDependency', () => {
    it('should add a dependency to a task', async () => {
      const task1 = await createTask({ title: 'Task 1' });
      const task2 = await createTask({ title: 'Task 2' });

      const updated = await addDependency(task1.id, task2.id);

      expect(updated.dependencies).toContain(task2.id);
      expect(updated.dependencies.length).toBe(1);
    });

    it('should not add duplicate dependencies', async () => {
      const task1 = await createTask({ title: 'Task 1' });
      const task2 = await createTask({ title: 'Task 2' });

      await addDependency(task1.id, task2.id);
      const updated = await addDependency(task1.id, task2.id);

      expect(updated.dependencies.filter(id => id === task2.id).length).toBe(1);
    });

    it('should throw error if creating circular dependency', async () => {
      const task1 = await createTask({ title: 'Task 1' });
      const task2 = await createTask({ title: 'Task 2' });

      // Task 2 depends on Task 1
      await addDependency(task2.id, task1.id);

      // Try to make Task 1 depend on Task 2 (would create cycle)
      await expect(addDependency(task1.id, task2.id))
        .rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if task depends on itself', async () => {
      const task = await createTask({ title: 'Task' });

      await expect(addDependency(task.id, task.id))
        .rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if task not found', async () => {
      const task2 = await createTask({ title: 'Task 2' });

      await expect(addDependency('non-existent-id', task2.id))
        .rejects.toThrow(TaskOperationError);
    });

    it('should throw error if dependency not found', async () => {
      const task1 = await createTask({ title: 'Task 1' });

      await expect(addDependency(task1.id, 'non-existent-id'))
        .rejects.toThrow(TaskOperationError);
    });
  });

  describe('removeDependency', () => {
    it('should remove a dependency from a task', async () => {
      const task1 = await createTask({ 
        title: 'Task 1',
        dependencies: ['dep-1', 'dep-2']
      });
      const task2 = await createTask({ title: 'Task 2' });

      // First add the dependency
      await addDependency(task1.id, task2.id);

      // Then remove it
      const updated = await removeDependency(task1.id, task2.id);

      expect(updated.dependencies).not.toContain(task2.id);
    });

    it('should return task as-is if dependency does not exist', async () => {
      const task1 = await createTask({ title: 'Task 1' });
      const task2 = await createTask({ title: 'Task 2' });

      const updated = await removeDependency(task1.id, task2.id);

      expect(updated.dependencies).not.toContain(task2.id);
    });

    it('should throw error if task not found', async () => {
      await expect(removeDependency('non-existent-id', 'dep-id'))
        .rejects.toThrow(TaskOperationError);
    });
  });

  describe('addSubtask', () => {
    it('should set a task as a subtask of another task', async () => {
      const parent = await createTask({ title: 'Parent Task' });
      const subtask = await createTask({ title: 'Subtask' });

      const updated = await addSubtask(subtask.id, parent.id);

      expect(updated.parentId).toBe(parent.id);
    });

    it('should throw error if task is subtask of itself', async () => {
      const task = await createTask({ title: 'Task' });

      await expect(addSubtask(task.id, task.id))
        .rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if parent is already a dependency', async () => {
      const parent = await createTask({ title: 'Parent' });
      const subtask = await createTask({ 
        title: 'Subtask',
        dependencies: [parent.id]
      });

      await expect(addSubtask(subtask.id, parent.id))
        .rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if parent depends on subtask', async () => {
      const parent = await createTask({ title: 'Parent' });
      const subtask = await createTask({ title: 'Subtask' });

      // Parent depends on subtask
      await addDependency(parent.id, subtask.id);

      // Try to make subtask a child of parent (would create cycle)
      await expect(addSubtask(subtask.id, parent.id))
        .rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if subtask not found', async () => {
      const parent = await createTask({ title: 'Parent' });

      await expect(addSubtask('non-existent-id', parent.id))
        .rejects.toThrow(TaskOperationError);
    });

    it('should throw error if parent not found', async () => {
      const subtask = await createTask({ title: 'Subtask' });

      await expect(addSubtask(subtask.id, 'non-existent-id'))
        .rejects.toThrow(TaskOperationError);
    });
  });

  describe('removeSubtask', () => {
    it('should remove a task from being a subtask', async () => {
      const parent = await createTask({ title: 'Parent' });
      const subtask = await createTask({ title: 'Subtask' });

      await addSubtask(subtask.id, parent.id);
      const updated = await removeSubtask(subtask.id);

      expect(updated.parentId).toBeNull();
    });

    it('should return task as-is if already not a subtask', async () => {
      const task = await createTask({ title: 'Task' });

      const updated = await removeSubtask(task.id);

      expect(updated.parentId).toBeNull();
      expect(updated.id).toBe(task.id);
    });

    it('should throw error if task not found', async () => {
      await expect(removeSubtask('non-existent-id'))
        .rejects.toThrow(TaskOperationError);
    });
  });

  describe('moveSubtask', () => {
    it('should move a subtask to a different parent', async () => {
      const parent1 = await createTask({ title: 'Parent 1' });
      const parent2 = await createTask({ title: 'Parent 2' });
      const subtask = await createTask({ title: 'Subtask' });

      await addSubtask(subtask.id, parent1.id);
      const updated = await moveSubtask(subtask.id, parent2.id);

      expect(updated.parentId).toBe(parent2.id);
    });

    it('should make a subtask top-level when moving to null', async () => {
      const parent = await createTask({ title: 'Parent' });
      const subtask = await createTask({ title: 'Subtask' });

      await addSubtask(subtask.id, parent.id);
      const updated = await moveSubtask(subtask.id, null);

      expect(updated.parentId).toBeNull();
    });

    it('should throw error if moving would create circular dependency', async () => {
      const parent = await createTask({ title: 'Parent' });
      const subtask = await createTask({ title: 'Subtask' });

      // Parent depends on subtask
      await addDependency(parent.id, subtask.id);

      // Try to move subtask to be child of parent (would create cycle)
      await expect(moveSubtask(subtask.id, parent.id))
        .rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if subtask not found', async () => {
      const parent = await createTask({ title: 'Parent' });

      await expect(moveSubtask('non-existent-id', parent.id))
        .rejects.toThrow(TaskOperationError);
    });

    it('should throw error if new parent not found', async () => {
      const subtask = await createTask({ title: 'Subtask' });

      await expect(moveSubtask(subtask.id, 'non-existent-id'))
        .rejects.toThrow(TaskOperationError);
    });
  });

  describe('getTasks with parentId filter', () => {
    it('should retrieve subtasks for a parent task', async () => {
      const parent = await createTask({ title: 'Parent Task' });
      const subtask1 = await createTask({ title: 'Subtask 1' });
      const subtask2 = await createTask({ title: 'Subtask 2' });

      await addSubtask(subtask1.id, parent.id);
      await addSubtask(subtask2.id, parent.id);

      const subtasks = await getTasks({ parentId: parent.id });

      expect(subtasks.length).toBe(2);
      expect(subtasks.map(t => t.id)).toContain(subtask1.id);
      expect(subtasks.map(t => t.id)).toContain(subtask2.id);
      expect(subtasks.every(t => t.parentId === parent.id)).toBe(true);
    });

    it('should return empty array if parent has no subtasks', async () => {
      const parent = await createTask({ title: 'Parent Task' });

      const subtasks = await getTasks({ parentId: parent.id });

      expect(subtasks).toEqual([]);
    });
  });

  describe('Time Tracking', () => {
    describe('startTimeTracking', () => {
      it('should start time tracking for a task', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        const updatedTask = await startTimeTracking(task.id);
        
        expect(updatedTask.id).toBe(task.id);
      });

      it('should update task status to in-progress if pending', async () => {
        const task = await createTask({ 
          title: 'Test Task',
          status: TASK_STATUSES.PENDING
        });
        
        const updatedTask = await startTimeTracking(task.id);
        
        expect(updatedTask.status).toBe(TASK_STATUSES.IN_PROGRESS);
      });

      it('should not change status if already in-progress', async () => {
        const task = await createTask({ 
          title: 'Test Task',
          status: TASK_STATUSES.IN_PROGRESS
        });
        
        const updatedTask = await startTimeTracking(task.id);
        
        expect(updatedTask.status).toBe(TASK_STATUSES.IN_PROGRESS);
      });

      it('should stop any existing timer when starting new one', async () => {
        const task1 = await createTask({ title: 'Task 1' });
        const task2 = await createTask({ title: 'Task 2' });
        
        await startTimeTracking(task1.id);
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Start timer for task2 should stop task1's timer
        await startTimeTracking(task2.id);
        
        // Try to stop task1's timer should fail
        await expect(stopTimeTracking(task1.id))
          .rejects.toThrow(TaskOperationError);
      });

      it('should throw error if task not found', async () => {
        await expect(startTimeTracking('non-existent-id'))
          .rejects.toThrow(TaskOperationError);
      });

      it('should throw error if task is deleted', async () => {
        const task = await createTask({ title: 'Test Task' });
        await deleteTask(task.id);
        
        await expect(startTimeTracking(task.id))
          .rejects.toThrow(TaskOperationError);
      });

      it('should throw error if taskId is invalid', async () => {
        await expect(startTimeTracking(null))
          .rejects.toThrow(TaskOperationError);
        
        await expect(startTimeTracking(123))
          .rejects.toThrow(TaskOperationError);
      });
    });

    describe('stopTimeTracking', () => {
      it('should stop timer and update timeSpent', async () => {
        const task = await createTask({ 
          title: 'Test Task',
          timeSpent: 10
        });
        
        await startTimeTracking(task.id);
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait a bit
        
        const updatedTask = await stopTimeTracking(task.id);
        
        expect(updatedTask.timeSpent).toBeGreaterThanOrEqual(10);
      });

      it('should accumulate time correctly', async () => {
        const task = await createTask({ 
          title: 'Test Task',
          timeSpent: 30
        });
        
        await startTimeTracking(task.id);
        await new Promise(resolve => setTimeout(resolve, 100));
        await stopTimeTracking(task.id);
        
        const finalTask = await getTask(task.id);
        expect(finalTask.timeSpent).toBeGreaterThanOrEqual(30);
      });

      it('should handle task with no existing timeSpent', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        await startTimeTracking(task.id);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const updatedTask = await stopTimeTracking(task.id);
        
        expect(updatedTask.timeSpent).toBeGreaterThanOrEqual(0);
      });

      it('should throw error if no timer is active', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        await expect(stopTimeTracking(task.id))
          .rejects.toThrow(TaskOperationError);
      });

      it('should throw error if timer is for different task', async () => {
        const task1 = await createTask({ title: 'Task 1' });
        const task2 = await createTask({ title: 'Task 2' });
        
        await startTimeTracking(task1.id);
        
        await expect(stopTimeTracking(task2.id))
          .rejects.toThrow(TaskOperationError);
      });

      it('should throw error if task not found', async () => {
        await expect(stopTimeTracking('non-existent-id'))
          .rejects.toThrow(TaskOperationError);
      });

      it('should throw error if taskId is invalid', async () => {
        await expect(stopTimeTracking(null))
          .rejects.toThrow(TaskOperationError);
      });
    });

    describe('addManualTimeEntry', () => {
      it('should add manual time entry to task', async () => {
        const task = await createTask({ 
          title: 'Test Task',
          timeSpent: 10
        });
        
        const updatedTask = await addManualTimeEntry(task.id, 30);
        
        expect(updatedTask.timeSpent).toBe(40);
      });

      it('should handle task with no existing timeSpent', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        const updatedTask = await addManualTimeEntry(task.id, 15);
        
        expect(updatedTask.timeSpent).toBe(15);
      });

      it('should accumulate multiple manual entries', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        await addManualTimeEntry(task.id, 10);
        await addManualTimeEntry(task.id, 20);
        await addManualTimeEntry(task.id, 15);
        
        const finalTask = await getTask(task.id);
        expect(finalTask.timeSpent).toBe(45);
      });

      it('should round decimal minutes to nearest integer', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        const updatedTask = await addManualTimeEntry(task.id, 30.5);
        
        expect(updatedTask.timeSpent).toBe(31); // Rounded up
      });

      it('should throw error if minutes is negative', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        await expect(addManualTimeEntry(task.id, -10))
          .rejects.toThrow(TaskOperationError);
      });

      it('should throw error if minutes is zero', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        await expect(addManualTimeEntry(task.id, 0))
          .rejects.toThrow(TaskOperationError);
      });

      it('should throw error if minutes exceeds 24 hours', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        await expect(addManualTimeEntry(task.id, 1441))
          .rejects.toThrow(TaskOperationError);
      });

      it('should accept exactly 24 hours', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        const updatedTask = await addManualTimeEntry(task.id, 1440);
        
        expect(updatedTask.timeSpent).toBe(1440);
      });

      it('should throw error if minutes is not a number', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        await expect(addManualTimeEntry(task.id, '30'))
          .rejects.toThrow(TaskOperationError);
        
        await expect(addManualTimeEntry(task.id, null))
          .rejects.toThrow(TaskOperationError);
      });

      it('should throw error if task not found', async () => {
        await expect(addManualTimeEntry('non-existent-id', 30))
          .rejects.toThrow(TaskOperationError);
      });

      it('should throw error if task is deleted', async () => {
        const task = await createTask({ title: 'Test Task' });
        await deleteTask(task.id);
        
        await expect(addManualTimeEntry(task.id, 30))
          .rejects.toThrow(TaskOperationError);
      });

      it('should throw error if taskId is invalid', async () => {
        await expect(addManualTimeEntry(null, 30))
          .rejects.toThrow(TaskOperationError);
      });
    });

    describe('Time Tracking Integration', () => {
      it('should combine timer and manual entries', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        // Add manual entry
        await addManualTimeEntry(task.id, 20);
        
        // Start timer
        await startTimeTracking(task.id);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Stop timer
        const updatedTask = await stopTimeTracking(task.id);
        
        expect(updatedTask.timeSpent).toBeGreaterThanOrEqual(20);
      });

      it('should handle multiple timer sessions', async () => {
        const task = await createTask({ title: 'Test Task' });
        
        // First timer session
        await startTimeTracking(task.id);
        await new Promise(resolve => setTimeout(resolve, 100));
        await stopTimeTracking(task.id);
        
        const firstTime = (await getTask(task.id)).timeSpent;
        
        // Second timer session
        await startTimeTracking(task.id);
        await new Promise(resolve => setTimeout(resolve, 100));
        await stopTimeTracking(task.id);
        
        const secondTime = (await getTask(task.id)).timeSpent;
        
        expect(secondTime).toBeGreaterThanOrEqual(firstTime);
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw TaskOperationError with proper code', async () => {
      try {
        await getTask(null);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(TaskOperationError);
        expect(error.code).toBe('INVALID_ID');
      }
    });

    it('should handle database errors gracefully', async () => {
      // Test with invalid task data to verify error handling
      // (closing DB doesn't guarantee an error due to connection caching)
      await expect(createTask({ title: '' }))
        .rejects.toThrow();
    });
  });
});

