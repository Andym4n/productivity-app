/**
 * Exercise Progress Utilities
 * 
 * Provides functions for calculating progress percentages, progress bars,
 * and incremental progress tracking for exercises and goals.
 */

import { parseISO, isSameDay, startOfDay } from 'date-fns';
import { getExerciseGoals, getExerciseLogs } from '../crud/index.js';

/**
 * Calculates progress percentage for a goal
 * @param {Object} goal - ExerciseGoal object
 * @returns {number} Progress percentage (0-100)
 */
export function calculateProgressPercentage(goal) {
  if (!goal || goal.target === 0) {
    return 0;
  }
  
  const percentage = (goal.completed / goal.target) * 100;
  return Math.min(100, Math.max(0, Math.round(percentage * 100) / 100)); // Round to 2 decimal places
}

/**
 * Gets progress status for a goal
 * @param {Object} goal - ExerciseGoal object
 * @returns {string} 'completed' | 'in-progress' | 'not-started'
 */
export function getProgressStatus(goal) {
  if (!goal) {
    return 'not-started';
  }
  
  if (goal.completed >= goal.target) {
    return 'completed';
  }
  
  if (goal.completed > 0) {
    return 'in-progress';
  }
  
  return 'not-started';
}

/**
 * Calculates total progress for an exercise on a specific date
 * @param {string} exerciseId - Exercise ID
 * @param {Date|string} date - Date to calculate progress for
 * @returns {Promise<Object>} Promise resolving to progress object
 */
export async function calculateDailyProgress(exerciseId, date) {
  const dateObj = date instanceof Date ? date : parseISO(date);
  const startOfDate = startOfDay(dateObj);
  
  // Get goals for this date
  const goals = await getExerciseGoals({ date: dateObj });
  const exerciseGoals = goals.filter(g => g.exerciseId === exerciseId);
  
  // Get logs for this date
  const endOfDate = new Date(startOfDate);
  endOfDate.setHours(23, 59, 59, 999);
  
  const logs = await getExerciseLogs({
    exerciseId,
    startDate: startOfDate,
    endDate: endOfDate
  });
  
  // Calculate total logged amount for the day
  const totalLogged = logs.reduce((sum, log) => sum + log.amount, 0);
  
  // Calculate progress for each goal
  const goalProgress = exerciseGoals.map(goal => ({
    goalId: goal.id,
    target: goal.target,
    completed: goal.completed,
    percentage: calculateProgressPercentage(goal),
    status: getProgressStatus(goal),
    remaining: Math.max(0, goal.target - goal.completed)
  }));
  
  return {
    date: startOfDate.toISOString(),
    totalLogged,
    goals: goalProgress,
    overallProgress: exerciseGoals.length > 0
      ? exerciseGoals.reduce((sum, g) => sum + calculateProgressPercentage(g), 0) / exerciseGoals.length
      : 0
  };
}

/**
 * Calculates progress for a goal with detailed information
 * @param {Object} goal - ExerciseGoal object
 * @param {Array} logs - Array of ExerciseLog objects for this goal
 * @returns {Object} Detailed progress information
 */
export function calculateGoalProgress(goal, logs = []) {
  if (!goal) {
    return {
      percentage: 0,
      status: 'not-started',
      completed: 0,
      target: 0,
      remaining: 0,
      logCount: 0,
      totalLogged: 0
    };
  }
  
  const totalLogged = logs.reduce((sum, log) => sum + log.amount, 0);
  
  return {
    percentage: calculateProgressPercentage(goal),
    status: getProgressStatus(goal),
    completed: goal.completed,
    target: goal.target,
    remaining: Math.max(0, goal.target - goal.completed),
    logCount: logs.length,
    totalLogged
  };
}

/**
 * Gets progress bar data for rendering
 * @param {Object} goal - ExerciseGoal object
 * @param {Object} options - Options
 * @param {number} options.maxWidth - Maximum width in pixels (default: 100)
 * @param {boolean} options.showPercentage - Show percentage text (default: true)
 * @returns {Object} Progress bar data
 */
export function getProgressBarData(goal, options = {}) {
  const { maxWidth = 100, showPercentage = true } = options;
  
  const percentage = calculateProgressPercentage(goal);
  const status = getProgressStatus(goal);
  
  return {
    percentage,
    status,
    width: (percentage / 100) * maxWidth,
    completed: goal.completed,
    target: goal.target,
    remaining: Math.max(0, goal.target - goal.completed),
    showPercentage,
    color: status === 'completed' ? 'green' : status === 'in-progress' ? 'blue' : 'gray'
  };
}

/**
 * Calculates weekly progress for an exercise
 * @param {string} exerciseId - Exercise ID
 * @param {Date|string} weekStart - Start of the week
 * @returns {Promise<Object>} Promise resolving to weekly progress
 */
export async function calculateWeeklyProgress(exerciseId, weekStart) {
  const startDate = weekStart instanceof Date ? weekStart : parseISO(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  // Get all logs for the week
  const logs = await getExerciseLogs({
    exerciseId,
    startDate,
    endDate
  });
  
  // Group logs by day
  const dailyTotals = {};
  logs.forEach(log => {
    const logDate = parseISO(log.timestamp);
    const dayKey = startOfDay(logDate).toISOString();
    if (!dailyTotals[dayKey]) {
      dailyTotals[dayKey] = 0;
    }
    dailyTotals[dayKey] += log.amount;
  });
  
  // Get goals for the week
  const goals = await getExerciseGoals({ exerciseId });
  const weekGoals = goals.filter(goal => {
    const goalDate = parseISO(goal.date);
    return goalDate >= startDate && goalDate <= endDate;
  });
  
  return {
    weekStart: startDate.toISOString(),
    weekEnd: endDate.toISOString(),
    dailyTotals,
    totalLogged: logs.reduce((sum, log) => sum + log.amount, 0),
    logCount: logs.length,
    goalCount: weekGoals.length,
    goals: weekGoals
  };
}

export default {
  calculateProgressPercentage,
  getProgressStatus,
  calculateDailyProgress,
  calculateGoalProgress,
  getProgressBarData,
  calculateWeeklyProgress
};

