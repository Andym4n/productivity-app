import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateDependencyAddition,
  validateSubtaskCreation,
  getAllDependencies,
  getDependents,
  CircularDependencyError
} from '../../../src/tasks/utils/dependencies.js';
import { TaskOperationError } from '../../../src/tasks/crud/errors.js';
import * as crud from '../../../src/tasks/crud/index.js';

// Mock the CRUD module
vi.mock('../../../src/tasks/crud/index.js', () => ({
  getTask: vi.fn(),
  getTasks: vi.fn()
}));

describe('Dependencies Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateDependencyAddition', () => {
    it('should allow adding a valid dependency', async () => {
      const taskId = 'task-1';
      const dependencyId = 'task-2';

      crud.getTask.mockImplementation(async (id) => {
        if (id === taskId) {
          return {
            id: taskId,
            title: 'Task 1',
            dependencies: []
          };
        }
        if (id === dependencyId) {
          return {
            id: dependencyId,
            title: 'Task 2',
            dependencies: []
          };
        }
        return null;
      });

      crud.getTasks.mockResolvedValue([
        { id: taskId, title: 'Task 1', dependencies: [] },
        { id: dependencyId, title: 'Task 2', dependencies: [] }
      ]);

      await expect(
        validateDependencyAddition(taskId, dependencyId)
      ).resolves.not.toThrow();
    });

    it('should throw error if task depends on itself', async () => {
      const taskId = 'task-1';

      crud.getTask.mockResolvedValue({
        id: taskId,
        title: 'Task 1',
        dependencies: []
      });

      await expect(
        validateDependencyAddition(taskId, taskId)
      ).rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if adding dependency creates a direct cycle', async () => {
      const taskId = 'task-1';
      const dependencyId = 'task-2';

      crud.getTask.mockImplementation(async (id) => {
        if (id === taskId) {
          return {
            id: taskId,
            title: 'Task 1',
            dependencies: []
          };
        }
        if (id === dependencyId) {
          return {
            id: dependencyId,
            title: 'Task 2',
            dependencies: [taskId] // Task 2 already depends on Task 1
          };
        }
        return null;
      });

      crud.getTasks.mockResolvedValue([
        { id: taskId, title: 'Task 1', dependencies: [] },
        { id: dependencyId, title: 'Task 2', dependencies: [taskId] }
      ]);

      await expect(
        validateDependencyAddition(taskId, dependencyId)
      ).rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if adding dependency creates an indirect cycle', async () => {
      const taskId = 'task-1';
      const dependencyId = 'task-2';
      const task3Id = 'task-3';

      crud.getTask.mockImplementation(async (id) => {
        if (id === taskId) {
          return {
            id: taskId,
            title: 'Task 1',
            dependencies: []
          };
        }
        if (id === dependencyId) {
          return {
            id: dependencyId,
            title: 'Task 2',
            dependencies: [task3Id]
          };
        }
        if (id === task3Id) {
          return {
            id: task3Id,
            title: 'Task 3',
            dependencies: [taskId] // Task 3 depends on Task 1
          };
        }
        return null;
      });

      crud.getTasks.mockResolvedValue([
        { id: taskId, title: 'Task 1', dependencies: [] },
        { id: dependencyId, title: 'Task 2', dependencies: [task3Id] },
        { id: task3Id, title: 'Task 3', dependencies: [taskId] }
      ]);

      await expect(
        validateDependencyAddition(taskId, dependencyId)
      ).rejects.toThrow(CircularDependencyError);
    });

    it('should allow adding dependency if it already exists', async () => {
      const taskId = 'task-1';
      const dependencyId = 'task-2';

      crud.getTask.mockResolvedValue({
        id: taskId,
        title: 'Task 1',
        dependencies: [dependencyId] // Already a dependency
      });

      await expect(
        validateDependencyAddition(taskId, dependencyId)
      ).resolves.not.toThrow();
    });

    it('should throw error if task not found', async () => {
      crud.getTask.mockResolvedValue(null);

      await expect(
        validateDependencyAddition('task-1', 'task-2')
      ).rejects.toThrow(TaskOperationError);
    });

    it('should throw error if dependency not found', async () => {
      crud.getTask.mockImplementation(async (id) => {
        if (id === 'task-1') {
          return { id: 'task-1', title: 'Task 1', dependencies: [] };
        }
        return null;
      });

      await expect(
        validateDependencyAddition('task-1', 'task-2')
      ).rejects.toThrow(TaskOperationError);
    });
  });

  describe('validateSubtaskCreation', () => {
    it('should allow creating a valid subtask', async () => {
      const subtaskId = 'task-1';
      const parentId = 'task-2';

      crud.getTask.mockImplementation(async (id) => {
        if (id === subtaskId) {
          return {
            id: subtaskId,
            title: 'Subtask',
            dependencies: [],
            parentId: null
          };
        }
        if (id === parentId) {
          return {
            id: parentId,
            title: 'Parent',
            dependencies: [],
            parentId: null
          };
        }
        return null;
      });

      crud.getTasks.mockResolvedValue([
        { id: subtaskId, title: 'Subtask', dependencies: [], parentId: null },
        { id: parentId, title: 'Parent', dependencies: [], parentId: null }
      ]);

      await expect(
        validateSubtaskCreation(subtaskId, parentId)
      ).resolves.not.toThrow();
    });

    it('should throw error if task is subtask of itself', async () => {
      const taskId = 'task-1';

      crud.getTask.mockResolvedValue({
        id: taskId,
        title: 'Task',
        dependencies: []
      });

      await expect(
        validateSubtaskCreation(taskId, taskId)
      ).rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if parent is already a dependency of subtask', async () => {
      const subtaskId = 'task-1';
      const parentId = 'task-2';

      crud.getTask.mockImplementation(async (id) => {
        if (id === subtaskId) {
          return {
            id: subtaskId,
            title: 'Subtask',
            dependencies: [parentId], // Parent is already a dependency
            parentId: null
          };
        }
        if (id === parentId) {
          return {
            id: parentId,
            title: 'Parent',
            dependencies: [],
            parentId: null
          };
        }
        return null;
      });

      await expect(
        validateSubtaskCreation(subtaskId, parentId)
      ).rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if ancestor is a dependency of subtask', async () => {
      const subtaskId = 'task-1';
      const parentId = 'task-2';
      const grandparentId = 'task-3';

      crud.getTask.mockImplementation(async (id) => {
        if (id === subtaskId) {
          return {
            id: subtaskId,
            title: 'Subtask',
            dependencies: [grandparentId], // Grandparent is a dependency
            parentId: null
          };
        }
        if (id === parentId) {
          return {
            id: parentId,
            title: 'Parent',
            dependencies: [],
            parentId: grandparentId
          };
        }
        if (id === grandparentId) {
          return {
            id: grandparentId,
            title: 'Grandparent',
            dependencies: [],
            parentId: null
          };
        }
        return null;
      });

      await expect(
        validateSubtaskCreation(subtaskId, parentId)
      ).rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if parent depends on subtask', async () => {
      const subtaskId = 'task-1';
      const parentId = 'task-2';

      crud.getTask.mockImplementation(async (id) => {
        if (id === subtaskId) {
          return {
            id: subtaskId,
            title: 'Subtask',
            dependencies: [],
            parentId: null
          };
        }
        if (id === parentId) {
          return {
            id: parentId,
            title: 'Parent',
            dependencies: [subtaskId], // Parent depends on subtask
            parentId: null
          };
        }
        return null;
      });

      crud.getTasks.mockResolvedValue([
        { id: subtaskId, title: 'Subtask', dependencies: [], parentId: null },
        { id: parentId, title: 'Parent', dependencies: [subtaskId], parentId: null }
      ]);

      await expect(
        validateSubtaskCreation(subtaskId, parentId)
      ).rejects.toThrow(CircularDependencyError);
    });

    it('should throw error if subtask not found', async () => {
      crud.getTask.mockResolvedValue(null);

      await expect(
        validateSubtaskCreation('task-1', 'task-2')
      ).rejects.toThrow(TaskOperationError);
    });

    it('should throw error if parent not found', async () => {
      crud.getTask.mockImplementation(async (id) => {
        if (id === 'task-1') {
          return { id: 'task-1', title: 'Subtask', dependencies: [] };
        }
        return null;
      });

      await expect(
        validateSubtaskCreation('task-1', 'task-2')
      ).rejects.toThrow(TaskOperationError);
    });
  });

  describe('getAllDependencies', () => {
    it('should return all direct dependencies', async () => {
      const taskId = 'task-1';
      const dep1Id = 'dep-1';
      const dep2Id = 'dep-2';

      crud.getTask.mockImplementation(async (id) => {
        if (id === taskId) {
          return {
            id: taskId,
            title: 'Task',
            dependencies: [dep1Id, dep2Id]
          };
        }
        if (id === dep1Id) {
          return { id: dep1Id, title: 'Dep 1', dependencies: [] };
        }
        if (id === dep2Id) {
          return { id: dep2Id, title: 'Dep 2', dependencies: [] };
        }
        return null;
      });

      const dependencies = await getAllDependencies(taskId);

      expect(dependencies).toHaveLength(2);
      expect(dependencies.map(d => d.id)).toContain(dep1Id);
      expect(dependencies.map(d => d.id)).toContain(dep2Id);
    });

    it('should return transitive dependencies', async () => {
      const taskId = 'task-1';
      const dep1Id = 'dep-1';
      const dep2Id = 'dep-2';

      crud.getTask.mockImplementation(async (id) => {
        if (id === taskId) {
          return {
            id: taskId,
            title: 'Task',
            dependencies: [dep1Id]
          };
        }
        if (id === dep1Id) {
          return {
            id: dep1Id,
            title: 'Dep 1',
            dependencies: [dep2Id]
          };
        }
        if (id === dep2Id) {
          return { id: dep2Id, title: 'Dep 2', dependencies: [] };
        }
        return null;
      });

      const dependencies = await getAllDependencies(taskId);

      expect(dependencies).toHaveLength(2);
      expect(dependencies.map(d => d.id)).toContain(dep1Id);
      expect(dependencies.map(d => d.id)).toContain(dep2Id);
    });

    it('should return empty array if no dependencies', async () => {
      const taskId = 'task-1';

      crud.getTask.mockResolvedValue({
        id: taskId,
        title: 'Task',
        dependencies: []
      });

      const dependencies = await getAllDependencies(taskId);

      expect(dependencies).toEqual([]);
    });

    it('should throw error if task not found', async () => {
      crud.getTask.mockResolvedValue(null);

      await expect(
        getAllDependencies('task-1')
      ).rejects.toThrow(TaskOperationError);
    });
  });

  describe('getDependents', () => {
    it('should return all tasks that depend on the given task', async () => {
      const taskId = 'task-1';
      const dependent1Id = 'dep-1';
      const dependent2Id = 'dep-2';

      crud.getTasks.mockResolvedValue([
        {
          id: dependent1Id,
          title: 'Dependent 1',
          dependencies: [taskId]
        },
        {
          id: dependent2Id,
          title: 'Dependent 2',
          dependencies: [taskId]
        },
        {
          id: 'task-3',
          title: 'Task 3',
          dependencies: []
        }
      ]);

      const dependents = await getDependents(taskId);

      expect(dependents).toHaveLength(2);
      expect(dependents.map(d => d.id)).toContain(dependent1Id);
      expect(dependents.map(d => d.id)).toContain(dependent2Id);
    });

    it('should return empty array if no dependents', async () => {
      const taskId = 'task-1';

      crud.getTasks.mockResolvedValue([
        {
          id: 'task-2',
          title: 'Task 2',
          dependencies: []
        }
      ]);

      const dependents = await getDependents(taskId);

      expect(dependents).toEqual([]);
    });

    it('should throw error if task ID is invalid', async () => {
      await expect(
        getDependents(null)
      ).rejects.toThrow(TaskOperationError);
    });
  });
});

