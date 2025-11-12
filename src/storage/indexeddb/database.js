import { openDB } from 'idb';

const DB_NAME = 'productivity-app';
const DB_VERSION = 6;

/**
 * Database configuration defining all object stores and their indexes
 */
const DB_CONFIG = {
  version: DB_VERSION,
  stores: {
    tasks: {
      keyPath: 'id',
      indexes: {
        byDueDate: 'dueDate',
        byStatus: 'status',
        byPriority: 'priority',
        byContext: 'context',
        byParentId: 'parentId',
        byCreatedAt: 'createdAt'
      }
    },
    events: {
      keyPath: 'id',
      indexes: {
        byStartTime: 'startTime',
        byContext: 'context',
        byGoogleEventId: 'googleEventId',
        bySynced: 'synced'
      }
    },
    journalEntries: {
      keyPath: 'id',
      indexes: {
        byDate: 'date',
        byTemplate: 'template',
        byMood: 'mood',
        byCreatedAt: 'createdAt'
      }
    },
    journalTemplates: {
      keyPath: 'id',
      indexes: {
        byIsBuiltIn: 'isBuiltIn',
        byCategory: 'category',
        byCreatedAt: 'createdAt'
      }
    },
    exercises: {
      keyPath: 'id',
      indexes: {
        byType: 'type',
        byCategory: 'category',
        byCreatedAt: 'createdAt'
      }
    },
    exerciseGoals: {
      keyPath: 'id',
      indexes: {
        byExerciseId: 'exerciseId',
        byDate: 'date',
        byCompleted: 'completed'
      }
    },
    exerciseLogs: {
      keyPath: 'id',
      indexes: {
        byExerciseId: 'exerciseId',
        byTimestamp: 'timestamp',
        byGoalId: 'goalId'
      }
    },
    workSchedule: {
      keyPath: 'id',
      indexes: {
        byUserId: 'userId',
        byScheduleType: 'scheduleType',
        byIsActive: 'isActive',
        byCreatedAt: 'createdAt'
      }
    },
    timeBlocks: {
      keyPath: 'id',
      indexes: {
        byStartTime: 'startTime',
        byEndTime: 'endTime',
        byScheduleId: 'scheduleId',
        byProjectId: 'projectId',
        byStatus: 'status',
        byType: 'type',
        byCreatedAt: 'createdAt'
      }
    },
    projects: {
      keyPath: 'id',
      indexes: {
        byCreatedAt: 'createdAt'
      }
    },
    automationRules: {
      keyPath: 'id',
      indexes: {
        byEnabled: 'enabled',
        byTriggerType: 'trigger.type',
        byCreatedAt: 'createdAt'
      }
    },
    dashboardLayout: {
      keyPath: 'id',
      indexes: {}
    },
    mediaBlobs: {
      keyPath: 'id',
      indexes: {
        byEntryId: 'entryId',
        byType: 'type',
        byCreatedAt: 'createdAt'
      }
    },
    oauthTokens: {
      keyPath: 'id',
      indexes: {
        byProvider: 'provider',
        byUserId: 'userId',
        byExpiresAt: 'expiresAt',
        byCreatedAt: 'createdAt'
      }
    }
  }
};

/**
 * Migration functions for database version upgrades
 * Each migration function receives the database instance and transaction
 */
const migrations = {
  /**
   * Initial database setup - creates all object stores and indexes
   */
  1: (db, transaction) => {
    // Create all object stores with their indexes
    Object.entries(DB_CONFIG.stores).forEach(([storeName, config]) => {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: config.keyPath
        });

        // Create indexes
        Object.entries(config.indexes).forEach(([indexName, keyPath]) => {
          store.createIndex(indexName, keyPath, { unique: false });
        });
      }
    });
  },
  /**
   * Migration 2: Add mediaBlobs store for journal entry media attachments
   */
  2: (db, transaction) => {
    if (!db.objectStoreNames.contains('mediaBlobs')) {
      const store = db.createObjectStore('mediaBlobs', {
        keyPath: 'id'
      });
      store.createIndex('byEntryId', 'entryId', { unique: false });
      store.createIndex('byType', 'type', { unique: false });
      store.createIndex('byCreatedAt', 'createdAt', { unique: false });
    }
  },
  /**
   * Migration 3: Add journalTemplates store for journal entry templates
   */
  3: (db, transaction) => {
    if (!db.objectStoreNames.contains('journalTemplates')) {
      const store = db.createObjectStore('journalTemplates', {
        keyPath: 'id'
      });
      store.createIndex('byIsBuiltIn', 'isBuiltIn', { unique: false });
      store.createIndex('byCategory', 'category', { unique: false });
      store.createIndex('byCreatedAt', 'createdAt', { unique: false });
    }
  },
  /**
   * Migration 4: Add mood index to journalEntries for filtering
   */
  4: (db, transaction) => {
    const store = transaction.objectStore('journalEntries');
    if (!store.indexNames.contains('byMood')) {
      store.createIndex('byMood', 'mood', { unique: false });
    }
  },
  /**
   * Migration 5: Update workSchedule to workSchedules and enhance timeBlocks indexes
   */
  5: (db, transaction) => {
    // Rename workSchedule to workSchedules and add new indexes
    if (db.objectStoreNames.contains('workSchedule')) {
      // Can't rename, so we'll keep it as is and just add indexes if needed
      const scheduleStore = transaction.objectStore('workSchedule');
      
      if (!scheduleStore.indexNames.contains('byUserId')) {
        scheduleStore.createIndex('byUserId', 'userId', { unique: false });
      }
      if (!scheduleStore.indexNames.contains('byScheduleType')) {
        scheduleStore.createIndex('byScheduleType', 'scheduleType', { unique: false });
      }
      if (!scheduleStore.indexNames.contains('byIsActive')) {
        scheduleStore.createIndex('byIsActive', 'isActive', { unique: false });
      }
    } else if (!db.objectStoreNames.contains('workSchedules')) {
      // Create workSchedules if it doesn't exist
      const store = db.createObjectStore('workSchedules', { keyPath: 'id' });
      store.createIndex('byUserId', 'userId', { unique: false });
      store.createIndex('byScheduleType', 'scheduleType', { unique: false });
      store.createIndex('byIsActive', 'isActive', { unique: false });
      store.createIndex('byCreatedAt', 'createdAt', { unique: false });
    }
    
    // Enhance timeBlocks indexes
    const blockStore = transaction.objectStore('timeBlocks');
    
    if (!blockStore.indexNames.contains('byEndTime')) {
      blockStore.createIndex('byEndTime', 'endTime', { unique: false });
    }
    if (!blockStore.indexNames.contains('byScheduleId')) {
      blockStore.createIndex('byScheduleId', 'scheduleId', { unique: false });
    }
    if (!blockStore.indexNames.contains('byStatus')) {
      blockStore.createIndex('byStatus', 'status', { unique: false });
    }
    if (!blockStore.indexNames.contains('byType')) {
      blockStore.createIndex('byType', 'type', { unique: false });
    }
  },
  /**
   * Migration 6: Add oauthTokens store for OAuth 2.0 token storage
   */
  6: (db, transaction) => {
    if (!db.objectStoreNames.contains('oauthTokens')) {
      const store = db.createObjectStore('oauthTokens', {
        keyPath: 'id'
      });
      store.createIndex('byProvider', 'provider', { unique: false });
      store.createIndex('byUserId', 'userId', { unique: false });
      store.createIndex('byExpiresAt', 'expiresAt', { unique: false });
      store.createIndex('byCreatedAt', 'createdAt', { unique: false });
    }
  }
  // Future migrations will be added here:
  // 7: (db, transaction) => { ... },
};

/**
 * Initializes the IndexedDB database with migrations
 * @returns {Promise<IDBDatabase>} Promise resolving to the database instance
 */
export async function initDatabase() {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

        // Run migrations sequentially from oldVersion to newVersion
        for (let version = oldVersion + 1; version <= newVersion; version++) {
          if (migrations[version]) {
            console.log(`Running migration ${version}`);
            migrations[version](db, transaction);
          } else {
            console.warn(`No migration found for version ${version}`);
          }
        }
      },
      blocked() {
        console.warn('Database upgrade blocked - another tab may have the database open');
      },
      blocking() {
        console.warn('Database upgrade blocking - this tab needs to close');
        // In a real app, you might want to notify the user and reload
      }
    });

    console.log(`Database initialized: ${DB_NAME} v${DB_VERSION}`);
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error.message}`);
  }
}

/**
 * Gets a reference to the database (opens if not already open)
 * @returns {Promise<IDBDatabase>} Promise resolving to the database instance
 */
let dbInstance = null;
let initPromise = null;

export async function getDatabase() {
  // If already initialized, return it
  if (dbInstance) {
    return dbInstance;
  }
  
  // If initialization is in progress, wait for it
  if (initPromise) {
    await initPromise;
    return dbInstance;
  }
  
  // Start initialization
  initPromise = initDatabase();
  dbInstance = await initPromise;
  initPromise = null;
  
  return dbInstance;
}

/**
 * Closes the database connection
 */
export async function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    initPromise = null;
  }
}

/**
 * Gets the database configuration
 * @returns {Object} Database configuration object
 */
export function getDatabaseConfig() {
  return DB_CONFIG;
}

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  getDatabaseConfig
};

