import { BaseStore } from './baseStore.js';

/**
 * Dashboard Layout Store - handles CRUD operations for dashboard layouts
 * Stores layout configurations for react-grid-layout responsive breakpoints
 */
export class DashboardLayoutStore extends BaseStore {
  constructor() {
    super('dashboardLayout');
  }

  /**
   * Gets the current dashboard layout
   * Since we only store one layout, we'll use a fixed ID
   * @returns {Promise<Object|null>} Promise resolving to the layout object or null
   */
  async getCurrentLayout() {
    const LAYOUT_ID = 'default';
    return await this.get(LAYOUT_ID);
  }

  /**
   * Saves the dashboard layout
   * @param {Object} layouts - Layout object with breakpoint keys (lg, md, sm, xs, xxs)
   * @returns {Promise<Object>} Promise resolving to the saved layout
   */
  async saveLayout(layouts) {
    if (!layouts || typeof layouts !== 'object') {
      throw new Error('Layouts must be a valid object');
    }

    const LAYOUT_ID = 'default';
    const layoutData = {
      id: LAYOUT_ID,
      layouts: layouts,
      updatedAt: new Date().toISOString(),
      createdAt: null // Will be set on first creation
    };

    // Check if layout already exists
    const existing = await this.get(LAYOUT_ID);
    
    if (existing) {
      // Update existing layout
      layoutData.createdAt = existing.createdAt;
      return await this.update(LAYOUT_ID, layoutData);
    } else {
      // Create new layout
      layoutData.createdAt = new Date().toISOString();
      return await this.create(layoutData);
    }
  }

  /**
   * Deletes the saved dashboard layout (resets to defaults)
   * @returns {Promise<void>}
   */
  async deleteLayout() {
    const LAYOUT_ID = 'default';
    return await this.delete(LAYOUT_ID);
  }
}

// Export singleton instance
const dashboardLayoutStore = new DashboardLayoutStore();
export default dashboardLayoutStore;

