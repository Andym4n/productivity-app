import { BaseStore } from './baseStore.js';

/**
 * Tasks store - handles CRUD operations for tasks
 */
export class TasksStore extends BaseStore {
  constructor() {
    super('tasks');
  }

  /**
   * Gets tasks filtered by status
   * @param {string} status - Task status ('pending' | 'in-progress' | 'completed' | 'cancelled')
   * @returns {Promise<Array>} Promise resolving to filtered tasks
   */
  async getByStatus(status) {
    return await this.query('byStatus', status);
  }

  /**
   * Gets tasks filtered by priority
   * @param {string} priority - Task priority ('high' | 'medium' | 'low')
   * @returns {Promise<Array>} Promise resolving to filtered tasks
   */
  async getByPriority(priority) {
    return await this.query('byPriority', priority);
  }

  /**
   * Gets tasks filtered by context
   * @param {string} context - Task context ('work' | 'personal')
   * @returns {Promise<Array>} Promise resolving to filtered tasks
   */
  async getByContext(context) {
    return await this.query('byContext', context);
  }

  /**
   * Gets tasks with a due date within a range
   * @param {Date|string} startDate - Start date (inclusive) - can be Date object or ISO string
   * @param {Date|string} endDate - End date (inclusive) - can be Date object or ISO string
   * @returns {Promise<Array>} Promise resolving to filtered tasks
   */
  async getByDueDateRange(startDate, endDate) {
    // Convert to ISO strings if Date objects (IndexedDB stores dates as ISO strings)
    const start = startDate instanceof Date ? startDate.toISOString() : startDate;
    const end = endDate instanceof Date ? endDate.toISOString() : endDate;
    const range = IDBKeyRange.bound(start, end);
    return await this.query('byDueDate', range);
  }

  /**
   * Gets tasks that are due today or overdue
   * @returns {Promise<Array>} Promise resolving to filtered tasks
   */
  async getDueOrOverdue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Convert to ISO string for IndexedDB query (since tasks store dates as ISO strings)
    const todayISO = today.toISOString();
    const range = IDBKeyRange.upperBound(todayISO);
    return await this.query('byDueDate', range);
  }

  /**
   * Gets subtasks for a parent task
   * @param {string} parentId - Parent task ID
   * @returns {Promise<Array>} Promise resolving to subtasks
   */
  async getSubtasks(parentId) {
    return await this.query('byParentId', parentId);
  }

  /**
   * Soft deletes a task by setting deletedAt timestamp
   * @param {string} taskId - Task ID to soft delete
   * @returns {Promise<Object>} Promise resolving to the updated task
   */
  async softDelete(taskId) {
    return await this.update(taskId, {
      deletedAt: new Date().toISOString(),
      status: 'cancelled'
    });
  }

  /**
   * Gets all non-deleted tasks
   * @returns {Promise<Array>} Promise resolving to active tasks
   */
  async getActive() {
    const all = await this.getAll();
    return all.filter(task => !task.deletedAt);
  }
}

export default new TasksStore();

