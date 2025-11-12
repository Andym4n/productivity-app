/**
 * Journal Template Model
 * 
 * Defines the structure and validation for Journal Template objects.
 * Templates support both built-in and user-defined templates with Slate.js content.
 */

/**
 * Generates a UUID v4
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a new Journal Template object
 * @param {Object} data - Template data
 * @returns {Object} Template object
 */
export function createTemplate(data = {}) {
  const now = new Date().toISOString();
  
  return {
    id: data.id || generateUUID(),
    name: data.name || '',
    description: data.description || '',
    content: data.content || [{ type: 'paragraph', children: [{ text: '' }] }], // Slate.js format
    isBuiltIn: data.isBuiltIn !== undefined ? data.isBuiltIn : false,
    category: data.category || 'general', // e.g., 'gratitude', 'goals', 'mood', 'reflection', 'general'
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * Normalizes a Template object
 * @param {Object} template - Template object to normalize
 * @returns {Object} Normalized template object
 */
export function normalizeTemplate(template) {
  if (!template || typeof template !== 'object') {
    throw new Error('Template must be an object');
  }

  const normalized = { ...template };

  // Ensure dates are ISO strings
  const dateFields = ['createdAt', 'updatedAt'];
  dateFields.forEach(field => {
    if (normalized[field]) {
      if (normalized[field] instanceof Date) {
        normalized[field] = normalized[field].toISOString();
      }
    }
  });

  // Ensure content is a valid Slate.js value (array)
  if (!Array.isArray(normalized.content)) {
    normalized.content = [{ type: 'paragraph', children: [{ text: '' }] }];
  }

  // Ensure arrays are arrays
  if (!Array.isArray(normalized.tags)) {
    normalized.tags = [];
  }

  // Ensure name is a string
  if (typeof normalized.name !== 'string') {
    normalized.name = '';
  }

  // Ensure description is a string
  if (typeof normalized.description !== 'string') {
    normalized.description = '';
  }

  // Ensure category is a string
  if (typeof normalized.category !== 'string') {
    normalized.category = 'general';
  }

  // Ensure isBuiltIn is boolean
  if (typeof normalized.isBuiltIn !== 'boolean') {
    normalized.isBuiltIn = false;
  }

  return normalized;
}

/**
 * Template type definition (for documentation)
 * @typedef {Object} JournalTemplate
 * @property {string} id - UUID
 * @property {string} name - Template name
 * @property {string} description - Template description
 * @property {Array} content - Slate.js editor value (array of nodes)
 * @property {boolean} isBuiltIn - Whether template is built-in (cannot be deleted)
 * @property {string} category - Template category
 * @property {string[]} tags - Array of tag strings
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 */

export default {
  createTemplate,
  normalizeTemplate
};

