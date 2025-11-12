import { BaseStore } from './baseStore.js';

/**
 * Journal templates store - handles CRUD operations for journal templates
 */
export class TemplatesStore extends BaseStore {
  constructor() {
    super('journalTemplates');
  }

  /**
   * Gets all built-in templates
   * @returns {Promise<Array>} Promise resolving to built-in templates
   */
  async getBuiltInTemplates() {
    const allTemplates = await this.getAll();
    return allTemplates.filter(t => t.isBuiltIn === true);
  }

  /**
   * Gets all user-defined templates
   * @returns {Promise<Array>} Promise resolving to user-defined templates
   */
  async getUserTemplates() {
    const allTemplates = await this.getAll();
    return allTemplates.filter(t => t.isBuiltIn !== true);
  }

  /**
   * Gets templates by category
   * @param {string} category - Category to filter by
   * @returns {Promise<Array>} Promise resolving to filtered templates
   */
  async getByCategory(category) {
    return await this.query('byCategory', category);
  }

  /**
   * Gets templates by name (case-insensitive search)
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Promise resolving to matching templates
   */
  async searchByName(searchTerm) {
    const allTemplates = await this.getAll();
    const lowerSearch = searchTerm.toLowerCase();
    return allTemplates.filter(t => 
      t.name.toLowerCase().includes(lowerSearch) ||
      t.description.toLowerCase().includes(lowerSearch)
    );
  }
}

export default new TemplatesStore();

