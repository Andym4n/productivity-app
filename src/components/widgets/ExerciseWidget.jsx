/**
 * Exercise Widget Component
 * 
 * Displays today's exercise goals and progress
 */

import { useState, useEffect } from 'react';
import { getExerciseGoals, getExerciseLogs, getExercise } from '../../exercises/crud/index.js';
import { calculateDailyProgress } from '../../exercises/utils/progress.js';
import { Button } from '../Button/index.js';

export default function ExerciseWidget() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTodayGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get today's goals
      const todayGoals = await getExerciseGoals({ date: today });
      
      // For each goal, get the exercise details and today's progress
      const goalsWithProgress = await Promise.all(
        todayGoals.slice(0, 3).map(async (goal) => {
          const exercise = await getExercise(goal.exerciseId);
          const progress = await calculateDailyProgress(goal.exerciseId, today);
          
          // Find progress for this specific goal
          const goalProgress = progress.goals.find(g => g.goalId === goal.id);
          const currentProgress = goalProgress ? goalProgress.completed : progress.totalLogged;
          
          return {
            ...goal,
            exercise,
            progress: currentProgress,
            progressPercent: goal.target > 0 
              ? Math.min(100, Math.round((currentProgress / goal.target) * 100))
              : 0
          };
        })
      );
      
      setGoals(goalsWithProgress);
    } catch (err) {
      console.error('Error loading exercise goals:', err);
      setError('Failed to load exercise goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayGoals();
  }, []);

  if (loading) {
    return (
      <div className="card-glow h-full p-4">
        <h3 className="text-lg font-semibold mb-4">Exercise</h3>
        <div className="text-dark-text-tertiary text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glow h-full p-4">
        <h3 className="text-lg font-semibold mb-4">Exercise</h3>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="card-glow h-full p-4 flex flex-col overflow-hidden">
      <h3 className="text-lg font-semibold mb-4 flex-shrink-0">Exercise</h3>
      
      {goals.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-dark-text-tertiary text-sm text-center">
            No exercise goals for today
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col space-y-3">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="p-3 rounded-lg bg-dark-bg-secondary border border-dark-border"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-dark-text-primary truncate">
                  {goal.exercise?.name || 'Unknown Exercise'}
                </p>
                <span className="text-xs text-dark-text-tertiary">
                  {goal.progress} / {goal.target} {goal.exercise?.unit || ''}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-2 bg-dark-bg-primary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    goal.progressPercent >= 100
                      ? 'bg-green-500'
                      : goal.progressPercent >= 50
                      ? 'bg-yellow-500'
                      : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(100, goal.progressPercent)}%` }}
                />
              </div>
              
              <div className="mt-2 text-xs text-dark-text-tertiary">
                {goal.progressPercent >= 100 ? (
                  <span className="text-green-400">✓ Goal achieved!</span>
                ) : (
                  <span>{goal.progressPercent}% complete</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-dark-border flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.href = '/exercises'}
          className="w-full"
        >
          View All Exercises
        </Button>
      </div>
    </div>
  );
}

