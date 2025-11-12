/**
 * ID generation utilities
 * Provides functions for generating unique identifiers
 */

/**
 * Generate a unique ID using crypto.randomUUID if available, 
 * otherwise falls back to timestamp-based UUID v4-like generation
 * @returns {string} Unique identifier
 */
export function generateId() {
  // Use native crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback to UUID v4-like generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a short unique ID (8 characters)
 * Useful for user-facing identifiers
 * @returns {string} Short unique identifier
 */
export function generateShortId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 6);
  return `${timestamp}${randomPart}`.substring(0, 8);
}

/**
 * Generate a numeric ID based on timestamp
 * @returns {number} Numeric timestamp-based ID
 */
export function generateNumericId() {
  return Date.now();
}

export default {
  generateId,
  generateShortId,
  generateNumericId
};

