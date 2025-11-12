/**
 * Template Service
 * 
 * Provides high-level API for managing journal templates, including
 * initialization of built-in templates and CRUD operations.
 */

import { createTemplate as createTemplateModel, normalizeTemplate } from '../models/Template.js';
import templateStore from '../../storage/indexeddb/stores/templateStore.js';
import { builtInTemplates } from './builtInTemplates.js';

/**
 * Custom error class for template operations
 */
export class TemplateServiceError extends Error {
  constructor(message, code = 'TEMPLATE_SERVICE_ERROR') {
    super(message);
    this.name = 'TemplateServiceError';
    this.code = code;
  }
}

/**
 * Initializes built-in templates in the database
 * Should be called once during app initialization
 * @returns {Promise<void>}
 */
export async function initializeBuiltInTemplates() {
  try {
    // Check if built-in templates already exist
    const existingBuiltIns = await templateStore.getBuiltInTemplates();
    
    if (existingBuiltIns.length > 0) {
      // Built-in templates already initialized
      return;
    }

    // Create built-in templates
    for (const templateData of builtInTemplates) {
      const template = createTemplateModel({
        ...templateData,
        id: `builtin_${templateData.name.toLowerCase().replace(/\s+/g, '_')}`
      });
      const normalized = normalizeTemplate(template);
      await templateStore.create(normalized);
    }
  } catch (error) {
    console.error('Failed to initialize built-in templates:', error);
    throw new TemplateServiceError(
      `Failed to initialize built-in templates: ${error.message}`,
      'INIT_ERROR'
    );
  }
}

/**
 * Gets all templates (built-in and user-defined)
 * @returns {Promise<Array>} Promise resolving to all templates
 */
export async function getAllTemplates() {
  try {
    return await templateStore.getAll();
  } catch (error) {
    throw new TemplateServiceError(
      `Failed to get templates: ${error.message}`,
      'GET_ERROR'
    );
  }
}

/**
 * Gets all built-in templates
 * @returns {Promise<Array>} Promise resolving to built-in templates
 */
export async function getBuiltInTemplates() {
  try {
    return await templateStore.getBuiltInTemplates();
  } catch (error) {
    throw new TemplateServiceError(
      `Failed to get built-in templates: ${error.message}`,
      'GET_BUILTIN_ERROR'
    );
  }
}

/**
 * Gets all user-defined templates
 * @returns {Promise<Array>} Promise resolving to user-defined templates
 */
export async function getUserTemplates() {
  try {
    return await templateStore.getUserTemplates();
  } catch (error) {
    throw new TemplateServiceError(
      `Failed to get user templates: ${error.message}`,
      'GET_USER_ERROR'
    );
  }
}

/**
 * Gets a template by ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object|null>} Promise resolving to template or null
 */
export async function getTemplate(templateId) {
  try {
    if (!templateId || typeof templateId !== 'string') {
      throw new TemplateServiceError('Template ID is required', 'INVALID_ID');
    }
    
    const template = await templateStore.get(templateId);
    return template ? normalizeTemplate(template) : null;
  } catch (error) {
    if (error instanceof TemplateServiceError) {
      throw error;
    }
    throw new TemplateServiceError(
      `Failed to get template: ${error.message}`,
      'GET_ERROR'
    );
  }
}

/**
 * Gets templates by category
 * @param {string} category - Category to filter by
 * @returns {Promise<Array>} Promise resolving to filtered templates
 */
export async function getTemplatesByCategory(category) {
  try {
    return await templateStore.getByCategory(category);
  } catch (error) {
    throw new TemplateServiceError(
      `Failed to get templates by category: ${error.message}`,
      'GET_CATEGORY_ERROR'
    );
  }
}

/**
 * Searches templates by name or description
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Promise resolving to matching templates
 */
export async function searchTemplates(searchTerm) {
  try {
    if (!searchTerm || typeof searchTerm !== 'string') {
      return [];
    }
    return await templateStore.searchByName(searchTerm);
  } catch (error) {
    throw new TemplateServiceError(
      `Failed to search templates: ${error.message}`,
      'SEARCH_ERROR'
    );
  }
}

/**
 * Creates a new user-defined template
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Promise resolving to created template
 */
export async function createTemplate(templateData) {
  console.log('[Adder] Creating template:', { name: templateData.name, category: templateData.category });
  try {
    const template = createTemplateModel({
      ...templateData,
      isBuiltIn: false // User templates are never built-in
    });
    console.log('[Adder] Template model created:', { id: template.id, name: template.name });
    const normalized = normalizeTemplate(template);
    await templateStore.create(normalized);
    console.log('[Adder] Template created successfully:', { id: normalized.id, name: normalized.name });
    return normalized;
  } catch (error) {
    console.error('[Adder] Error creating template:', { error: error.message, code: error.code, templateData });
    throw new TemplateServiceError(
      `Failed to create template: ${error.message}`,
      'CREATE_ERROR'
    );
  }
}

/**
 * Updates an existing template
 * @param {string} templateId - Template ID
 * @param {Object} updates - Partial template data
 * @returns {Promise<Object>} Promise resolving to updated template
 */
export async function updateTemplate(templateId, updates) {
  try {
    if (!templateId || typeof templateId !== 'string') {
      throw new TemplateServiceError('Template ID is required', 'INVALID_ID');
    }

    const existing = await getTemplate(templateId);
    if (!existing) {
      throw new TemplateServiceError(`Template with ID ${templateId} not found`, 'NOT_FOUND');
    }

    // Prevent modifying built-in templates
    if (existing.isBuiltIn) {
      throw new TemplateServiceError('Cannot modify built-in templates', 'BUILTIN_MODIFY');
    }

    // Prevent changing isBuiltIn flag
    const safeUpdates = { ...updates };
    delete safeUpdates.isBuiltIn;
    delete safeUpdates.id; // ID cannot be changed

    const merged = {
      ...existing,
      ...safeUpdates,
      updatedAt: new Date().toISOString()
    };

    const normalized = normalizeTemplate(merged);
    await templateStore.update(templateId, normalized);
    return normalized;
  } catch (error) {
    if (error instanceof TemplateServiceError) {
      throw error;
    }
    throw new TemplateServiceError(
      `Failed to update template: ${error.message}`,
      'UPDATE_ERROR'
    );
  }
}

/**
 * Deletes a template
 * @param {string} templateId - Template ID to delete
 * @returns {Promise<void>}
 */
export async function deleteTemplate(templateId) {
  try {
    if (!templateId || typeof templateId !== 'string') {
      throw new TemplateServiceError('Template ID is required', 'INVALID_ID');
    }

    const existing = await getTemplate(templateId);
    if (!existing) {
      throw new TemplateServiceError(`Template with ID ${templateId} not found`, 'NOT_FOUND');
    }

    // Prevent deleting built-in templates
    if (existing.isBuiltIn) {
      throw new TemplateServiceError('Cannot delete built-in templates', 'BUILTIN_DELETE');
    }

    await templateStore.delete(templateId);
  } catch (error) {
    if (error instanceof TemplateServiceError) {
      throw error;
    }
    throw new TemplateServiceError(
      `Failed to delete template: ${error.message}`,
      'DELETE_ERROR'
    );
  }
}

export default {
  initializeBuiltInTemplates,
  getAllTemplates,
  getBuiltInTemplates,
  getUserTemplates,
  getTemplate,
  getTemplatesByCategory,
  searchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  TemplateServiceError
};

