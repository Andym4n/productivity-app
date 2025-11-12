/**
 * Content Parser Utility
 * 
 * Parses Slate.js content to extract task/event IDs and date mentions
 * for auto-linking functionality.
 */

/**
 * UUID v4 regex pattern
 * Matches: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

/**
 * Date patterns for matching various date formats
 */
const DATE_PATTERNS = [
  // ISO dates: 2024-01-15, 2024-01-15T10:30:00Z
  /\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?/g,
  // US format: 01/15/2024, 1/15/2024
  /\d{1,2}\/\d{1,2}\/\d{4}/g,
  // European format: 15/01/2024, 15/1/2024
  /\d{1,2}\/\d{1,2}\/\d{4}/g,
  // Written dates: January 15, 2024, Jan 15, 2024, 15 January 2024
  /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/gi,
  // Relative dates: today, tomorrow, yesterday
  /\b(today|tomorrow|yesterday)\b/gi,
  // Day names: Monday, Tuesday, etc. (for "this Monday", "next Friday")
  /\b(this|next|last)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi
];

/**
 * Extracts plain text from Slate.js content
 * @param {Array} slateValue - Slate.js editor value (array of nodes)
 * @returns {string} Plain text content
 */
export function extractText(slateValue) {
  if (!Array.isArray(slateValue)) {
    return '';
  }

  const extractTextFromNode = (node) => {
    if (typeof node === 'string') {
      return node;
    }

    if (node.text) {
      return node.text;
    }

    if (Array.isArray(node.children)) {
      return node.children.map(extractTextFromNode).join('');
    }

    return '';
  };

  return slateValue.map(extractTextFromNode).join(' ');
}

/**
 * Extracts UUIDs from text content
 * @param {string} text - Text content to search
 * @returns {Array<string>} Array of unique UUIDs found
 */
export function extractUUIDs(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const matches = text.match(UUID_PATTERN);
  if (!matches) {
    return [];
  }

  // Return unique UUIDs (case-insensitive)
  return [...new Set(matches.map(id => id.toLowerCase()))];
}

/**
 * Parses a date string into a Date object
 * @param {string} dateStr - Date string to parse
 * @param {Date} referenceDate - Reference date for relative dates (default: today)
 * @returns {Date|null} Parsed date or null if parsing fails
 */
export function parseDate(dateStr, referenceDate = new Date()) {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const normalized = dateStr.trim().toLowerCase();

  // Handle relative dates
  if (normalized === 'today') {
    return new Date(referenceDate);
  }
  if (normalized === 'tomorrow') {
    const tomorrow = new Date(referenceDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  if (normalized === 'yesterday') {
    const yesterday = new Date(referenceDate);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  // Handle ISO dates
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Handle US/European format (MM/DD/YYYY or DD/MM/YYYY)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    // Try US format first (MM/DD/YYYY)
    const usDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
    if (!isNaN(usDate.getTime())) {
      return usDate;
    }
    // Try European format (DD/MM/YYYY)
    const euDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(euDate.getTime())) {
      return euDate;
    }
  }

  // Try native Date parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Extracts date mentions from text content
 * @param {string} text - Text content to search
 * @param {Date} referenceDate - Reference date for relative dates (default: today)
 * @returns {Array<{text: string, date: Date}>} Array of date mentions with parsed dates
 */
export function extractDates(text, referenceDate = new Date()) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const dates = [];
  const seen = new Set();

  // Try each date pattern
  for (const pattern of DATE_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const dateStr = match[0];
      const parsed = parseDate(dateStr, referenceDate);
      
      if (parsed && !seen.has(dateStr.toLowerCase())) {
        seen.add(dateStr.toLowerCase());
        dates.push({
          text: dateStr,
          date: parsed
        });
      }
    }
  }

  return dates;
}

/**
 * Extracts all references (UUIDs and dates) from Slate.js content
 * @param {Array} slateValue - Slate.js editor value (array of nodes)
 * @param {Date} referenceDate - Reference date for relative dates (default: today)
 * @returns {Object} Object with uuids and dates arrays
 */
export function extractReferences(slateValue, referenceDate = new Date()) {
  const text = extractText(slateValue);
  
  return {
    uuids: extractUUIDs(text),
    dates: extractDates(text, referenceDate)
  };
}

export default {
  extractText,
  extractUUIDs,
  extractDates,
  extractReferences,
  parseDate
};

