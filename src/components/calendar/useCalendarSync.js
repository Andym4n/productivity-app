import { useState, useEffect, useCallback, useRef } from 'react';
import calendarSync from '../../services/calendarSync.js';
import { useGoogleAuth } from '../auth/GoogleAuthProvider.jsx';

/**
 * React hook for managing calendar synchronization
 * Provides sync functionality and status tracking
 * 
 * @param {Object} options - Hook options
 * @param {number} [options.autoSyncInterval] - Auto-sync interval in ms (0 to disable)
 * @param {string} [options.calendarId='primary'] - Calendar ID to sync
 * @returns {Object} Sync state and methods
 */
export function useCalendarSync(options = {}) {
  const { autoSyncInterval = 0, calendarId = 'primary' } = options;
  const { isAuthenticated } = useGoogleAuth();
  
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [syncResults, setSyncResults] = useState(null);
  
  const syncIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  /**
   * Perform full sync
   */
  const fullSync = useCallback(async (syncOptions = {}) => {
    if (!isAuthenticated) {
      setSyncError('Not authenticated');
      return null;
    }

    setSyncing(true);
    setSyncError(null);

    try {
      const results = await calendarSync.fullSync(calendarId, syncOptions);
      
      if (isMountedRef.current) {
        setSyncResults(results);
        setLastSync(Date.now());
      }
      
      return results;
    } catch (error) {
      if (isMountedRef.current) {
        setSyncError(error.message);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setSyncing(false);
      }
    }
  }, [isAuthenticated, calendarId]);

  /**
   * Perform incremental sync
   */
  const incrementalSync = useCallback(async () => {
    if (!isAuthenticated) {
      setSyncError('Not authenticated');
      return null;
    }

    setSyncing(true);
    setSyncError(null);

    try {
      const results = await calendarSync.incrementalSync(calendarId);
      
      if (isMountedRef.current) {
        setSyncResults(results);
        setLastSync(Date.now());
      }
      
      return results;
    } catch (error) {
      if (isMountedRef.current) {
        setSyncError(error.message);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setSyncing(false);
      }
    }
  }, [isAuthenticated, calendarId]);

  /**
   * Sync all calendars
   */
  const syncAll = useCallback(async () => {
    if (!isAuthenticated) {
      setSyncError('Not authenticated');
      return null;
    }

    setSyncing(true);
    setSyncError(null);

    try {
      const results = await calendarSync.syncAll();
      
      if (isMountedRef.current) {
        setSyncResults(results);
        setLastSync(Date.now());
      }
      
      return results;
    } catch (error) {
      if (isMountedRef.current) {
        setSyncError(error.message);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setSyncing(false);
      }
    }
  }, [isAuthenticated]);

  /**
   * Get current sync status
   */
  const getSyncStatus = useCallback(() => {
    return calendarSync.getSyncStatus();
  }, []);

  // Initialize calendar sync on mount
  useEffect(() => {
    if (isAuthenticated) {
      calendarSync.initialize().catch(console.error);
    }
  }, [isAuthenticated]);

  // Setup auto-sync if enabled
  useEffect(() => {
    if (autoSyncInterval > 0 && isAuthenticated) {
      console.log(`Setting up auto-sync every ${autoSyncInterval}ms`);
      
      // Perform initial sync
      incrementalSync().catch(console.error);
      
      // Setup interval
      syncIntervalRef.current = setInterval(() => {
        incrementalSync().catch(console.error);
      }, autoSyncInterval);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [autoSyncInterval, isAuthenticated, incrementalSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    syncing,
    lastSync,
    syncError,
    syncResults,
    
    // Methods
    fullSync,
    incrementalSync,
    syncAll,
    getSyncStatus,
    
    // Utility
    isAuthenticated
  };
}

export default useCalendarSync;

