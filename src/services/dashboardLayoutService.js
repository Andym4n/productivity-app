/**
 * Dashboard Layout Service
 * 
 * Provides high-level API for saving and loading dashboard layouts
 * Handles error cases gracefully and provides fallbacks
 */

import dashboardLayoutStore from '../storage/indexeddb/stores/dashboardLayoutStore.js';

/**
 * Saves the dashboard layout to IndexedDB
 * @param {Object} layouts - Layout object with breakpoint keys (lg, md, sm, xs, xxs)
 * @returns {Promise<boolean>} Promise resolving to true if saved successfully, false otherwise
 */
export async function saveDashboardLayout(layouts) {
  try {
    if (!layouts || typeof layouts !== 'object') {
      console.warn('Invalid layouts object provided to saveDashboardLayout');
      return false;
    }

    // Validate that layouts has at least one breakpoint
    const breakpoints = Object.keys(layouts);
    if (breakpoints.length === 0) {
      console.warn('No breakpoints in layouts object');
      return false;
    }

    // Validate layout structure - each breakpoint should be an array
    for (const [breakpoint, layoutArray] of Object.entries(layouts)) {
      if (!Array.isArray(layoutArray)) {
        console.warn(`Invalid layout for breakpoint ${breakpoint}: expected array`);
        return false;
      }

      // Validate each layout item has required fields
      for (const item of layoutArray) {
        if (!item.i || typeof item.x !== 'number' || typeof item.y !== 'number' || 
            typeof item.w !== 'number' || typeof item.h !== 'number') {
          console.warn(`Invalid layout item in breakpoint ${breakpoint}:`, item);
          return false;
        }
      }
    }

    await dashboardLayoutStore.saveLayout(layouts);
    return true;
  } catch (error) {
    console.error('Failed to save dashboard layout:', error);
    // Don't throw - gracefully handle errors
    return false;
  }
}

/**
 * Loads the saved dashboard layout from IndexedDB
 * @returns {Promise<Object|null>} Promise resolving to the saved layouts object or null if not found/error
 */
export async function loadDashboardLayout() {
  try {
    const savedLayout = await dashboardLayoutStore.getCurrentLayout();
    
    if (!savedLayout || !savedLayout.layouts) {
      return null;
    }

    // Validate the loaded layout structure
    const layouts = savedLayout.layouts;
    if (typeof layouts !== 'object') {
      console.warn('Invalid layout structure in saved layout');
      return null;
    }

    // Validate each breakpoint
    for (const [breakpoint, layoutArray] of Object.entries(layouts)) {
      if (!Array.isArray(layoutArray)) {
        console.warn(`Invalid layout for breakpoint ${breakpoint} in saved layout`);
        return null;
      }
    }

    return layouts;
  } catch (error) {
    console.error('Failed to load dashboard layout:', error);
    // Return null on error to fall back to defaults
    return null;
  }
}

/**
 * Resets the dashboard layout to defaults (deletes saved layout)
 * @returns {Promise<boolean>} Promise resolving to true if reset successfully
 */
export async function resetDashboardLayout() {
  try {
    await dashboardLayoutStore.deleteLayout();
    return true;
  } catch (error) {
    console.error('Failed to reset dashboard layout:', error);
    return false;
  }
}

export default {
  saveDashboardLayout,
  loadDashboardLayout,
  resetDashboardLayout
};

