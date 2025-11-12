/**
 * Dashboard Page Component
 * 
 * Main customizable dashboard with drag-and-drop widgets, layout persistence,
 * and time-based context switching.
 */

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Button } from '../components';
import contextManager, { CONTEXT_TYPES } from '../services/contextManager.js';
import { loadDashboardLayout, saveDashboardLayout } from '../services/dashboardLayoutService.js';
import WidgetErrorBoundary from '../components/widgets/WidgetErrorBoundary.jsx';

// Lazy load widgets to prevent blocking the app if there are import errors
const TasksWidget = React.lazy(() => import('../components/widgets/TasksWidget.jsx'));
const CalendarWidget = React.lazy(() => import('../components/widgets/CalendarWidget.jsx'));
const ExerciseWidget = React.lazy(() => import('../components/widgets/ExerciseWidget.jsx'));
const JournalWidget = React.lazy(() => import('../components/widgets/JournalWidget.jsx'));
const DailyReportWidget = React.lazy(() => import('../components/widgets/DailyReportWidget.jsx'));
const QuickActionsWidget = React.lazy(() => import('../components/widgets/QuickActionsWidget.jsx'));

// Import CSS for react-grid-layout - Vite handles these imports
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

/**
 * DashboardPage component
 * Main dashboard with customizable widget layout
 */
export default function DashboardPage() {
  const [layouts, setLayouts] = useState(null); // null means not loaded yet, {} means loaded but empty
  const [currentContext, setCurrentContext] = useState(CONTEXT_TYPES.PERSONAL);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const isManualModeRef = useRef(false);

  // Load saved layout on mount
  useEffect(() => {
    const loadSavedLayout = async () => {
      try {
        const savedLayout = await loadDashboardLayout();
        if (savedLayout) {
          setLayouts(savedLayout);
        } else {
          // No saved layout, will use defaults
          setLayouts({});
        }
      } catch (error) {
        console.error('Failed to load saved layout:', error);
        // Fall back to defaults on error
        setLayouts({});
      }
    };

    loadSavedLayout();
  }, []);

  // Initialize ContextManager and set up event listeners
  useEffect(() => {
    let isMounted = true;

    // Ensure ContextManager is initialized
    contextManager.initialize().then(() => {
      if (isMounted) {
        // Get initial context and override status
        const initialContext = contextManager.getCurrentContext();
        const initialOverride = contextManager.isManualOverride();
        setCurrentContext(initialContext);
        setIsManualOverride(initialOverride);
        isManualModeRef.current = initialOverride;
        setLoading(false);
      }
    }).catch(error => {
      console.error('Failed to initialize ContextManager:', error);
      if (isMounted) {
        setCurrentContext(CONTEXT_TYPES.PERSONAL);
        setIsManualOverride(false);
        setLoading(false);
      }
    });

    // Safety timeout - if context loading takes too long, show dashboard anyway
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Context loading timeout, showing dashboard with default context');
        setLoading(false);
      }
    }, 2000);

    // Subscribe to context change events
    const unsubscribeContextChange = contextManager.onContextChange(({ context, isManualOverride: overrideActive }) => {
      if (!isMounted) return;
      // Update context and override status
      setCurrentContext(context);
      setIsManualOverride(overrideActive);
      isManualModeRef.current = overrideActive;
    });

    // Subscribe to initialization events
    const unsubscribeInitialized = contextManager.onInitialized(({ context, isManualOverride: overrideActive }) => {
      if (isMounted) {
        setCurrentContext(context);
        setIsManualOverride(overrideActive || false);
        isManualModeRef.current = overrideActive || false;
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      unsubscribeContextChange();
      unsubscribeInitialized();
    };
  }, []); // Empty deps - only run on mount

  const handleLayoutChange = useCallback((layout, layouts) => {
    // Update local state immediately for responsive UI
    // Saving is handled in useEffect when dragging stops
    setLayouts(layouts);
  }, []);

  const handleContextChange = (newContext) => {
    // User selects a context - switch to manual mode and set it
    isManualModeRef.current = true;
    contextManager.setManualOverride(newContext);
    setCurrentContext(newContext);
    setIsManualOverride(true);
  };

  const handleRevertToAuto = () => {
    // Clear manual override and return to automatic mode
    contextManager.clearManualOverride();
    setIsManualOverride(false);
    isManualModeRef.current = false;
    // Context will update via event listener
  };

  // Save layout when dragging/resizing stops
  useEffect(() => {
    if (!isDragging && layouts !== null) {
      // Small delay to ensure layout is finalized
      const saveTimeout = setTimeout(() => {
        saveDashboardLayout(layouts).catch((error) => {
          console.error('Failed to save dashboard layout:', error);
        });
      }, 500);

      return () => clearTimeout(saveTimeout);
    }
  }, [isDragging, layouts]);

  // effectiveContext is just the current context
  const effectiveContext = currentContext;

  // Show loading state while initializing
  if (loading || layouts === null) {
    return (
      <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary flex items-center justify-center">
        <div className="text-dark-text-tertiary">Loading dashboard...</div>
      </div>
    );
  }

  // Default layout configuration
  const defaultLayouts = {
    lg: [
      { i: 'tasks', x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
      { i: 'calendar', x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
      { i: 'exercise', x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
      { i: 'journal', x: 8, y: 3, w: 4, h: 3, minW: 2, minH: 2 },
      { i: 'daily-report', x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
      { i: 'quick-actions', x: 6, y: 6, w: 6, h: 4, minW: 3, minH: 3 },
    ],
    md: [
      { i: 'tasks', x: 0, y: 0, w: 6, h: 6, minW: 3, minH: 4 },
      { i: 'calendar', x: 6, y: 0, w: 6, h: 6, minW: 3, minH: 4 },
      { i: 'exercise', x: 0, y: 6, w: 4, h: 3, minW: 2, minH: 2 },
      { i: 'journal', x: 4, y: 6, w: 4, h: 3, minW: 2, minH: 2 },
      { i: 'daily-report', x: 8, y: 6, w: 4, h: 3, minW: 2, minH: 2 },
      { i: 'quick-actions', x: 0, y: 9, w: 12, h: 4, minW: 6, minH: 3 },
    ],
    sm: [
      { i: 'tasks', x: 0, y: 0, w: 6, h: 5, minW: 3, minH: 4 },
      { i: 'calendar', x: 0, y: 5, w: 6, h: 5, minW: 3, minH: 4 },
      { i: 'exercise', x: 0, y: 10, w: 3, h: 3, minW: 2, minH: 2 },
      { i: 'journal', x: 3, y: 10, w: 3, h: 3, minW: 2, minH: 2 },
      { i: 'daily-report', x: 0, y: 13, w: 6, h: 4, minW: 4, minH: 3 },
      { i: 'quick-actions', x: 0, y: 17, w: 6, h: 3, minW: 3, minH: 2 },
    ],
    xs: [
      { i: 'tasks', x: 0, y: 0, w: 4, h: 5, minW: 2, minH: 4 },
      { i: 'calendar', x: 0, y: 5, w: 4, h: 5, minW: 2, minH: 4 },
      { i: 'exercise', x: 0, y: 10, w: 4, h: 3, minW: 2, minH: 2 },
      { i: 'journal', x: 0, y: 13, w: 4, h: 3, minW: 2, minH: 2 },
      { i: 'daily-report', x: 0, y: 16, w: 4, h: 4, minW: 2, minH: 3 },
      { i: 'quick-actions', x: 0, y: 20, w: 4, h: 3, minW: 2, minH: 2 },
    ],
    xxs: [
      { i: 'tasks', x: 0, y: 0, w: 2, h: 5, minW: 2, minH: 4 },
      { i: 'calendar', x: 0, y: 5, w: 2, h: 5, minW: 2, minH: 4 },
      { i: 'exercise', x: 0, y: 10, w: 2, h: 3, minW: 2, minH: 2 },
      { i: 'journal', x: 0, y: 13, w: 2, h: 3, minW: 2, minH: 2 },
      { i: 'daily-report', x: 0, y: 16, w: 2, h: 4, minW: 2, minH: 3 },
      { i: 'quick-actions', x: 0, y: 20, w: 2, h: 3, minW: 2, minH: 2 },
    ],
  };

  return (
    <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h1 className="section-heading">Dashboard</h1>
            
            {/* Context Controls */}
            <div className="flex items-center gap-2">
              {/* Manual Override Indicator */}
              {isManualOverride && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/20 border border-purple-500/30">
                  <svg 
                    className="w-4 h-4 text-purple-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-label="Manual override active"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                    />
                  </svg>
                  <span className="text-xs text-purple-300 font-medium">Manual</span>
                </div>
              )}
              
              {/* Auto Button - shown when override is active */}
              {isManualOverride && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevertToAuto}
                  className="text-dark-text-secondary hover:text-dark-text-primary"
                  title="Revert to automatic context switching"
                >
                  Auto
                </Button>
              )}
              
              {/* Context Selection Buttons */}
              <Button
                variant={effectiveContext === CONTEXT_TYPES.WORK ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleContextChange(CONTEXT_TYPES.WORK)}
                className={isManualOverride && effectiveContext === CONTEXT_TYPES.WORK ? 'ring-2 ring-purple-400' : ''}
              >
                Work
              </Button>
              <Button
                variant={effectiveContext === CONTEXT_TYPES.PERSONAL ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleContextChange(CONTEXT_TYPES.PERSONAL)}
                className={isManualOverride && effectiveContext === CONTEXT_TYPES.PERSONAL ? 'ring-2 ring-purple-400' : ''}
              >
                Personal
              </Button>
            </div>
          </div>

          {/* Dashboard Grid */}
          <ResponsiveGridLayout
          className="layout"
          layouts={Object.keys(layouts).length > 0 ? layouts : defaultLayouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          isDraggable={true}
          isResizable={true}
          onLayoutChange={handleLayoutChange}
          onDragStart={() => setIsDragging(true)}
          onDragStop={() => setIsDragging(false)}
          onResizeStart={() => setIsDragging(true)}
          onResizeStop={() => setIsDragging(false)}
          margin={[16, 16]}
          containerPadding={[0, 0]}
        >
          {/* Widgets */}
          <div key="tasks" className="widget-container">
            <WidgetErrorBoundary>
              <Suspense fallback={<div className="card-glow h-full p-4"><div className="text-dark-text-tertiary text-sm">Loading...</div></div>}>
                <TasksWidget context={effectiveContext} />
              </Suspense>
            </WidgetErrorBoundary>
          </div>
          
          <div key="calendar" className="widget-container">
            <WidgetErrorBoundary>
              <Suspense fallback={<div className="card-glow h-full p-4"><div className="text-dark-text-tertiary text-sm">Loading...</div></div>}>
                <CalendarWidget context={effectiveContext} />
              </Suspense>
            </WidgetErrorBoundary>
          </div>
          
          <div key="exercise" className="widget-container">
            <WidgetErrorBoundary>
              <Suspense fallback={<div className="card-glow h-full p-4"><div className="text-dark-text-tertiary text-sm">Loading...</div></div>}>
                <ExerciseWidget />
              </Suspense>
            </WidgetErrorBoundary>
          </div>
          
          <div key="journal" className="widget-container">
            <WidgetErrorBoundary>
              <Suspense fallback={<div className="card-glow h-full p-4"><div className="text-dark-text-tertiary text-sm">Loading...</div></div>}>
                <JournalWidget />
              </Suspense>
            </WidgetErrorBoundary>
          </div>
          
          <div key="daily-report" className="widget-container">
            <WidgetErrorBoundary>
              <Suspense fallback={<div className="card-glow h-full p-4"><div className="text-dark-text-tertiary text-sm">Loading...</div></div>}>
                <DailyReportWidget />
              </Suspense>
            </WidgetErrorBoundary>
          </div>
          
          <div key="quick-actions" className="widget-container">
            <WidgetErrorBoundary>
              <Suspense fallback={<div className="card-glow h-full p-4"><div className="text-dark-text-tertiary text-sm">Loading...</div></div>}>
                <QuickActionsWidget />
              </Suspense>
            </WidgetErrorBoundary>
          </div>
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}

