/**
 * Context Manager Service
 * 
 * Manages time-based context switching with event-driven notifications.
 * Replaces polling mechanism with efficient timer-based context updates.
 */

import { getCurrentContext, CONTEXT_TYPES } from './contextDetection.js';
import { getCurrentSchedule } from '../schedule/crud/scheduleOperations.js';
import { parseTimeToMinutes } from '../schedule/models/WorkSchedule.js';
import { getDay, getHours, getMinutes, setHours, setMinutes, addDays, startOfDay } from 'date-fns';

/**
 * Simple event emitter for context change notifications
 */
class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners.clear();
  }
}

/**
 * ContextManager class
 * Manages context state and time-based switching
 */
class ContextManager {
  constructor() {
    this.currentContext = CONTEXT_TYPES.PERSONAL;
    this.manualOverride = null;
    this.timerId = null;
    this.checkIntervalId = null;
    this.emitter = new EventEmitter();
    this.isInitialized = false;
    this.schedule = null;
    this.STORAGE_KEY = 'context-manager-override';
  }

  /**
   * Load persisted manual override from localStorage
   * @returns {string|null} Override context or null
   */
  loadPersistedOverride() {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }

      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const data = JSON.parse(stored);
      
      // Validate stored data
      if (data && data.context && Object.values(CONTEXT_TYPES).includes(data.context)) {
        return data.context;
      }

      // Invalid data, clear it
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    } catch (error) {
      console.error('Failed to load persisted override:', error);
      // Clear corrupted data
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch (e) {
        // Ignore errors when clearing
      }
      return null;
    }
  }

  /**
   * Save manual override to localStorage
   * @param {string|null} context - Context to save or null to clear
   */
  savePersistedOverride(context) {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }

      if (context === null) {
        localStorage.removeItem(this.STORAGE_KEY);
      } else {
        const data = {
          context,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to save persisted override:', error);
      // Ignore quota exceeded errors silently
      if (error.name !== 'QuotaExceededError') {
        console.warn('Storage quota exceeded or localStorage unavailable');
      }
    }
  }

  /**
   * Initialize the context manager
   * Loads current context and sets up automatic switching
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load persisted manual override if it exists
      const persistedOverride = this.loadPersistedOverride();
      if (persistedOverride) {
        this.manualOverride = persistedOverride;
      }

      // Load current context
      await this.updateContext();

      // Set up automatic switching (only if no manual override)
      if (!this.manualOverride) {
        await this.scheduleNextSwitch();
      }

      // Set up periodic check (fallback for schedule changes)
      this.checkIntervalId = setInterval(() => {
        this.checkAndUpdateContext().catch(error => {
          console.error('Error in periodic context check:', error);
        });
      }, 60000); // Check every minute as fallback

      this.isInitialized = true;
      this.emitter.emit('initialized', { 
        context: this.getCurrentContext(),
        isManualOverride: this.manualOverride !== null
      });
    } catch (error) {
      console.error('Failed to initialize ContextManager:', error);
      // Set default context on error
      this.currentContext = CONTEXT_TYPES.PERSONAL;
      this.isInitialized = true;
    }
  }

  /**
   * Get the current context (respects manual override)
   * @returns {string} Current context
   */
  getCurrentContext() {
    return this.manualOverride || this.currentContext;
  }

  /**
   * Check if manual override is active
   * @returns {boolean}
   */
  isManualOverride() {
    return this.manualOverride !== null;
  }

  /**
   * Set manual override
   * @param {string|null} context - Context to override with, or null to clear
   */
  setManualOverride(context) {
    const previousOverride = this.manualOverride;
    this.manualOverride = context;

    // Persist override state
    this.savePersistedOverride(context);

    if (previousOverride !== context) {
      this.emitter.emit('contextChanged', {
        context: this.getCurrentContext(),
        previousContext: previousOverride || this.currentContext,
        isManualOverride: context !== null
      });
    }
  }

  /**
   * Clear manual override and resume automatic switching
   */
  clearManualOverride() {
    if (this.manualOverride !== null) {
      const previousContext = this.getCurrentContext();
      this.manualOverride = null;
      
      // Clear persisted override
      this.savePersistedOverride(null);
      
      // Update context immediately after clearing override
      this.updateContext().then(() => {
        this.emitter.emit('contextChanged', {
          context: this.getCurrentContext(),
          previousContext,
          isManualOverride: false
        });
        // Reschedule next switch
        this.scheduleNextSwitch();
      }).catch(error => {
        console.error('Error updating context after clearing override:', error);
      });
    }
  }

  /**
   * Update context from detection service
   */
  async updateContext() {
    try {
      const newContext = await getCurrentContext();
      
      if (newContext !== this.currentContext) {
        const previousContext = this.currentContext;
        this.currentContext = newContext;

        // Only emit if not in manual override mode
        if (!this.manualOverride) {
          this.emitter.emit('contextChanged', {
            context: this.currentContext,
            previousContext,
            isManualOverride: false
          });
        }
      }

      return this.currentContext;
    } catch (error) {
      console.error('Failed to update context:', error);
      // Keep previous context on error
      return this.currentContext;
    }
  }

  /**
   * Check and update context if needed
   */
  async checkAndUpdateContext() {
    // Skip if manual override is active
    if (this.manualOverride) {
      return;
    }

    await this.updateContext();
  }

  /**
   * Calculate the next context transition time based on work schedule
   * @returns {Date|null} Next transition time or null if no schedule
   */
  async calculateNextTransitionTime() {
    try {
      const schedule = await getCurrentSchedule();
      
      if (!schedule || !schedule.isActive) {
        return null; // No active schedule, no transitions
      }

      const now = new Date();
      const currentDay = getDay(now);
      const currentHour = getHours(now);
      const currentMinute = getMinutes(now);
      const currentMinutes = currentHour * 60 + currentMinute;

      // Get today's schedule
      let todayStartMinutes = null;
      let todayEndMinutes = null;
      let isWorkDay = false;

      if (schedule.weeklySchedule && schedule.weeklySchedule[currentDay]) {
        const daySchedule = schedule.weeklySchedule[currentDay];
        if (daySchedule.enabled) {
          isWorkDay = true;
          todayStartMinutes = parseTimeToMinutes(daySchedule.startTime);
          todayEndMinutes = parseTimeToMinutes(daySchedule.endTime);
        }
      } else if (schedule.defaultStartTime && schedule.defaultEndTime) {
        // Check if today is a preferred work day
        if (schedule.preferredWorkDays && schedule.preferredWorkDays.includes(currentDay)) {
          isWorkDay = true;
          todayStartMinutes = parseTimeToMinutes(schedule.defaultStartTime);
          todayEndMinutes = parseTimeToMinutes(schedule.defaultEndTime);
        }
      }

      if (!isWorkDay) {
        // Not a work day, check next work day
        return this.findNextWorkDayStart(schedule, now);
      }

      // Calculate next transition for today
      let nextTransition = null;

      if (currentMinutes < todayStartMinutes) {
        // Before work starts - next transition is work start
        nextTransition = setMinutes(setHours(startOfDay(now), Math.floor(todayStartMinutes / 60)), todayStartMinutes % 60);
      } else if (currentMinutes >= todayStartMinutes && currentMinutes < todayEndMinutes) {
        // During work hours - next transition is work end
        nextTransition = setMinutes(setHours(startOfDay(now), Math.floor(todayEndMinutes / 60)), todayEndMinutes % 60);
      } else {
        // After work hours - next transition is next work day start
        nextTransition = this.findNextWorkDayStart(schedule, addDays(now, 1));
      }

      return nextTransition;
    } catch (error) {
      console.error('Failed to calculate next transition time:', error);
      return null;
    }
  }

  /**
   * Find the next work day start time
   * @param {Object} schedule - Work schedule
   * @param {Date} fromDate - Date to start searching from
   * @returns {Date|null} Next work day start time
   */
  findNextWorkDayStart(schedule, fromDate) {
    // Search up to 7 days ahead
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDate = addDays(fromDate, dayOffset);
      const dayOfWeek = getDay(checkDate);

      let startMinutes = null;
      let isWorkDay = false;

      if (schedule.weeklySchedule && schedule.weeklySchedule[dayOfWeek]) {
        const daySchedule = schedule.weeklySchedule[dayOfWeek];
        if (daySchedule.enabled) {
          isWorkDay = true;
          startMinutes = parseTimeToMinutes(daySchedule.startTime);
        }
      } else if (schedule.defaultStartTime && schedule.preferredWorkDays && schedule.preferredWorkDays.includes(dayOfWeek)) {
        isWorkDay = true;
        startMinutes = parseTimeToMinutes(schedule.defaultStartTime);
      }

      if (isWorkDay && startMinutes !== null) {
        return setMinutes(
          setHours(startOfDay(checkDate), Math.floor(startMinutes / 60)),
          startMinutes % 60
        );
      }
    }

    return null; // No work day found in next 7 days
  }

  /**
   * Schedule the next automatic context switch
   */
  async scheduleNextSwitch() {
    // Clear existing timer
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    // Skip if manual override is active
    if (this.manualOverride) {
      return;
    }

    const nextTransition = await this.calculateNextTransitionTime();

    if (!nextTransition) {
      // No schedule or no transitions, check again in an hour
      this.timerId = setTimeout(() => {
        this.scheduleNextSwitch();
      }, 3600000); // 1 hour
      return;
    }

    const now = new Date();
    const delay = nextTransition.getTime() - now.getTime();

    if (delay <= 0) {
      // Transition time has passed, update immediately
      await this.updateContext();
      await this.scheduleNextSwitch();
      return;
    }

    // Schedule the transition
    this.timerId = setTimeout(async () => {
      await this.updateContext();
      await this.scheduleNextSwitch();
    }, delay);

    this.emitter.emit('nextSwitchScheduled', {
      nextTransitionTime: nextTransition,
      delayMs: delay
    });
  }

  /**
   * Subscribe to context change events
   * @param {Function} callback - Callback function(context, previousContext, isManualOverride)
   * @returns {Function} Unsubscribe function
   */
  onContextChange(callback) {
    return this.emitter.on('contextChanged', callback);
  }

  /**
   * Subscribe to initialization events
   * @param {Function} callback - Callback function({ context })
   * @returns {Function} Unsubscribe function
   */
  onInitialized(callback) {
    return this.emitter.on('initialized', callback);
  }

  /**
   * Subscribe to next switch scheduled events
   * @param {Function} callback - Callback function({ nextTransitionTime, delayMs })
   * @returns {Function} Unsubscribe function
   */
  onNextSwitchScheduled(callback) {
    return this.emitter.on('nextSwitchScheduled', callback);
  }

  /**
   * Cleanup and destroy the context manager
   */
  destroy() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }

    this.emitter.removeAllListeners();
    this.isInitialized = false;
  }
}

// Create singleton instance
const contextManager = new ContextManager();

// Auto-initialize when module loads
contextManager.initialize().catch(error => {
  console.error('Failed to auto-initialize ContextManager:', error);
});

export default contextManager;
export { ContextManager, CONTEXT_TYPES };

