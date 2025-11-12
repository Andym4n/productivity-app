/**
 * Quick Actions Widget Component
 * 
 * Provides quick access to common actions
 */

import { Button } from '../Button/index.js';

export default function QuickActionsWidget() {
  const actions = [
    {
      label: 'Add Task',
      icon: '✓',
      href: '/tasks?new=true',
      color: 'text-blue-400'
    },
    {
      label: 'Log Exercise',
      icon: '💪',
      href: '/exercises?log=true',
      color: 'text-green-400'
    },
    {
      label: 'Write Journal',
      icon: '📝',
      href: '/journal?new=true',
      color: 'text-purple-400'
    },
    {
      label: 'View Calendar',
      icon: '📅',
      href: '/calendar',
      color: 'text-yellow-400'
    }
  ];

  const handleAction = (href) => {
    window.location.href = href;
  };

  return (
    <div className="card-glow h-full p-4 flex flex-col overflow-hidden">
      <h3 className="text-lg font-semibold mb-3 flex-shrink-0">Quick Actions</h3>
      
      <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleAction(action.href)}
            className="p-3 rounded-lg bg-dark-bg-secondary border border-dark-border hover:border-purple-500/50 transition-all hover:scale-105 flex flex-col items-center justify-center gap-1.5 group"
          >
            <span className={`text-xl ${action.color} group-hover:scale-110 transition-transform`}>
              {action.icon}
            </span>
            <span className="text-xs font-medium text-dark-text-primary">
              {action.label}
            </span>
          </button>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-dark-border flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.href = '/dashboard'}
          className="w-full"
        >
          Dashboard Settings
        </Button>
      </div>
    </div>
  );
}

