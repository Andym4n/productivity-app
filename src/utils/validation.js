/**
 * Validation utility functions for common input types and business rules
 */

/**
 * Validates an email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates a URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a date string
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date string
 */
export function isValidDateString(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validates a time string (HH:mm format)
 * @param {string} timeString - Time string to validate
 * @returns {boolean} True if valid time string
 */
export function isValidTimeString(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return false;
  }
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString.trim());
}

/**
 * Validates a non-empty string
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length (default: 1)
 * @param {number} maxLength - Maximum length (optional)
 * @returns {boolean} True if valid
 */
export function isValidString(value, minLength = 1, maxLength = null) {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return false;
  }
  if (maxLength !== null && trimmed.length > maxLength) {
    return false;
  }
  return true;
}

/**
 * Validates a number within a range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {boolean} True if valid
 */
export function isValidNumber(value, min = null, max = null) {
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }
  if (min !== null && value < min) {
    return false;
  }
  if (max !== null && value > max) {
    return false;
  }
  return true;
}

/**
 * Validates a positive integer
 * @param {number} value - Value to validate
 * @returns {boolean} True if valid positive integer
 */
export function isValidPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Validates a non-negative integer
 * @param {number} value - Value to validate
 * @returns {boolean} True if valid non-negative integer
 */
export function isValidNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Validates a UUID
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid UUID
 */
export function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates a task priority
 * @param {string} priority - Priority to validate
 * @returns {boolean} True if valid priority
 */
export function isValidTaskPriority(priority) {
  const validPriorities = ['high', 'medium', 'low'];
  return validPriorities.includes(priority);
}

/**
 * Validates a task status
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid status
 */
export function isValidTaskStatus(status) {
  const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
  return validStatuses.includes(status);
}

/**
 * Validates a task context
 * @param {string} context - Context to validate
 * @returns {boolean} True if valid context
 */
export function isValidTaskContext(context) {
  const validContexts = ['work', 'personal'];
  return validContexts.includes(context);
}

/**
 * Validates a date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {boolean} True if valid range (start <= end)
 */
export function isValidDateRange(startDate, endDate) {
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    return start <= end;
  } catch {
    return false;
  }
}

/**
 * Validates a time estimate in minutes
 * @param {number} minutes - Minutes to validate
 * @returns {boolean} True if valid (positive number)
 */
export function isValidTimeEstimate(minutes) {
  return isValidPositiveInteger(minutes);
}

/**
 * Validates an exercise type
 * @param {string} type - Exercise type to validate
 * @returns {boolean} True if valid type
 */
export function isValidExerciseType(type) {
  const validTypes = ['reps', 'duration', 'distance', 'weight'];
  return validTypes.includes(type);
}

/**
 * Sanitizes a string by removing HTML tags and trimming
 * @param {string} value - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  // Remove HTML tags (including script tags and their content)
  // First remove script tags and their content
  let sanitized = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Then remove all remaining HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = sanitized;
  sanitized = textarea.value;
  // Trim whitespace
  return sanitized.trim();
}

/**
 * Validates and sanitizes user input
 * @param {string} input - Input to validate and sanitize
 * @param {Object} options - Validation options
 * @returns {Object} { isValid: boolean, sanitized: string, error: string }
 */
export function validateAndSanitizeInput(input, options = {}) {
  const {
    required = false,
    minLength = 0,
    maxLength = null,
    allowHtml = false
  } = options;

  if (required && (!input || input.trim().length === 0)) {
    return {
      isValid: false,
      sanitized: '',
      error: 'This field is required'
    };
  }

  if (!input) {
    return {
      isValid: true,
      sanitized: '',
      error: null
    };
  }

  const sanitized = allowHtml ? input.trim() : sanitizeString(input);

  if (sanitized.length < minLength) {
    return {
      isValid: false,
      sanitized,
      error: `Must be at least ${minLength} characters`
    };
  }

  if (maxLength !== null && sanitized.length > maxLength) {
    return {
      isValid: false,
      sanitized,
      error: `Must be no more than ${maxLength} characters`
    };
  }

  return {
    isValid: true,
    sanitized,
    error: null
  };
}

export default {
  isValidEmail,
  isValidUrl,
  isValidDateString,
  isValidTimeString,
  isValidString,
  isValidNumber,
  isValidPositiveInteger,
  isValidNonNegativeInteger,
  isValidUUID,
  isValidTaskPriority,
  isValidTaskStatus,
  isValidTaskContext,
  isValidDateRange,
  isValidTimeEstimate,
  isValidExerciseType,
  sanitizeString,
  validateAndSanitizeInput
};

