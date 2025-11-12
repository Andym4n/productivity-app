/**
 * Tasks Widget Component
 * 
 * Displays pending tasks filtered by context with quick actions
 */

import { useState, useEffect } from 'react';
import { getTasks } from '../../tasks/crud/index.js';
import { updateTask } from '../../tasks/crud/index.js';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../tasks/models/Task.js';
import { CONTEXT_TYPES } from '../../services/contextDetection.js';
import { Button } from '../Button/index.js';

export default function TasksWidget({ context = CONTEXT_TYPES.PERSONAL }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get pending and in-progress tasks filtered by context
      const pendingTasks = await getTasks({ 
        status: TASK_STATUSES.PENDING,
        context: context === CONTEXT_TYPES.WORK ? 'work' : 'personal'
      }).catch(() => []);
      
      const inProgressTasks = await getTasks({ 
        status: TASK_STATUSES.IN_PROGRESS,
        context: context === CONTEXT_TYPES.WORK ? 'work' : 'personal'
      }).catch(() => []);
      
      // Combine and sort by priority and due date
      const allTasks = [...(pendingTasks || []), ...(inProgressTasks || [])]
        .filter(task => task && !task.parentId) // Only show top-level tasks
        .sort((a, b) => {
          // Sort by priority first
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
          if (priorityDiff !== 0) return priorityDiff;
          
          // Then by due date
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
          }
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        })
        .slice(0, 5); // Limit to 5 tasks
      
      setTasks(allTasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  const handleCompleteTask = async (taskId) => {
    try {
      await updateTask(taskId, { status: TASK_STATUSES.COMPLETED });
      await loadTasks();
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case TASK_PRIORITIES.HIGH:
        return 'text-red-400';
      case TASK_PRIORITIES.MEDIUM:
        return 'text-yellow-400';
      case TASK_PRIORITIES.LOW:
        return 'text-green-400';
      default:
        return 'text-dark-text-tertiary';
    }
  };

  const formatDueDate = (dueDate) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((taskDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return `In ${diffDays} days`;
  };

  if (loading) {
    return (
      <div className="card-glow h-full p-4">
        <h3 className="text-lg font-semibold mb-4">Tasks</h3>
        <div className="text-dark-text-tertiary text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glow h-full p-4">
        <h3 className="text-lg font-semibold mb-4">Tasks</h3>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="card-glow h-full p-4 flex flex-col overflow-hidden">
      <h3 className="text-lg font-semibold mb-4 flex-shrink-0">Tasks</h3>
      
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-dark-text-tertiary text-sm text-center">
            No {context === CONTEXT_TYPES.WORK ? 'work' : 'personal'} tasks
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-3 rounded-lg bg-dark-bg-secondary border border-dark-border hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-dark-text-tertiary">
                        {formatDueDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-dark-text-primary font-medium truncate">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-dark-text-tertiary mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCompleteTask(task.id)}
                  className="flex-shrink-0"
                >
                  ✓
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-dark-border flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.href = '/tasks'}
          className="w-full"
        >
          View All Tasks
        </Button>
      </div>
    </div>
  );
}

