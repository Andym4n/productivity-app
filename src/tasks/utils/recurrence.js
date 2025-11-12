/**
 * Recurrence Utilities
 * 
 * Provides utilities for working with recurring tasks using rrule.js.
 * Handles conversion between our simple recurrence format and rrule.js format,
 * generates next occurrence dates, and validates recurrence patterns.
 */

import { RRule, Frequency } from 'rrule';
import { parseISO, isValid, isAfter, isBefore } from 'date-fns';
import { RECURRENCE_PATTERNS } from '../models/Task.js';

/**
 * Maps our recurrence pattern types to rrule.js Frequency constants
 */
const PATTERN_TO_FREQUENCY = {
  [RECURRENCE_PATTERNS.DAILY]: Frequency.DAILY,
  [RECURRENCE_PATTERNS.WEEKLY]: Frequency.WEEKLY,
  [RECURRENCE_PATTERNS.MONTHLY]: Frequency.MONTHLY,
  [RECURRENCE_PATTERNS.CUSTOM]: null // Custom patterns use rrule options directly
};

/**
 * Converts our simple recurrence format to rrule.js options
 * @param {Object} recurrence - Our recurrence format
 * @param {string} recurrence.pattern - 'daily' | 'weekly' | 'monthly' | 'custom'
 * @param {number} recurrence.interval - Interval number
 * @param {number[]} recurrence.daysOfWeek - Days of week (0-6) for weekly patterns
 * @param {string|null} recurrence.endDate - ISO date string or null
 * @param {Object} recurrence.rruleOptions - rrule.js options for custom patterns
 * @param {Date|string} startDate - Start date for the recurrence (defaults to now)
 * @returns {Object} rrule.js options object
 */
export function convertToRRuleOptions(recurrence, startDate = null) {
  if (!recurrence || typeof recurrence !== 'object') {
    throw new Error('Recurrence must be an object');
  }

  const start = startDate 
    ? (startDate instanceof Date ? startDate : parseISO(startDate))
    : new Date();

  if (!isValid(start)) {
    throw new Error('Invalid start date');
  }

  const options = {
    dtstart: start,
    freq: null
  };

  // Handle custom patterns (use rruleOptions directly)
  if (recurrence.pattern === RECURRENCE_PATTERNS.CUSTOM) {
    if (!recurrence.rruleOptions || typeof recurrence.rruleOptions !== 'object') {
      throw new Error('Custom recurrence pattern requires rruleOptions');
    }
    
    // Merge custom options with start date
    return {
      ...recurrence.rruleOptions,
      dtstart: start
    };
  }

  // Handle standard patterns
  const frequency = PATTERN_TO_FREQUENCY[recurrence.pattern];
  if (!frequency) {
    throw new Error(`Unsupported recurrence pattern: ${recurrence.pattern}`);
  }

  options.freq = frequency;
  options.interval = recurrence.interval || 1;

  // Handle weekly patterns with specific days
  if (recurrence.pattern === RECURRENCE_PATTERNS.WEEKLY && recurrence.daysOfWeek) {
    if (!Array.isArray(recurrence.daysOfWeek) || recurrence.daysOfWeek.length === 0) {
      throw new Error('Weekly recurrence must include daysOfWeek array');
    }
    // rrule.js uses 0-6 for days (0 = Monday), but our format uses 0-6 (0 = Sunday)
    // Convert from Sunday-based (0-6) to Monday-based (0-6) for rrule.js
    // rrule.js: 0=Monday, 1=Tuesday, ..., 6=Sunday
    // Our format: 0=Sunday, 1=Monday, ..., 6=Saturday
    const rruleDays = recurrence.daysOfWeek.map(day => {
      // Convert: 0 (Sun) -> 6, 1 (Mon) -> 0, 2 (Tue) -> 1, ..., 6 (Sat) -> 5
      return day === 0 ? 6 : day - 1;
    });
    options.byweekday = rruleDays;
  }

  // Handle end date
  if (recurrence.endDate) {
    const endDate = recurrence.endDate instanceof Date 
      ? recurrence.endDate 
      : parseISO(recurrence.endDate);
    
    if (!isValid(endDate)) {
      throw new Error('Invalid recurrence endDate');
    }
    
    options.until = endDate;
  }

  return options;
}

/**
 * Creates an RRule instance from our recurrence format
 * @param {Object} recurrence - Our recurrence format
 * @param {Date|string} startDate - Start date for the recurrence
 * @returns {RRule} rrule.js RRule instance
 */
export function createRRule(recurrence, startDate = null) {
  const options = convertToRRuleOptions(recurrence, startDate);
  return new RRule(options);
}

/**
 * Generates the next occurrence date for a recurring task
 * @param {Object} recurrence - Our recurrence format
 * @param {Date|string} lastOccurrenceDate - Date of the last occurrence (or task creation date)
 * @param {Date|string} afterDate - Generate next occurrence after this date (defaults to now)
 * @returns {Date|null} Next occurrence date, or null if no more occurrences
 */
export function getNextOccurrence(recurrence, lastOccurrenceDate, afterDate = null) {
  if (!recurrence || typeof recurrence !== 'object' || !recurrence.pattern) {
    return null;
  }

  try {
    // Use last occurrence date as start date for the recurrence rule
    const start = lastOccurrenceDate
      ? (lastOccurrenceDate instanceof Date ? lastOccurrenceDate : parseISO(lastOccurrenceDate))
      : null;

    // Determine the "after" date - use afterDate if provided, otherwise use lastOccurrenceDate, otherwise use now
    const after = afterDate 
      ? (afterDate instanceof Date ? afterDate : parseISO(afterDate))
      : (start || new Date());

    if (!isValid(after)) {
      return null;
    }

    // If no start date provided, use after date as start
    const ruleStart = start || after;

    if (!isValid(ruleStart)) {
      return null;
    }

    const rrule = createRRule(recurrence, ruleStart);
    
    // Get the next occurrence after the specified date
    // Use inclusive=false to exclude afterDate itself, but we need to handle edge cases
    // First try to get occurrence after (exclusive)
    let nextDate = rrule.after(after, false);
    
    // If that returns null, try inclusive to see if there's a match
    // But only return it if it's actually after (not equal to) afterDate
    if (!nextDate) {
      const inclusiveDate = rrule.after(after, true);
      if (inclusiveDate && inclusiveDate.getTime() > after.getTime()) {
        nextDate = inclusiveDate;
      } else {
        // Try getting the next occurrence after a slightly later time
        const slightlyLater = new Date(after.getTime() + 1000);
        nextDate = rrule.after(slightlyLater, false);
      }
    }
    
    if (!nextDate) {
      return null;
    }
    
    // Check if we've passed the end date
    if (recurrence.endDate) {
      const endDate = recurrence.endDate instanceof Date
        ? recurrence.endDate
        : parseISO(recurrence.endDate);
      
      if (isValid(endDate) && nextDate && isAfter(nextDate, endDate)) {
        return null; // No more occurrences
      }
    }

    return nextDate;
  } catch (error) {
    // If there's an error generating the rule, return null
    console.error('Error generating next occurrence:', error);
    return null;
  }
}

/**
 * Generates multiple next occurrence dates
 * @param {Object} recurrence - Our recurrence format
 * @param {Date|string} startDate - Start date for the recurrence
 * @param {number} count - Number of occurrences to generate
 * @param {Date|string} afterDate - Generate occurrences after this date (defaults to now)
 * @returns {Date[]} Array of occurrence dates
 */
export function getNextOccurrences(recurrence, startDate, count, afterDate = null) {
  if (!recurrence || typeof recurrence !== 'object' || !recurrence.pattern || count < 1) {
    return [];
  }

  try {
    const after = afterDate 
      ? (afterDate instanceof Date ? afterDate : parseISO(afterDate))
      : new Date();

    if (!isValid(after)) {
      return [];
    }

    const start = startDate
      ? (startDate instanceof Date ? startDate : parseISO(startDate))
      : after;

    if (!isValid(start)) {
      return [];
    }

    const rrule = createRRule(recurrence, start);
    
    // Determine end date for between() - use endDate if provided, otherwise use far future
    const end = recurrence.endDate 
      ? (recurrence.endDate instanceof Date ? recurrence.endDate : parseISO(recurrence.endDate))
      : new Date('2099-12-31'); // Far future date
    
    if (!isValid(end)) {
      return [];
    }
    
    // Generate occurrences (inclusive of both start and end)
    // Add 1 second to after to ensure we get occurrences after that date
    const afterExclusive = new Date(after.getTime() + 1000);
    const occurrences = rrule.between(afterExclusive, end, true);
    
    // Limit to requested count
    return occurrences.slice(0, count);
  } catch (error) {
    console.error('Error generating occurrences:', error);
    return [];
  }
}

/**
 * Validates that a recurrence pattern can be converted to a valid rrule.js rule
 * @param {Object} recurrence - Our recurrence format
 * @param {Date|string} startDate - Start date for validation
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateRRulePattern(recurrence, startDate = null) {
  if (!recurrence || typeof recurrence !== 'object') {
    return { isValid: false, error: 'Recurrence must be an object' };
  }

  try {
    const options = convertToRRuleOptions(recurrence, startDate);
    const rrule = new RRule(options);
    
    // Try to generate at least one occurrence to validate the rule
    const testDate = rrule.after(new Date(), true);
    
    if (!testDate) {
      return { isValid: false, error: 'Recurrence pattern does not generate any occurrences' };
    }

    return { isValid: true, error: null };
  } catch (error) {
    return { isValid: false, error: error.message || 'Invalid recurrence pattern' };
  }
}

/**
 * Checks if a date matches a recurrence pattern
 * @param {Object} recurrence - Our recurrence format
 * @param {Date|string} date - Date to check
 * @param {Date|string} startDate - Start date for the recurrence
 * @returns {boolean} True if the date matches the pattern
 */
export function matchesRecurrence(recurrence, date, startDate) {
  if (!recurrence || !date) {
    return false;
  }

  try {
    const checkDate = date instanceof Date ? date : parseISO(date);
    if (!isValid(checkDate)) {
      return false;
    }

    const start = startDate
      ? (startDate instanceof Date ? startDate : parseISO(startDate))
      : checkDate;

    if (!isValid(start)) {
      return false;
    }

    const rrule = createRRule(recurrence, start);
    
    // Check if the date is in the set of occurrences
    return rrule.between(checkDate, checkDate, true).length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Gets a human-readable description of a recurrence pattern
 * @param {Object} recurrence - Our recurrence format
 * @returns {string} Human-readable description
 */
export function getRecurrenceDescription(recurrence) {
  if (!recurrence || typeof recurrence !== 'object') {
    return 'No recurrence';
  }

  try {
    const rrule = createRRule(recurrence);
    return rrule.toText();
  } catch (error) {
    return 'Invalid recurrence pattern';
  }
}

export default {
  convertToRRuleOptions,
  createRRule,
  getNextOccurrence,
  getNextOccurrences,
  validateRRulePattern,
  matchesRecurrence,
  getRecurrenceDescription
};

