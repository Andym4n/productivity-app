import { BaseStore } from './baseStore.js';

/**
 * Exercise store - handles CRUD operations for exercises, goals, and logs
 */
export class ExercisesStore extends BaseStore {
  constructor() {
    super('exercises');
  }

  /**
   * Gets exercises filtered by type
   * @param {string} type - Exercise type ('reps' | 'duration' | 'distance' | 'weight')
   * @returns {Promise<Array>} Promise resolving to filtered exercises
   */
  async getByType(type) {
    return await this.query('byType', type);
  }

  /**
   * Gets exercises filtered by category
   * @param {string} category - Exercise category
   * @returns {Promise<Array>} Promise resolving to filtered exercises
   */
  async getByCategory(category) {
    return await this.query('byCategory', category);
  }
}

/**
 * Exercise goals store
 */
export class ExerciseGoalsStore extends BaseStore {
  constructor() {
    super('exerciseGoals');
  }

  /**
   * Gets goals for a specific exercise
   * @param {string} exerciseId - Exercise ID
   * @returns {Promise<Array>} Promise resolving to goals for that exercise
   */
  async getByExerciseId(exerciseId) {
    return await this.query('byExerciseId', exerciseId);
  }

  /**
   * Gets goals for a specific date
   * @param {Date} date - Date to query
   * @returns {Promise<Array>} Promise resolving to goals for that date
   */
  async getByDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const range = globalThis.IDBKeyRange ? globalThis.IDBKeyRange.bound(startOfDay, endOfDay) : null;
    if (range) {
      return await this.query('byDate', range);
    }
    // Fallback: get all and filter
    const all = await this.getAll();
    return all.filter(goal => {
      const goalDate = new Date(goal.date);
      return goalDate >= startOfDay && goalDate <= endOfDay;
    });
  }

  /**
   * Gets incomplete goals
   * @returns {Promise<Array>} Promise resolving to incomplete goals
   */
  async getIncomplete() {
    const all = await this.getAll();
    return all.filter(goal => goal.completed < goal.target);
  }
}

/**
 * Exercise logs store
 */
export class ExerciseLogsStore extends BaseStore {
  constructor() {
    super('exerciseLogs');
  }

  /**
   * Gets logs for a specific exercise
   * @param {string} exerciseId - Exercise ID
   * @returns {Promise<Array>} Promise resolving to logs for that exercise
   */
  async getByExerciseId(exerciseId) {
    return await this.query('byExerciseId', exerciseId);
  }

  /**
   * Gets logs within a date range
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Promise<Array>} Promise resolving to filtered logs
   */
  async getByDateRange(startDate, endDate) {
    const range = globalThis.IDBKeyRange ? globalThis.IDBKeyRange.bound(startDate, endDate) : null;
    if (range) {
      return await this.query('byTimestamp', range);
    }
    // Fallback: get all and filter
    const all = await this.getAll();
    return all.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  /**
   * Gets logs for a specific goal
   * @param {string} goalId - Goal ID
   * @returns {Promise<Array>} Promise resolving to logs for that goal
   */
  async getByGoalId(goalId) {
    return await this.query('byGoalId', goalId);
  }
}

export default {
  exercises: new ExercisesStore(),
  goals: new ExerciseGoalsStore(),
  logs: new ExerciseLogsStore()
};

