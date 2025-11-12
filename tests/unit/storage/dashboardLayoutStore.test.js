import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, closeDatabase } from '../../../src/storage/indexeddb/database.js';
import { DashboardLayoutStore } from '../../../src/storage/indexeddb/stores/dashboardLayoutStore.js';

describe('DashboardLayoutStore', () => {
  let store;

  beforeEach(async () => {
    await initDatabase();
    store = new DashboardLayoutStore();
  });

  afterEach(async () => {
    // Clean up: delete any saved layouts
    try {
      await store.deleteLayout();
    } catch (error) {
      // Ignore if layout doesn't exist
    }
    await closeDatabase();
  });

  describe('getCurrentLayout', () => {
    it('should return null when no layout exists', async () => {
      const layout = await store.getCurrentLayout();
      expect(layout).toBeNull();
    });

    it('should return saved layout when it exists', async () => {
      const testLayouts = {
        lg: [{ i: 'tasks', x: 0, y: 0, w: 4, h: 6 }],
        md: [{ i: 'tasks', x: 0, y: 0, w: 6, h: 6 }]
      };

      await store.saveLayout(testLayouts);
      const layout = await store.getCurrentLayout();

      expect(layout).toBeDefined();
      expect(layout.id).toBe('default');
      expect(layout.layouts).toEqual(testLayouts);
      expect(layout.createdAt).toBeDefined();
      expect(layout.updatedAt).toBeDefined();
    });
  });

  describe('saveLayout', () => {
    it('should create a new layout when none exists', async () => {
      const testLayouts = {
        lg: [
          { i: 'tasks', x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
          { i: 'calendar', x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 }
        ],
        md: [
          { i: 'tasks', x: 0, y: 0, w: 6, h: 6, minW: 3, minH: 4 }
        ]
      };

      const result = await store.saveLayout(testLayouts);

      expect(result).toBeDefined();
      expect(result.id).toBe('default');
      expect(result.layouts).toEqual(testLayouts);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      // createdAt and updatedAt should be very close (within 10ms) for first save
      const createdAtTime = new Date(result.createdAt).getTime();
      const updatedAtTime = new Date(result.updatedAt).getTime();
      expect(Math.abs(createdAtTime - updatedAtTime)).toBeLessThan(10);
    });

    it('should update existing layout when one exists', async () => {
      const initialLayouts = {
        lg: [{ i: 'tasks', x: 0, y: 0, w: 4, h: 6 }]
      };

      const updatedLayouts = {
        lg: [{ i: 'tasks', x: 2, y: 1, w: 6, h: 8 }],
        md: [{ i: 'tasks', x: 0, y: 0, w: 6, h: 6 }]
      };

      await store.saveLayout(initialLayouts);
      const firstSave = await store.getCurrentLayout();
      const firstCreatedAt = firstSave.createdAt;

      // Wait a bit to ensure updatedAt is different
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await store.saveLayout(updatedLayouts);
      const savedLayout = await store.getCurrentLayout();

      expect(result.layouts).toEqual(updatedLayouts);
      expect(savedLayout.layouts).toEqual(updatedLayouts);
      expect(savedLayout.createdAt).toBe(firstCreatedAt); // createdAt should not change
      expect(savedLayout.updatedAt).not.toBe(firstSave.updatedAt); // updatedAt should change
    });

    it('should save layouts for all breakpoints', async () => {
      const testLayouts = {
        lg: [{ i: 'tasks', x: 0, y: 0, w: 4, h: 6 }],
        md: [{ i: 'tasks', x: 0, y: 0, w: 6, h: 6 }],
        sm: [{ i: 'tasks', x: 0, y: 0, w: 6, h: 5 }],
        xs: [{ i: 'tasks', x: 0, y: 0, w: 4, h: 5 }],
        xxs: [{ i: 'tasks', x: 0, y: 0, w: 2, h: 5 }]
      };

      await store.saveLayout(testLayouts);
      const saved = await store.getCurrentLayout();

      expect(saved.layouts).toEqual(testLayouts);
      expect(Object.keys(saved.layouts)).toEqual(['lg', 'md', 'sm', 'xs', 'xxs']);
    });

    it('should throw error for invalid layouts object', async () => {
      await expect(store.saveLayout(null)).rejects.toThrow();
      await expect(store.saveLayout(undefined)).rejects.toThrow();
      await expect(store.saveLayout('invalid')).rejects.toThrow();
    });
  });

  describe('deleteLayout', () => {
    it('should delete existing layout', async () => {
      const testLayouts = {
        lg: [{ i: 'tasks', x: 0, y: 0, w: 4, h: 6 }]
      };

      await store.saveLayout(testLayouts);
      expect(await store.getCurrentLayout()).not.toBeNull();

      await store.deleteLayout();
      expect(await store.getCurrentLayout()).toBeNull();
    });

    it('should handle deleting non-existent layout gracefully', async () => {
      // IndexedDB delete() doesn't throw when deleting non-existent key
      // It silently succeeds, so we should not expect an error
      await expect(store.deleteLayout()).resolves.not.toThrow();
      
      // Verify layout is still null after attempted delete
      expect(await store.getCurrentLayout()).toBeNull();
    });
  });

  describe('layout persistence', () => {
    it('should persist layout across multiple operations', async () => {
      const testLayouts = {
        lg: [
          { i: 'tasks', x: 0, y: 0, w: 4, h: 6 },
          { i: 'calendar', x: 4, y: 0, w: 4, h: 6 },
          { i: 'exercise', x: 8, y: 0, w: 4, h: 3 }
        ]
      };

      // Save layout
      await store.saveLayout(testLayouts);
      const firstLoad = await store.getCurrentLayout();
      expect(firstLoad.layouts).toEqual(testLayouts);

      // Update layout
      const updatedLayouts = {
        lg: [
          { i: 'tasks', x: 2, y: 1, w: 5, h: 7 },
          { i: 'calendar', x: 7, y: 1, w: 5, h: 7 }
        ]
      };
      await store.saveLayout(updatedLayouts);
      const secondLoad = await store.getCurrentLayout();
      expect(secondLoad.layouts).toEqual(updatedLayouts);

      // Verify it's the same record (same createdAt)
      expect(secondLoad.id).toBe(firstLoad.id);
      expect(secondLoad.createdAt).toBe(firstLoad.createdAt);
    });

    it('should maintain layout structure integrity', async () => {
      const complexLayouts = {
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
          { i: 'calendar', x: 6, y: 0, w: 6, h: 6, minW: 3, minH: 4 }
        ]
      };

      await store.saveLayout(complexLayouts);
      const saved = await store.getCurrentLayout();

      // Verify all widgets are present
      expect(saved.layouts.lg).toHaveLength(6);
      expect(saved.layouts.md).toHaveLength(2);

      // Verify widget properties are preserved
      const tasksWidget = saved.layouts.lg.find(w => w.i === 'tasks');
      expect(tasksWidget).toBeDefined();
      expect(tasksWidget.x).toBe(0);
      expect(tasksWidget.y).toBe(0);
      expect(tasksWidget.w).toBe(4);
      expect(tasksWidget.h).toBe(6);
      expect(tasksWidget.minW).toBe(3);
      expect(tasksWidget.minH).toBe(4);
    });
  });
});

