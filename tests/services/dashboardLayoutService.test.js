import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initDatabase, closeDatabase } from '../../src/storage/indexeddb/database.js';
import {
  saveDashboardLayout,
  loadDashboardLayout,
  resetDashboardLayout
} from '../../src/services/dashboardLayoutService.js';
import dashboardLayoutStore from '../../src/storage/indexeddb/stores/dashboardLayoutStore.js';

describe('DashboardLayoutService', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    // Clean up: delete any saved layouts
    try {
      await dashboardLayoutStore.deleteLayout();
    } catch (error) {
      // Ignore if layout doesn't exist
    }
    await closeDatabase();
  });

  describe('saveDashboardLayout', () => {
    it('should save valid layout successfully', async () => {
      const testLayouts = {
        lg: [
          { i: 'tasks', x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
          { i: 'calendar', x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 }
        ],
        md: [
          { i: 'tasks', x: 0, y: 0, w: 6, h: 6, minW: 3, minH: 4 }
        ]
      };

      const result = await saveDashboardLayout(testLayouts);
      expect(result).toBe(true);

      const saved = await loadDashboardLayout();
      expect(saved).toEqual(testLayouts);
    });

    it('should return false for null layouts', async () => {
      const result = await saveDashboardLayout(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined layouts', async () => {
      const result = await saveDashboardLayout(undefined);
      expect(result).toBe(false);
    });

    it('should return false for empty layouts object', async () => {
      const result = await saveDashboardLayout({});
      expect(result).toBe(false);
    });

    it('should return false for invalid layout structure (non-array)', async () => {
      const invalidLayouts = {
        lg: 'not an array'
      };
      const result = await saveDashboardLayout(invalidLayouts);
      expect(result).toBe(false);
    });

    it('should return false for layout items missing required fields', async () => {
      const invalidLayouts = {
        lg: [
          { i: 'tasks', x: 0 } // Missing y, w, h
        ]
      };
      const result = await saveDashboardLayout(invalidLayouts);
      expect(result).toBe(false);
    });

    it('should return false for layout items with invalid types', async () => {
      const invalidLayouts = {
        lg: [
          { i: 'tasks', x: 'not a number', y: 0, w: 4, h: 6 }
        ]
      };
      const result = await saveDashboardLayout(invalidLayouts);
      expect(result).toBe(false);
    });

    it('should handle errors gracefully and return false', async () => {
      // Mock store to throw error
      const originalSave = dashboardLayoutStore.saveLayout;
      dashboardLayoutStore.saveLayout = vi.fn().mockRejectedValue(new Error('Database error'));

      const testLayouts = {
        lg: [{ i: 'tasks', x: 0, y: 0, w: 4, h: 6 }]
      };

      const result = await saveDashboardLayout(testLayouts);
      expect(result).toBe(false);

      // Restore original method
      dashboardLayoutStore.saveLayout = originalSave;
    });

    it('should validate all breakpoints in layout', async () => {
      const testLayouts = {
        lg: [{ i: 'tasks', x: 0, y: 0, w: 4, h: 6 }],
        md: [{ i: 'tasks', x: 0, y: 0, w: 6, h: 6 }],
        sm: [{ i: 'tasks', x: 0, y: 0, w: 6, h: 5 }],
        xs: [{ i: 'tasks', x: 0, y: 0, w: 4, h: 5 }],
        xxs: [{ i: 'tasks', x: 0, y: 0, w: 2, h: 5 }]
      };

      const result = await saveDashboardLayout(testLayouts);
      expect(result).toBe(true);
    });
  });

  describe('loadDashboardLayout', () => {
    it('should return null when no layout exists', async () => {
      const layout = await loadDashboardLayout();
      expect(layout).toBeNull();
    });

    it('should load saved layout successfully', async () => {
      const testLayouts = {
        lg: [
          { i: 'tasks', x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
          { i: 'calendar', x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 }
        ],
        md: [
          { i: 'tasks', x: 0, y: 0, w: 6, h: 6, minW: 3, minH: 4 }
        ]
      };

      await saveDashboardLayout(testLayouts);
      const loaded = await loadDashboardLayout();

      expect(loaded).toEqual(testLayouts);
    });

    it('should return null for invalid saved layout structure', async () => {
      // Manually create invalid layout structure
      await dashboardLayoutStore.create({
        id: 'default',
        layouts: 'invalid structure',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const loaded = await loadDashboardLayout();
      expect(loaded).toBeNull();
    });

    it('should return null for layout with invalid breakpoint arrays', async () => {
      // Manually create layout with invalid breakpoint
      await dashboardLayoutStore.create({
        id: 'default',
        layouts: {
          lg: 'not an array'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const loaded = await loadDashboardLayout();
      expect(loaded).toBeNull();
    });

    it('should handle errors gracefully and return null', async () => {
      // Mock store to throw error
      const originalGet = dashboardLayoutStore.getCurrentLayout;
      dashboardLayoutStore.getCurrentLayout = vi.fn().mockRejectedValue(new Error('Database error'));

      const loaded = await loadDashboardLayout();
      expect(loaded).toBeNull();

      // Restore original method
      dashboardLayoutStore.getCurrentLayout = originalGet;
    });
  });

  describe('resetDashboardLayout', () => {
    it('should delete existing layout', async () => {
      const testLayouts = {
        lg: [{ i: 'tasks', x: 0, y: 0, w: 4, h: 6 }]
      };

      await saveDashboardLayout(testLayouts);
      expect(await loadDashboardLayout()).not.toBeNull();

      const result = await resetDashboardLayout();
      expect(result).toBe(true);
      expect(await loadDashboardLayout()).toBeNull();
    });

    it('should return false on error', async () => {
      // Mock store to throw error
      const originalDelete = dashboardLayoutStore.deleteLayout;
      dashboardLayoutStore.deleteLayout = vi.fn().mockRejectedValue(new Error('Database error'));

      const result = await resetDashboardLayout();
      expect(result).toBe(false);

      // Restore original method
      dashboardLayoutStore.deleteLayout = originalDelete;
    });
  });

  describe('integration', () => {
    it('should save and load layout in sequence', async () => {
      const testLayouts = {
        lg: [
          { i: 'tasks', x: 0, y: 0, w: 4, h: 6 },
          { i: 'calendar', x: 4, y: 0, w: 4, h: 6 },
          { i: 'exercise', x: 8, y: 0, w: 4, h: 3 }
        ],
        md: [
          { i: 'tasks', x: 0, y: 0, w: 6, h: 6 },
          { i: 'calendar', x: 6, y: 0, w: 6, h: 6 }
        ]
      };

      // Save
      const saveResult = await saveDashboardLayout(testLayouts);
      expect(saveResult).toBe(true);

      // Load
      const loaded = await loadDashboardLayout();
      expect(loaded).toEqual(testLayouts);

      // Update and save again
      const updatedLayouts = {
        lg: [
          { i: 'tasks', x: 2, y: 1, w: 5, h: 7 },
          { i: 'calendar', x: 7, y: 1, w: 5, h: 7 }
        ]
      };
      const updateResult = await saveDashboardLayout(updatedLayouts);
      expect(updateResult).toBe(true);

      // Load updated
      const updatedLoaded = await loadDashboardLayout();
      expect(updatedLoaded).toEqual(updatedLayouts);

      // Reset
      const resetResult = await resetDashboardLayout();
      expect(resetResult).toBe(true);
      expect(await loadDashboardLayout()).toBeNull();
    });

    it('should handle multiple rapid save operations', async () => {
      const layouts1 = { lg: [{ i: 'tasks', x: 0, y: 0, w: 4, h: 6 }] };
      const layouts2 = { lg: [{ i: 'tasks', x: 1, y: 1, w: 5, h: 7 }] };
      const layouts3 = { lg: [{ i: 'tasks', x: 2, y: 2, w: 6, h: 8 }] };

      // Save sequentially to avoid concurrent write conflicts
      await saveDashboardLayout(layouts1);
      await saveDashboardLayout(layouts2);
      await saveDashboardLayout(layouts3);

      const loaded = await loadDashboardLayout();
      // Should have the last layout saved
      expect(loaded).toBeDefined();
      expect(loaded.lg).toBeDefined();
      expect(loaded.lg[0].i).toBe('tasks');
      expect(loaded.lg[0].x).toBe(2); // Last saved layout
      expect(loaded.lg[0].y).toBe(2);
    });
  });
});

