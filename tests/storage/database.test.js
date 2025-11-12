import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, closeDatabase, getDatabase } from '../../src/storage/indexeddb/database.js';
import { tasksStore } from '../../src/storage/index.js';

describe('IndexedDB Storage', () => {
  beforeEach(async () => {
    // Close any existing database connections
    await closeDatabase();
    // Initialize fresh database
    await initDatabase();
  });

  afterEach(async () => {
    // Clean up
    await closeDatabase();
  });

  describe('Database Initialization', () => {
    it('should initialize database successfully', async () => {
      const db = await getDatabase();
      expect(db).toBeDefined();
      expect(db.name).toBe('productivity-app');
      expect(db.version).toBe(1);
    });

    it('should create all required object stores', async () => {
      const db = await getDatabase();
      const storeNames = Array.from(db.objectStoreNames);
      
      expect(storeNames).toContain('tasks');
      expect(storeNames).toContain('events');
      expect(storeNames).toContain('journalEntries');
      expect(storeNames).toContain('exercises');
      expect(storeNames).toContain('exerciseGoals');
      expect(storeNames).toContain('exerciseLogs');
    });

    it('should create indexes on tasks store', async () => {
      const db = await getDatabase();
      const transaction = db.transaction('tasks', 'readonly');
      const store = transaction.objectStore('tasks');
      const indexNames = Array.from(store.indexNames);

      expect(indexNames).toContain('byDueDate');
      expect(indexNames).toContain('byStatus');
      expect(indexNames).toContain('byPriority');
      expect(indexNames).toContain('byContext');
    });
  });

  describe('TasksStore CRUD Operations', () => {
    it('should create a task', async () => {
      const taskData = {
        id: crypto.randomUUID(),
        title: 'Test Task',
        status: 'pending',
        priority: 'high',
        context: 'work',
        createdAt: new Date().toISOString()
      };

      const created = await tasksStore.create(taskData);
      expect(created).toBeDefined();
      expect(created.id).toBe(taskData.id);
      expect(created.title).toBe('Test Task');
    });

    it('should retrieve a task by id', async () => {
      const taskData = {
        id: crypto.randomUUID(),
        title: 'Test Task',
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await tasksStore.create(taskData);
      const retrieved = await tasksStore.get(taskData.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(taskData.id);
      expect(retrieved.title).toBe('Test Task');
    });

    it('should update a task', async () => {
      const taskData = {
        id: crypto.randomUUID(),
        title: 'Test Task',
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await tasksStore.create(taskData);
      const updated = await tasksStore.update(taskData.id, {
        status: 'completed'
      });

      expect(updated.status).toBe('completed');
      expect(updated.updatedAt).toBeDefined();
    });

    it('should delete a task', async () => {
      const taskData = {
        id: crypto.randomUUID(),
        title: 'Test Task',
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await tasksStore.create(taskData);
      await tasksStore.delete(taskData.id);

      const retrieved = await tasksStore.get(taskData.id);
      expect(retrieved).toBeUndefined();
    });

    it('should get all tasks', async () => {
      const task1 = {
        id: crypto.randomUUID(),
        title: 'Task 1',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      const task2 = {
        id: crypto.randomUUID(),
        title: 'Task 2',
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await tasksStore.create(task1);
      await tasksStore.create(task2);

      const all = await tasksStore.getAll();
      expect(all.length).toBeGreaterThanOrEqual(2);
      expect(all.some(t => t.id === task1.id)).toBe(true);
      expect(all.some(t => t.id === task2.id)).toBe(true);
    });

    it('should query tasks by status', async () => {
      const pendingTask = {
        id: crypto.randomUUID(),
        title: 'Pending Task',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      const completedTask = {
        id: crypto.randomUUID(),
        title: 'Completed Task',
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      await tasksStore.create(pendingTask);
      await tasksStore.create(completedTask);

      const pending = await tasksStore.getByStatus('pending');
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending.some(t => t.id === pendingTask.id)).toBe(true);
    });

    it('should soft delete a task', async () => {
      const taskData = {
        id: crypto.randomUUID(),
        title: 'Test Task',
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await tasksStore.create(taskData);
      const softDeleted = await tasksStore.softDelete(taskData.id);

      expect(softDeleted.deletedAt).toBeDefined();
      expect(softDeleted.status).toBe('cancelled');

      const active = await tasksStore.getActive();
      expect(active.some(t => t.id === taskData.id)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when creating task without required data', async () => {
      await expect(tasksStore.create(null)).rejects.toThrow();
    });

    it('should throw error when getting task with invalid key', async () => {
      await expect(tasksStore.get(null)).rejects.toThrow();
    });

    it('should throw error when updating non-existent task', async () => {
      await expect(
        tasksStore.update('non-existent-id', { status: 'completed' })
      ).rejects.toThrow();
    });
  });
});

