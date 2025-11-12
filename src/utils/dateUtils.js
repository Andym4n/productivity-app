import {
  format,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  isFuture,
  formatDistanceToNow,
  formatDistance,
  getDay,
  getHours,
  getMinutes
} from 'date-fns';

/**
 * Date utility functions for formatting, parsing, and calculations
 * Uses date-fns v3+ for reliable date manipulation
 */

/**
 * Formats a date to a readable string
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string (default: 'MMM d, yyyy')
 * @returns {string} Formatted date string
 */
export function formatDate(date, formatStr = 'MMM d, yyyy') {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      throw new Error('Invalid date');
    }
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Formats a date and time
 * @param {Date|string} date - Date to format
 * @param {string} dateFormat - Date format (default: 'MMM d, yyyy')
 * @param {string} timeFormat - Time format (default: 'h:mm a')
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date, dateFormat = 'MMM d, yyyy', timeFormat = 'h:mm a') {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      throw new Error('Invalid date');
    }
    return `${format(dateObj, dateFormat)} at ${format(dateObj, timeFormat)}`;
  } catch (error) {
    console.error('Error formatting date/time:', error);
    return 'Invalid date';
  }
}

/**
 * Formats a time only
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string (default: 'h:mm a')
 * @returns {string} Formatted time string
 */
export function formatTime(date, formatStr = 'h:mm a') {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      throw new Error('Invalid date');
    }
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid time';
  }
}

/**
 * Parses a date string to a Date object
 * @param {string} dateString - ISO date string
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseDate(dateString) {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Gets the start of a day
 * @param {Date|string} date - Date
 * @returns {Date} Start of day
 */
export function getStartOfDay(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return startOfDay(dateObj);
}

/**
 * Gets the end of a day
 * @param {Date|string} date - Date
 * @returns {Date} End of day
 */
export function getEndOfDay(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return endOfDay(dateObj);
}

/**
 * Gets the start of a week
 * @param {Date|string} date - Date
 * @param {Object} options - Options (weekStartsOn: 0-6, default: 0 for Sunday)
 * @returns {Date} Start of week
 */
export function getStartOfWeek(date, options = { weekStartsOn: 0 }) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return startOfWeek(dateObj, options);
}

/**
 * Gets the end of a week
 * @param {Date|string} date - Date
 * @param {Object} options - Options (weekStartsOn: 0-6, default: 0 for Sunday)
 * @returns {Date} End of week
 */
export function getEndOfWeek(date, options = { weekStartsOn: 0 }) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return endOfWeek(dateObj, options);
}

/**
 * Gets the start of a month
 * @param {Date|string} date - Date
 * @returns {Date} Start of month
 */
export function getStartOfMonth(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return startOfMonth(dateObj);
}

/**
 * Gets the end of a month
 * @param {Date|string} date - Date
 * @returns {Date} End of month
 */
export function getEndOfMonth(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return endOfMonth(dateObj);
}

/**
 * Adds days to a date
 * @param {Date|string} date - Date
 * @param {number} amount - Number of days to add
 * @returns {Date} New date
 */
export function addDaysToDate(date, amount) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addDays(dateObj, amount);
}

/**
 * Adds weeks to a date
 * @param {Date|string} date - Date
 * @param {number} amount - Number of weeks to add
 * @returns {Date} New date
 */
export function addWeeksToDate(date, amount) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addWeeks(dateObj, amount);
}

/**
 * Adds months to a date
 * @param {Date|string} date - Date
 * @param {number} amount - Number of months to add
 * @returns {Date} New date
 */
export function addMonthsToDate(date, amount) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addMonths(dateObj, amount);
}

/**
 * Calculates the difference in days between two dates
 * @param {Date|string} dateLeft - First date
 * @param {Date|string} dateRight - Second date
 * @returns {number} Difference in days
 */
export function getDaysDifference(dateLeft, dateRight) {
  const left = typeof dateLeft === 'string' ? parseISO(dateLeft) : dateLeft;
  const right = typeof dateRight === 'string' ? parseISO(dateRight) : dateRight;
  return differenceInDays(left, right);
}

/**
 * Calculates the difference in hours between two dates
 * @param {Date|string} dateLeft - First date
 * @param {Date|string} dateRight - Second date
 * @returns {number} Difference in hours
 */
export function getHoursDifference(dateLeft, dateRight) {
  const left = typeof dateLeft === 'string' ? parseISO(dateLeft) : dateLeft;
  const right = typeof dateRight === 'string' ? parseISO(dateRight) : dateRight;
  return differenceInHours(left, right);
}

/**
 * Calculates the difference in minutes between two dates
 * @param {Date|string} dateLeft - First date
 * @param {Date|string} dateRight - Second date
 * @returns {number} Difference in minutes
 */
export function getMinutesDifference(dateLeft, dateRight) {
  const left = typeof dateLeft === 'string' ? parseISO(dateLeft) : dateLeft;
  const right = typeof dateRight === 'string' ? parseISO(dateRight) : dateRight;
  return differenceInMinutes(left, right);
}

/**
 * Checks if two dates are the same day
 * @param {Date|string} dateLeft - First date
 * @param {Date|string} dateRight - Second date
 * @returns {boolean} True if same day
 */
export function areSameDay(dateLeft, dateRight) {
  const left = typeof dateLeft === 'string' ? parseISO(dateLeft) : dateLeft;
  const right = typeof dateRight === 'string' ? parseISO(dateRight) : dateRight;
  return isSameDay(left, right);
}

/**
 * Checks if two dates are in the same week
 * @param {Date|string} dateLeft - First date
 * @param {Date|string} dateRight - Second date
 * @returns {boolean} True if same week
 */
export function areSameWeek(dateLeft, dateRight) {
  const left = typeof dateLeft === 'string' ? parseISO(dateLeft) : dateLeft;
  const right = typeof dateRight === 'string' ? parseISO(dateRight) : dateRight;
  return isSameWeek(left, right);
}

/**
 * Checks if two dates are in the same month
 * @param {Date|string} dateLeft - First date
 * @param {Date|string} dateRight - Second date
 * @returns {boolean} True if same month
 */
export function areSameMonth(dateLeft, dateRight) {
  const left = typeof dateLeft === 'string' ? parseISO(dateLeft) : dateLeft;
  const right = typeof dateRight === 'string' ? parseISO(dateRight) : dateRight;
  return isSameMonth(left, right);
}

/**
 * Checks if a date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if today
 */
export function isDateToday(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isToday(dateObj);
}

/**
 * Checks if a date is tomorrow
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if tomorrow
 */
export function isDateTomorrow(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isTomorrow(dateObj);
}

/**
 * Checks if a date is yesterday
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if yesterday
 */
export function isDateYesterday(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isYesterday(dateObj);
}

/**
 * Checks if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if in the past
 */
export function isDatePast(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isPast(dateObj);
}

/**
 * Checks if a date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if in the future
 */
export function isDateFuture(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isFuture(dateObj);
}

/**
 * Gets a human-readable relative time string (e.g., "2 hours ago")
 * @param {Date|string} date - Date
 * @param {Object} options - Options for formatting
 * @returns {string} Relative time string
 */
export function getRelativeTime(date, options = {}) {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      throw new Error('Invalid date');
    }
    return formatDistanceToNow(dateObj, { addSuffix: true, ...options });
  } catch (error) {
    console.error('Error getting relative time:', error);
    return 'Invalid date';
  }
}

/**
 * Gets a human-readable distance between two dates
 * @param {Date|string} dateLeft - First date
 * @param {Date|string} dateRight - Second date
 * @param {Object} options - Options for formatting
 * @returns {string} Distance string
 */
export function getTimeDistance(dateLeft, dateRight, options = {}) {
  try {
    const left = typeof dateLeft === 'string' ? parseISO(dateLeft) : dateLeft;
    const right = typeof dateRight === 'string' ? parseISO(dateRight) : dateRight;
    return formatDistance(left, right, options);
  } catch (error) {
    console.error('Error getting time distance:', error);
    return 'Invalid dates';
  }
}

/**
 * Formats a duration in minutes to a human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "2h 30m" or "45m")
 */
export function formatDuration(minutes) {
  if (minutes < 0) {
    return '0m';
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Gets the current date/time as ISO string
 * @returns {string} ISO date string
 */
export function getCurrentDateTime() {
  return new Date().toISOString();
}

/**
 * Gets the current date (start of day) as ISO string
 * @returns {string} ISO date string
 */
export function getCurrentDate() {
  return startOfDay(new Date()).toISOString();
}

export default {
  formatDate,
  formatDateTime,
  formatTime,
  parseDate,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  addDaysToDate,
  addWeeksToDate,
  addMonthsToDate,
  getDaysDifference,
  getHoursDifference,
  getMinutesDifference,
  areSameDay,
  areSameWeek,
  areSameMonth,
  isDateToday,
  isDateTomorrow,
  isDateYesterday,
  isDatePast,
  isDateFuture,
  getRelativeTime,
  getTimeDistance,
  formatDuration,
  getCurrentDateTime,
  getCurrentDate
};

