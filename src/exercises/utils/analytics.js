/**
 * Exercise Analytics Utilities
 * 
 * Provides functions for generating analytics data for Chart.js visualization.
 * Includes trend analysis, goal completion rates, and performance metrics.
 */

import { parseISO, startOfDay, endOfDay, subDays, format, isSameDay } from 'date-fns';
import { getExerciseLogs, getExerciseGoals, getExercises } from '../crud/index.js';
import { calculateProgressPercentage, getProgressStatus } from './progress.js';

/**
 * Generates chart data for exercise trends over time
 * @param {string} exerciseId - Exercise ID
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {string} groupBy - Grouping: 'day' | 'week' | 'month' (default: 'day')
 * @returns {Promise<Object>} Promise resolving to Chart.js data format
 */
export async function generateTrendData(exerciseId, startDate, endDate, groupBy = 'day') {
  const start = startDate instanceof Date ? startDate : parseISO(startDate);
  const end = endDate instanceof Date ? endDate : parseISO(endDate);
  
  // Get logs for the date range
  const logs = await getExerciseLogs({
    exerciseId,
    startDate: start,
    endDate: end
  });
  
  // Group logs by time period
  const groupedData = {};
  
  logs.forEach(log => {
    const logDate = parseISO(log.timestamp);
    let key;
    
    if (groupBy === 'day') {
      key = format(startOfDay(logDate), 'yyyy-MM-dd');
    } else if (groupBy === 'week') {
      // Get start of week (Sunday)
      const weekStart = new Date(logDate);
      weekStart.setDate(logDate.getDate() - logDate.getDay());
      key = format(startOfDay(weekStart), 'yyyy-MM-dd');
    } else if (groupBy === 'month') {
      key = format(logDate, 'yyyy-MM');
    }
    
    if (!groupedData[key]) {
      groupedData[key] = 0;
    }
    groupedData[key] += log.amount;
  });
  
  // Convert to arrays for Chart.js
  const labels = Object.keys(groupedData).sort();
  const data = labels.map(label => groupedData[label]);
  
  return {
    labels,
    datasets: [{
      label: 'Exercise Progress',
      data,
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    }]
  };
}

/**
 * Generates chart data for goal completion rates
 * @param {string} exerciseId - Exercise ID (optional, if not provided uses all exercises)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Promise<Object>} Promise resolving to Chart.js data format
 */
export async function generateGoalCompletionData(exerciseId = null, startDate, endDate) {
  const start = startDate instanceof Date ? startDate : parseISO(startDate);
  const end = endDate instanceof Date ? endDate : parseISO(endDate);
  
  // Get goals for the date range
  let goals = [];
  if (exerciseId) {
    const exerciseGoals = await getExerciseGoals({ exerciseId });
    goals = exerciseGoals.filter(goal => {
      const goalDate = parseISO(goal.date);
      return goalDate >= start && goalDate <= end;
    });
  } else {
    const allGoals = await getExerciseGoals({});
    goals = allGoals.filter(goal => {
      const goalDate = parseISO(goal.date);
      return goalDate >= start && goalDate <= end;
    });
  }
  
  // Calculate completion statistics
  const completed = goals.filter(g => getProgressStatus(g) === 'completed').length;
  const inProgress = goals.filter(g => getProgressStatus(g) === 'in-progress').length;
  const notStarted = goals.filter(g => getProgressStatus(g) === 'not-started').length;
  
  return {
    labels: ['Completed', 'In Progress', 'Not Started'],
    datasets: [{
      label: 'Goal Status',
      data: [completed, inProgress, notStarted],
      backgroundColor: [
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(255, 99, 132, 0.6)'
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(255, 99, 132, 1)'
      ],
      borderWidth: 1
    }]
  };
}

/**
 * Generates chart data for performance over time (comparing multiple exercises)
 * @param {Array<string>} exerciseIds - Array of exercise IDs
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Promise<Object>} Promise resolving to Chart.js data format
 */
export async function generatePerformanceComparisonData(exerciseIds, startDate, endDate) {
  const start = startDate instanceof Date ? startDate : parseISO(startDate);
  const end = endDate instanceof Date ? endDate : parseISO(endDate);
  
  // Get all exercises
  const exercises = await getExercises({});
  const selectedExercises = exercises.filter(ex => exerciseIds.includes(ex.id));
  
  // Get all unique dates first
  const allDates = new Set();
  for (const exercise of selectedExercises) {
    const logs = await getExerciseLogs({
      exerciseId: exercise.id,
      startDate: start,
      endDate: end
    });
    logs.forEach(log => {
      const logDate = parseISO(log.timestamp);
      allDates.add(format(startOfDay(logDate), 'yyyy-MM-dd'));
    });
  }
  
  const labels = Array.from(allDates).sort();
  
  // Generate data for each exercise
  const datasets = await Promise.all(
    selectedExercises.map(async (exercise, index) => {
      const logs = await getExerciseLogs({
        exerciseId: exercise.id,
        startDate: start,
        endDate: end
      });
      
      // Group by day
      const dailyTotals = {};
      logs.forEach(log => {
        const logDate = parseISO(log.timestamp);
        const dayKey = format(startOfDay(logDate), 'yyyy-MM-dd');
        if (!dailyTotals[dayKey]) {
          dailyTotals[dayKey] = 0;
        }
        dailyTotals[dayKey] += log.amount;
      });
      
      // Map to labels array, filling in 0 for missing dates
      const data = labels.map(label => dailyTotals[label] || 0);
      
      // Generate colors
      const hue = (index * 360) / selectedExercises.length;
      const color = `hsl(${hue}, 70%, 50%)`;
      
      return {
        label: exercise.name,
        data,
        borderColor: color,
        backgroundColor: color.replace('50%)', '20%)'),
        tension: 0.1
      };
    })
  );
  
  return {
    labels,
    datasets
  };
}

/**
 * Generates summary statistics for an exercise
 * @param {string} exerciseId - Exercise ID
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Promise<Object>} Promise resolving to summary statistics
 */
export async function generateExerciseSummary(exerciseId, startDate, endDate) {
  const start = startDate instanceof Date ? startDate : parseISO(startDate);
  const end = endDate instanceof Date ? endDate : parseISO(endDate);
  
  // Get logs and goals
  const logs = await getExerciseLogs({
    exerciseId,
    startDate: start,
    endDate: end
  });
  
  const goals = await getExerciseGoals({ exerciseId });
  const periodGoals = goals.filter(goal => {
    const goalDate = parseISO(goal.date);
    return goalDate >= start && goalDate <= end;
  });
  
  // Calculate statistics
  const totalLogged = logs.reduce((sum, log) => sum + log.amount, 0);
  const averagePerDay = logs.length > 0 ? totalLogged / logs.length : 0;
  const completedGoals = periodGoals.filter(g => getProgressStatus(g) === 'completed').length;
  const completionRate = periodGoals.length > 0 
    ? (completedGoals / periodGoals.length) * 100 
    : 0;
  
  // Calculate best day
  const dailyTotals = {};
  logs.forEach(log => {
    const logDate = parseISO(log.timestamp);
    const dayKey = format(startOfDay(logDate), 'yyyy-MM-dd');
    if (!dailyTotals[dayKey]) {
      dailyTotals[dayKey] = 0;
    }
    dailyTotals[dayKey] += log.amount;
  });
  
  const bestDay = Object.entries(dailyTotals).reduce((best, [day, total]) => {
    return total > best.total ? { day, total } : best;
  }, { day: null, total: 0 });
  
  return {
    totalLogged,
    logCount: logs.length,
    averagePerDay: Math.round(averagePerDay * 100) / 100,
    goalCount: periodGoals.length,
    completedGoals,
    completionRate: Math.round(completionRate * 100) / 100,
    bestDay: bestDay.day ? {
      date: bestDay.day,
      total: bestDay.total
    } : null
  };
}

/**
 * Generates chart data for daily progress over the last N days
 * @param {string} exerciseId - Exercise ID
 * @param {number} days - Number of days to look back (default: 7)
 * @returns {Promise<Object>} Promise resolving to Chart.js data format
 */
export async function generateRecentProgressData(exerciseId, days = 7) {
  const endDate = new Date();
  const startDate = subDays(endDate, days - 1);
  
  return generateTrendData(exerciseId, startDate, endDate, 'day');
}

export default {
  generateTrendData,
  generateGoalCompletionData,
  generatePerformanceComparisonData,
  generateExerciseSummary,
  generateRecentProgressData
};

