import { getDatabase } from '../database.js';

/**
 * Base store class providing common CRUD operations for IndexedDB stores
 * All specific stores should extend this class
 */
export class BaseStore {
  constructor(storeName) {
    this.storeName = storeName;
  }

  /**
   * Gets the object store for the current operation
   * @param {string} mode - Transaction mode ('readonly' | 'readwrite')
   * @returns {Promise<IDBObjectStore>} Promise resolving to the object store
   */
  async getStore(mode = 'readonly') {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    try {
      const transaction = db.transaction(this.storeName, mode);
      const store = transaction.objectStore(this.storeName);
      return store;
    } catch (error) {
      console.error(`Error getting store ${this.storeName}:`, error);
      throw error;
    }
  }

  /**
   * Helper to convert IDBRequest or Promise to a Promise
   * The idb library wraps IndexedDB methods to return Promises directly
   * @param {IDBRequest|Promise} request - The request or promise from IndexedDB operation
   * @returns {Promise<any>} Promise resolving to the result
   */
  _toPromise(request) {
    // If it's already a Promise (idb library), use it directly
    if (request && typeof request.then === 'function') {
      return request;
    }
    
    // Otherwise, wrap IDBRequest in a Promise
    return new Promise((resolve, reject) => {
      if (request && typeof request.onsuccess !== 'undefined') {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
      } else {
        reject(new Error(`Unexpected request type: ${typeof request}`));
      }
    });
  }

  /**
   * Creates a new record in the store
   * @param {Object} data - Data object to create (must include keyPath field)
   * @returns {Promise<Object>} Promise resolving to the created record
   */
  async create(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Data must be a valid object');
    }

    const store = await this.getStore('readwrite');
    await this._toPromise(store.add(data));
    return data;
  }

  /**
   * Retrieves a record by its key
   * @param {string|number} key - The key to retrieve
   * @returns {Promise<Object|null>} Promise resolving to the record or null if not found
   */
  async get(key) {
    if (key === undefined || key === null) {
      throw new Error('Key is required');
    }

    const store = await this.getStore('readonly');
    const result = await this._toPromise(store.get(key));
    return result || null;
  }

  /**
   * Retrieves all records from the store
   * @returns {Promise<Array>} Promise resolving to an array of all records
   */
  async getAll() {
    const store = await this.getStore('readonly');
    const result = await this._toPromise(store.getAll());
    return result || [];
  }

  /**
   * Updates an existing record
   * @param {string|number} key - The key of the record to update
   * @param {Object} updates - Partial object with fields to update
   * @returns {Promise<Object>} Promise resolving to the updated record
   */
  async update(key, updates) {
    if (key === undefined || key === null) {
      throw new Error('Key is required');
    }

    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates must be a valid object');
    }

    const store = await this.getStore('readwrite');
    
    // Get existing record
    const existing = await this._toPromise(store.get(key));

    if (!existing) {
      throw new Error(`Record with key ${key} not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Put updated record
    await this._toPromise(store.put(updated));
    
    return updated;
  }

  /**
   * Deletes a record by its key
   * @param {string|number} key - The key of the record to delete
   * @returns {Promise<void>}
   */
  async delete(key) {
    if (key === undefined || key === null) {
      throw new Error('Key is required');
    }

    const store = await this.getStore('readwrite');
    await this._toPromise(store.delete(key));
  }

  /**
   * Queries records using an index
   * @param {string} indexName - Name of the index to query
   * @param {IDBKeyRange|string|number} query - Query value or key range
   * @returns {Promise<Array>} Promise resolving to matching records
   */
  async query(indexName, query) {
    const store = await this.getStore('readonly');
    const index = store.index(indexName);

    if (!index) {
      throw new Error(`Index ${indexName} not found`);
    }

    const result = await this._toPromise(index.getAll(query));
    return result || [];
  }

  /**
   * Queries records using an index with a single result
   * @param {string} indexName - Name of the index to query
   * @param {string|number} query - Query value
   * @returns {Promise<Object|null>} Promise resolving to the first matching record or null
   */
  async queryOne(indexName, query) {
    const store = await this.getStore('readonly');
    const index = store.index(indexName);

    if (!index) {
      throw new Error(`Index ${indexName} not found`);
    }

    const result = await this._toPromise(index.get(query));
    return result || null;
  }

  /**
   * Counts records in the store
   * @returns {Promise<number>} Promise resolving to the count
   */
  async count() {
    const store = await this.getStore('readonly');
    const result = await this._toPromise(store.count());
    return result || 0;
  }

  /**
   * Counts records matching a query in an index
   * @param {string} indexName - Name of the index to query
   * @param {IDBKeyRange|string|number} query - Query value or key range
   * @returns {Promise<number>} Promise resolving to the count
   */
  async countByIndex(indexName, query) {
    const store = await this.getStore('readonly');
    const index = store.index(indexName);

    if (!index) {
      throw new Error(`Index ${indexName} not found`);
    }

    const result = await this._toPromise(index.count(query));
    return result || 0;
  }

  /**
   * Clears all records from the store
   * @returns {Promise<void>}
   */
  async clear() {
    const store = await this.getStore('readwrite');
    await this._toPromise(store.clear());
  }
}

