import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, closeDatabase } from '../../src/storage/indexeddb/database.js';
import {
  saveDashboardLayout,
  loadDashboardLayout,
  resetDashboardLayout
} from '../../src/services/dashboardLayoutService.js';
import dashboardLayoutStore from '../../src/storage/indexeddb/stores/dashboardLayoutStore.js';

/**
 * Integration tests for dashboard layout persistence
 * Tests the complete flow of saving, loading, and persisting layouts across database sessions
 */
describe('Dashboard Layout Persistence Integration', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    // Clean up
    try {
      await dashboardLayoutStore.deleteLayout();
    } catch (error) {
      // Ignore if layout doesn't exist
    }
    await closeDatabase();
  });

  describe('Layout Persistence Across Sessions', () => {
    it('should persist layout across database close/reopen', async () => {
      const testLayouts = {
        lg: [
          { i: 'tasks', x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
          { i: 'calendar', x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
          { i: 'exercise', x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
          { i: 'journal', x: 8, y: 3, w: 4, h: 3, minW: 2, minH: 2 },
          { i: 'daily-report', x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
          { i: 'quick-actions', x: 6, y: 6, w: 6, h: 4, minW: 3, minH: 3 }
        ],
        md: [
          { i: 'tasks', x: 0, y: 0, w: 6, h: 6, minW: 3, minH: 4 },
          { i: 'calendar', x: 6, y: 0, w: 6, h: 6, minW: 3, minH: 4 },
          { i: 'exercise', x: 0, y: 6, w: 4, h: 3, minW: 2, minH: 2 },
          { i: 'journal', x: 4, y: 6, w: 4, h: 3, minW: 2, minH: 2 },
          { i: 'daily-report', x: 8, y: 6, w: 4, h: 3, minW: 2, minH: 2 },
          { i: 'quick-actions', x: 0, y: 9, w: 12, h: 4, minW: 6, minH: 3 }
        ],
        sm: [
          { i: 'tasks', x: 0, y: 0, w: 6, h: 5, minW: 3, minH: 4 },
          { i: 'calendar', x: 0, y: 5, w: 6, h: 5, minW: 3, minH: 4 },
          { i: 'exercise', x: 0, y: 10, w: 3, h: 3, minW: 2, minH: 2 },
          { i: 'journal', x: 3, y: 10, w: 3, h: 3, minW: 2, minH: 2 },
          { i: 'daily-report', x: 0, y: 13, w: 6, h: 4, minW: 4, minH: 3 },
          { i: 'quick-actions', x: 0, y: 17, w: 6, h: 3, minW: 3, minH: 2 }
        ],
        xs: [
          { i: 'tasks', x: 0, y: 0, w: 4, h: 5, minW: 2, minH: 4 },
          { i: 'calendar', x: 0, y: 5, w: 4, h: 5, minW: 2, minH: 4 },
          { i: 'exercise', x: 0, y: 10, w: 4, h: 3, minW: 2, minH: 2 },
          { i: 'journal', x: 0, y: 13, w: 4, h: 3, minW: 2, minH: 2 },
          { i: 'daily-report', x: 0, y: 16, w: 4, h: 4, minW: 2, minH: 3 },
          { i: 'quick-actions', x: 0, y: 20, w: 4, h: 3, minW: 2, minH: 2 }
        ],
        xxs: [
          { i: 'tasks', x: 0, y: 0, w: 2, h: 5, minW: 2, minH: 4 },
          { i: 'calendar', x: 0, y: 5, w: 2, h: 5, minW: 2, minH: 4 },
          { i: 'exercise', x: 0, y: 10, w: 2, h: 3, minW: 2, minH: 2 },
          { i: 'journal', x: 0, y: 13, w: 2, h: 3, minW: 2, minH: 2 },
          { i: 'daily-report', x: 0, y: 16, w: 2, h: 4, minW: 2, minH: 3 },
          { i: 'quick-actions', x: 0, y: 20, w: 2, h: 3, minW: 2, minH: 2 }
        ]
      };

      // Save layout
      const saveResult = await saveDashboardLayout(testLayouts);
      expect(saveResult).toBe(true);

      // Verify it's saved
      const firstLoad = await loadDashboardLayout();
      expect(firstLoad).toEqual(testLayouts);

      // Simulate database close/reopen (in real scenario, this would be a page reload)
      await closeDatabase();
      await initDatabase();

      // Load layout after reopen
      const secondLoad = await loadDashboardLayout();
      expect(secondLoad).toEqual(testLayouts);
      expect(secondLoad.lg).toHaveLength(6);
      expect(secondLoad.md).toHaveLength(6);
      expect(secondLoad.sm).toHaveLength(6);
      expect(secondLoad.xs).toHaveLength(6);
      expect(secondLoad.xxs).toHaveLength(6);
    });

    it('should maintain layout integrity after multiple updates', async () => {
      const initialLayouts = {
        lg: [
          { i: 'tasks', x: 0, y: 0, w: 4, h: 6 },
          { i: 'calendar', x: 4, y: 0, w: 4, h: 6 }
        ]
      };

      // Initial save
      await saveDashboardLayout(initialLayouts);
      let loaded = await loadDashboardLayout();
      expect(loaded.lg).toHaveLength(2);

      // First update
      const firstUpdate = {
        lg: [
          { i: 'tasks', x: 1, y: 1, w: 5, h: 7 },
          { i: 'calendar', x: 6, y: 1, w: 5, h: 7 },
          { i: 'exercise', x: 0, y: 8, w: 4, h: 3 }
        ]
      };
      await saveDashboardLayout(firstUpdate);
      loaded = await loadDashboardLayout();
      expect(loaded.lg).toHaveLength(3);

      // Second update
      const secondUpdate = {
        lg: [
          { i: 'tasks', x: 2, y: 2, w: 6, h: 8 },
          { i: 'calendar', x: 8, y: 2, w: 4, h: 8 }
        ],
        md: [
          { i: 'tasks', x: 0, y: 0, w: 6, h: 6 }
        ]
      };
      await saveDashboardLayout(secondUpdate);
      loaded = await loadDashboardLayout();
      expect(loaded.lg).toHaveLength(2);
      expect(loaded.md).toHaveLength(1);

      // Verify after database reopen
      await closeDatabase();
      await initDatabase();
      loaded = await loadDashboardLayout();
      expect(loaded.lg).toHaveLength(2);
      expect(loaded.md).toHaveLength(1);
      expect(loaded.lg[0].x).toBe(2);
      expect(loaded.lg[0].y).toBe(2);
    });
  });

  describe('Layout Data Integrity', () => {
    it('should preserve all widget properties', async () => {
      const complexLayouts = {
        lg: [
          {
            i: 'tasks',
            x: 0,
            y: 0,
            w: 4,
            h: 6,
            minW: 3,
            minH: 4,
            maxW: 8,
            maxH: 10,
            static: false,
            isDraggable: true,
            isResizable: true
          },
          {
            i: 'calendar',
            x: 4,
            y: 0,
            w: 4,
            h: 6,
            minW: 3,
            minH: 4
          }
        ]
      };

      await saveDashboardLayout(complexLayouts);
      const loaded = await loadDashboardLayout();

      const tasksWidget = loaded.lg.find(w => w.i === 'tasks');
      expect(tasksWidget).toBeDefined();
      expect(tasksWidget.x).toBe(0);
      expect(tasksWidget.y).toBe(0);
      expect(tasksWidget.w).toBe(4);
      expect(tasksWidget.h).toBe(6);
      expect(tasksWidget.minW).toBe(3);
      expect(tasksWidget.minH).toBe(4);
      expect(tasksWidget.maxW).toBe(8);
      expect(tasksWidget.maxH).toBe(10);
      expect(tasksWidget.static).toBe(false);
      expect(tasksWidget.isDraggable).toBe(true);
      expect(tasksWidget.isResizable).toBe(true);
    });

    it('should handle all six widgets correctly', async () => {
      const allWidgetsLayout = {
        lg: [
          { i: 'tasks', x: 0, y: 0, w: 4, h: 6 },
          { i: 'calendar', x: 4, y: 0, w: 4, h: 6 },
          { i: 'exercise', x: 8, y: 0, w: 4, h: 3 },
          { i: 'journal', x: 8, y: 3, w: 4, h: 3 },
          { i: 'daily-report', x: 0, y: 6, w: 6, h: 4 },
          { i: 'quick-actions', x: 6, y: 6, w: 6, h: 4 }
        ]
      };

      await saveDashboardLayout(allWidgetsLayout);
      const loaded = await loadDashboardLayout();

      const widgetIds = loaded.lg.map(w => w.i).sort();
      expect(widgetIds).toEqual([
        'calendar',
        'daily-report',
        'exercise',
        'journal',
        'quick-actions',
        'tasks'
      ]);
    });
  });

  describe('Error Recovery', () => {
    it('should handle missing layout gracefully', async () => {
      // No layout saved
      const loaded = await loadDashboardLayout();
      expect(loaded).toBeNull();
    });

    it('should allow resetting and saving new layout', async () => {
      const firstLayout = {
        lg: [{ i: 'tasks', x: 0, y: 0, w: 4, h: 6 }]
      };

      await saveDashboardLayout(firstLayout);
      expect(await loadDashboardLayout()).toEqual(firstLayout);

      // Reset
      await resetDashboardLayout();
      expect(await loadDashboardLayout()).toBeNull();

      // Save new layout
      const secondLayout = {
        lg: [{ i: 'calendar', x: 0, y: 0, w: 6, h: 6 }]
      };
      await saveDashboardLayout(secondLayout);
      expect(await loadDashboardLayout()).toEqual(secondLayout);
    });
  });
});

