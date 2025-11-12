/**
 * Template Manager Component
 * 
 * Allows users to create, edit, and delete their custom templates
 */

import { useState, useEffect } from 'react';
import RichTextEditor from '../RichTextEditor/RichTextEditor.jsx';
import { createEmptySlateValue } from '../../journal/models/Journal.js';
import {
  getUserTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  TemplateServiceError
} from '../../journal/templates/templateService.js';

/**
 * TemplateManager component
 */
export default function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState(createEmptySlateValue());
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'gratitude', label: 'Gratitude' },
    { value: 'goals', label: 'Goals' },
    { value: 'mood', label: 'Mood' },
    { value: 'reflection', label: 'Reflection' }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const userTemplates = await getUserTemplates();
      setTemplates(userTemplates);
    } catch (err) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setName('');
    setDescription('');
    setContent(createEmptySlateValue());
    setCategory('general');
    setTags('');
    setShowForm(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description || '');
    setContent(template.content || createEmptySlateValue());
    setCategory(template.category || 'general');
    setTags(template.tags ? template.tags.join(', ') : '');
    setShowForm(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await deleteTemplate(templateId);
      await loadTemplates();
    } catch (err) {
      setError(err.message || 'Failed to delete template');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const templateData = {
        name: name.trim(),
        description: description.trim(),
        content,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      };

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData);
      } else {
        await createTemplate(templateData);
      }

      setShowForm(false);
      await loadTemplates();
    } catch (err) {
      if (err instanceof TemplateServiceError) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to save template');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setName('');
    setDescription('');
    setContent(createEmptySlateValue());
    setCategory('general');
    setTags('');
    setError(null);
  };

  if (loading) {
    return <div className="p-4">Loading templates...</div>;
  }

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {editingTemplate ? 'Edit Template' : 'Create Template'}
          </h3>
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="template-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="template-category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="template-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="template-content" className="block text-sm font-medium text-gray-700 mb-1">
              Template Content *
            </label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Enter template content..."
            />
          </div>

          <div>
            <label htmlFor="template-tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="template-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., daily, reflection, goals"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">My Templates</h3>
        <button
          type="button"
          onClick={handleNewTemplate}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
        >
          Create Template
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No custom templates yet.</p>
          <p className="text-sm mt-2">Create your first template to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
            <div
              key={template.id}
              className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{template.name}</div>
                  {template.description && (
                    <div className="text-sm text-gray-500 mt-1">{template.description}</div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {categories.find(c => c.value === template.category)?.label || template.category}
                    </span>
                    {template.tags && template.tags.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {template.tags.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    type="button"
                    onClick={() => handleEditTemplate(template)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

