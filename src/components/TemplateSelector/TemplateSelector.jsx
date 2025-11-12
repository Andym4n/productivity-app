/**
 * Template Selector Component
 * 
 * Allows users to select a template when creating a new journal entry
 */

import { useState, useEffect } from 'react';
import { 
  getAllTemplates, 
  getBuiltInTemplates, 
  getUserTemplates
} from '../../journal/templates/templateService.js';

/**
 * TemplateSelector component
 * @param {Object} props
 * @param {Function} props.onSelect - Callback when template is selected (receives template)
 * @param {string|null} props.selectedTemplateId - Currently selected template ID
 * @param {Function} props.onCancel - Callback when selection is cancelled
 */
export default function TemplateSelector({ onSelect, selectedTemplateId = null, onCancel }) {
  const [templates, setTemplates] = useState([]);
  const [builtInTemplates, setBuiltInTemplates] = useState([]);
  const [userTemplates, setUserTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredTemplates, setFilteredTemplates] = useState([]);

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'gratitude', label: 'Gratitude' },
    { value: 'goals', label: 'Goals' },
    { value: 'mood', label: 'Mood' },
    { value: 'reflection', label: 'Reflection' },
    { value: 'general', label: 'General' }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, selectedCategory]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading templates...');
      const all = await getAllTemplates();
      const builtIn = await getBuiltInTemplates();
      const user = await getUserTemplates();
      
      console.log('Templates loaded:', { all: all.length, builtIn: builtIn.length, user: user.length });
      
      setTemplates(all);
      setBuiltInTemplates(builtIn);
      setUserTemplates(user);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search term (client-side)
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(lowerSearch) ||
        (t.description && t.description.toLowerCase().includes(lowerSearch))
      );
    }

    console.log('Filtered templates:', filtered.length, 'from', templates.length);
    setFilteredTemplates(filtered);
  };

  const handleSelect = (template) => {
    console.log('Template selected:', template?.name || 'unknown');
    if (onSelect) {
      console.log('Calling onSelect with template');
      onSelect(template);
    } else {
      console.warn('onSelect callback is not provided!');
    }
  };

  const handleUseBlank = () => {
    console.log('Blank entry button clicked');
    if (onSelect) {
      console.log('Calling onSelect with null');
      onSelect(null); // null means no template
    } else {
      console.warn('onSelect callback is not provided!');
    }
  };

  if (loading) {
    return (
      <div className="p-4 min-h-[200px] flex items-center justify-center">
        <div className="text-sm text-dark-text-tertiary">Loading templates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 min-h-[200px]">
        <div className="text-sm text-red-400 mb-4">Error: {error}</div>
        <button
          type="button"
          onClick={loadTemplates}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark-text-primary">Select a Template</h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-dark-text-tertiary hover:text-dark-text-primary"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Category Filter */}
      <div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Blank Option */}
      <button
        type="button"
        onClick={handleUseBlank}
        className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
          selectedTemplateId === null
            ? 'border-blue-500 bg-blue-500/20 text-dark-text-primary'
            : 'border-dark-border hover:border-dark-border-hover bg-dark-bg-secondary text-dark-text-primary'
        }`}
      >
        <div className="font-medium">Blank Entry</div>
        <div className="text-sm text-dark-text-tertiary mt-1">Start with an empty entry</div>
      </button>

      {/* Templates List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <div className="text-sm text-dark-text-tertiary text-center py-4">
            No templates found
          </div>
        ) : (
          filteredTemplates.map(template => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template)}
              className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                selectedTemplateId === template.id
                  ? 'border-blue-500 bg-blue-500/20 text-dark-text-primary'
                  : 'border-dark-border hover:border-dark-border-hover bg-dark-bg-secondary text-dark-text-primary'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{template.name}</div>
                  {template.description && (
                    <div className="text-sm text-dark-text-tertiary mt-1">{template.description}</div>
                  )}
                  {template.isBuiltIn && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-500/30 text-blue-400 rounded">
                      Built-in
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

