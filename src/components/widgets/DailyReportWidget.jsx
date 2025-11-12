/**
 * Daily Report Widget Component
 * 
 * Aggregates today's data from tasks, exercises, and journal
 */

import { useState, useEffect } from 'react';
import { getTasks } from '../../tasks/crud/index.js';
import { getExerciseLogs } from '../../exercises/crud/index.js';
import { getJournalEntries } from '../../journal/crud/index.js';
import { TASK_STATUSES } from '../../tasks/models/Task.js';

export default function DailyReportWidget() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get today's completed tasks
      const allTasks = await getTasks().catch(() => []);
      const completedToday = (allTasks || []).filter(task => {
        if (!task || task.status !== TASK_STATUSES.COMPLETED || !task.completedAt) return false;
        const completedDate = new Date(task.completedAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === today.getTime();
      });
      
      // Get today's exercise logs
      const exerciseLogs = await getExerciseLogs({
        startDate: today,
        endDate: tomorrow
      }).catch(() => []);
      
      // Get today's journal entry (get all entries and filter client-side for reliability)
      const allJournalEntries = await getJournalEntries().catch(() => []);
      const todayJournalEntry = (allJournalEntries || []).find(entry => {
        if (!entry || !entry.date) return false;
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === today.getTime();
      });
      const hasJournalEntry = !!todayJournalEntry;
      
      // Calculate total time spent on tasks
      const totalTaskTime = completedToday.reduce((sum, task) => sum + (task.timeSpent || 0), 0);
      
      // Calculate exercise stats
      const totalExerciseAmount = exerciseLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
      const uniqueExercises = new Set(exerciseLogs.map(log => log.exerciseId)).size;
      
      setReport({
        tasksCompleted: completedToday.length,
        totalTaskTime,
        exercisesLogged: exerciseLogs.length,
        totalExerciseAmount,
        uniqueExercises,
        hasJournalEntry,
        completedTasks: completedToday.slice(0, 3) // Show first 3 completed tasks
      });
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
    // Refresh every 5 minutes
    const interval = setInterval(generateReport, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card-glow h-full p-4">
        <h3 className="text-lg font-semibold mb-4">Daily Report</h3>
        <div className="text-dark-text-tertiary text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glow h-full p-4">
        <h3 className="text-lg font-semibold mb-4">Daily Report</h3>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card-glow h-full p-4">
        <h3 className="text-lg font-semibold mb-4">Daily Report</h3>
        <div className="text-dark-text-tertiary text-sm">No data available</div>
      </div>
    );
  }

  return (
    <div className="card-glow h-full p-5 flex flex-col overflow-hidden">
      <h3 className="text-lg font-semibold mb-4 flex-shrink-0">Daily Report</h3>
      
      <div className="flex-1 min-h-0 flex flex-col space-y-3">
        {/* Tasks Section */}
        <div className="p-3 rounded-lg bg-dark-bg-secondary border border-dark-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-dark-text-primary">Tasks</span>
            <span className="text-base font-bold text-purple-400">{report.tasksCompleted}</span>
          </div>
          <p className="text-xs text-dark-text-tertiary">
            {report.totalTaskTime > 0 
              ? `${Math.round(report.totalTaskTime / 60 * 10) / 10}h spent`
              : 'No time tracked'}
          </p>
          {report.completedTasks.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {report.completedTasks.map((task) => (
                <div key={task.id} className="text-xs text-dark-text-tertiary flex items-center gap-1.5">
                  <span className="text-green-400">✓</span>
                  <span className="truncate">{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Exercise Section */}
        <div className="p-3 rounded-lg bg-dark-bg-secondary border border-dark-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-dark-text-primary">Exercise</span>
            <span className="text-base font-bold text-purple-400">{report.exercisesLogged}</span>
          </div>
          <p className="text-xs text-dark-text-tertiary">
            {report.uniqueExercises > 0 
              ? `${report.uniqueExercises} ${report.uniqueExercises === 1 ? 'type' : 'types'} logged`
              : 'No exercises logged'}
          </p>
          {report.totalExerciseAmount > 0 && (
            <p className="text-xs text-dark-text-tertiary mt-1">
              Total: {report.totalExerciseAmount} units
            </p>
          )}
        </div>
        
        {/* Journal Section */}
        <div className="p-3 rounded-lg bg-dark-bg-secondary border border-dark-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-dark-text-primary">Journal</span>
            <span className={`text-base font-bold ${report.hasJournalEntry ? 'text-green-400' : 'text-dark-text-tertiary'}`}>
              {report.hasJournalEntry ? '✓' : '—'}
            </span>
          </div>
          <p className="text-xs text-dark-text-tertiary">
            {report.hasJournalEntry ? 'Entry written today' : 'No entry yet'}
          </p>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-dark-border flex-shrink-0">
        <a
          href="/reports"
          className="block text-center text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          View Full Report
        </a>
      </div>
    </div>
  );
}

