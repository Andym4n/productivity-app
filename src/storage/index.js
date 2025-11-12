/**
 * Storage module - Public API for IndexedDB operations
 * 
 * This module provides a unified interface for all storage operations
 * across the application. It abstracts away IndexedDB complexity and
 * provides type-safe, promise-based APIs for all data operations.
 */

// Database initialization
export {
  initDatabase,
  getDatabase,
  closeDatabase,
  getDatabaseConfig
} from './indexeddb/database.js';

// Import getDatabase for use in initStorage
import { getDatabase } from './indexeddb/database.js';

// Store instances
import tasksStore from './indexeddb/stores/tasksStore.js';
import eventsStore from './indexeddb/stores/eventsStore.js';
import journalStore from './indexeddb/stores/journalStore.js';
import exerciseStore from './indexeddb/stores/exerciseStore.js';
import mediaBlobStore from './indexeddb/stores/mediaBlobStore.js';
import templateStore from './indexeddb/stores/templateStore.js';
import dashboardLayoutStore from './indexeddb/stores/dashboardLayoutStore.js';

export { default as tasksStore } from './indexeddb/stores/tasksStore.js';
export { default as eventsStore } from './indexeddb/stores/eventsStore.js';
export { default as journalStore } from './indexeddb/stores/journalStore.js';
export { default as exerciseStore } from './indexeddb/stores/exerciseStore.js';
export { default as mediaBlobStore } from './indexeddb/stores/mediaBlobStore.js';
export { default as templateStore } from './indexeddb/stores/templateStore.js';
export { default as OAuthTokensStore } from './indexeddb/stores/OAuthTokensStore.js';
export { default as dashboardLayoutStore } from './indexeddb/stores/dashboardLayoutStore.js';

// Base store class for extending
export { BaseStore } from './indexeddb/stores/baseStore.js';

/**
 * Initializes the storage layer
 * Call this once at application startup
 * @returns {Promise<void>}
 */
export async function initStorage() {
  try {
    // Use getDatabase which properly initializes and caches the db instance
    await getDatabase();
    console.log('Storage layer initialized successfully');
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    throw error;
  }
}

export default {
  initStorage,
  tasksStore,
  eventsStore,
  journalStore,
  exerciseStore
};

