/**
 * Navigation utility for widgets and components
 * Provides a simple way to navigate between pages without direct access to App state
 */

let navigationHandler = null;

/**
 * Sets the navigation handler function
 * Should be called from App.jsx with setCurrentPage
 * @param {Function} handler - Function that accepts a page name
 */
export function setNavigationHandler(handler) {
  navigationHandler = handler;
}

/**
 * Navigates to a specific page
 * @param {string} page - Page name ('home', 'dashboard', 'journal', 'schedule', 'calendar')
 * @param {Object} options - Navigation options
 * @param {boolean} options.newEntry - If true and page is 'journal', opens new entry form
 */
export function navigateTo(page, options = {}) {
  if (navigationHandler) {
    navigationHandler(page, options);
  } else {
    console.warn('Navigation handler not set. Falling back to window.location');
    // Fallback for when navigation handler isn't set yet
    window.location.hash = `#${page}`;
  }
}

export default {
  setNavigationHandler,
  navigateTo
};

