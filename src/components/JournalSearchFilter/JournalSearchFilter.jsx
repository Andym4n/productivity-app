import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../Input/Input.jsx';
import { Button } from '../Button/Button.jsx';
import { getJournalEntries } from '../../journal/crud/index.js';

/**
 * JournalSearchFilter Component
 * 
 * Provides search and filtering capabilities for journal entries:
 * - Full-text search in content, tags, and mood
 * - Filter by mood
 * - Filter by tags (multi-select)
 * - Filter by date range
 * - Clear all filters
 */
export const JournalSearchFilter = ({
  onFilterChange,
  availableMoods = [],
  availableTags = [],
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadedMoods, setLoadedMoods] = useState([]);
  const [loadedTags, setLoadedTags] = useState([]);

  // Use provided options or load from entries
  const displayMoods = availableMoods.length > 0 ? availableMoods : loadedMoods;
  const displayTags = availableTags.length > 0 ? availableTags : loadedTags;

  // Load available moods and tags from existing entries if not provided
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const entries = await getJournalEntries();
        
        // Extract unique moods
        const moods = [...new Set(entries
          .map(entry => entry.mood)
          .filter(Boolean)
          .sort()
        )];
        
        // Extract unique tags
        const tags = [...new Set(entries
          .flatMap(entry => entry.tags || [])
          .filter(Boolean)
          .sort()
        )];
        
        setLoadedMoods(moods);
        setLoadedTags(tags);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };
    
    // Only load if options not provided
    if (availableMoods.length === 0 || availableTags.length === 0) {
      loadFilterOptions();
    }
  }, [availableMoods.length, availableTags.length]);

  // Debounced filter application
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyFilters();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedMood, selectedTags, startDate, endDate]);

  const applyFilters = useCallback(() => {
    const filters = {};
    
    if (searchQuery.trim()) {
      filters.searchQuery = searchQuery.trim();
    }
    
    if (selectedMood) {
      filters.mood = selectedMood;
    }
    
    if (selectedTags.length > 0) {
      filters.tags = selectedTags;
    }
    
    if (startDate) {
      filters.startDate = startDate;
    }
    
    if (endDate) {
      filters.endDate = endDate;
    }
    
    if (onFilterChange) {
      onFilterChange(filters);
    }
  }, [searchQuery, selectedMood, selectedTags, startDate, endDate, onFilterChange]);

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedMood('');
    setSelectedTags([]);
    setStartDate('');
    setEndDate('');
    
    if (onFilterChange) {
      onFilterChange({});
    }
  };

  const hasActiveFilters = searchQuery || selectedMood || selectedTags.length > 0 || startDate || endDate;

  return (
    <div className={`journal-search-filter ${className}`}>
      {/* Main Search Bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search entries by content, tags, or mood..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
        >
          {isExpanded ? '▼' : '▶'} Filters
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            aria-label="Clear all filters"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-dark-bg-secondary rounded-lg border border-dark-border">
          {/* Mood Filter */}
          <div>
            <label className="block text-sm font-medium text-dark-text-primary mb-2">
              Mood
            </label>
            <select
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              className="input-base w-full"
            >
              <option value="">All moods</option>
              {displayMoods.map(mood => (
                <option key={mood} value={mood}>
                  {mood}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filters */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-dark-text-primary mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text-primary mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
                min={startDate || undefined}
              />
            </div>
          </div>

          {/* Tags Filter */}
          {displayTags.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-text-primary mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {displayTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`
                      px-3 py-1 rounded-full text-sm transition-colors
                      ${selectedTags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-dark-bg-tertiary text-dark-text-primary hover:bg-dark-bg-hover border border-dark-border'
                      }
                    `}
                    aria-pressed={selectedTags.includes(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <p className="mt-2 text-sm text-dark-text-tertiary">
                  Selected: {selectedTags.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && !isExpanded && (
        <div className="flex flex-wrap gap-2 mt-2 text-sm">
          {searchQuery && (
            <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded">
              Search: "{searchQuery}"
            </span>
          )}
          {selectedMood && (
            <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded">
              Mood: {selectedMood}
            </span>
          )}
          {selectedTags.length > 0 && (
            <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded">
              Tags: {selectedTags.length}
            </span>
          )}
          {(startDate || endDate) && (
            <span className="px-2 py-1 bg-orange-600/20 text-orange-400 rounded">
              Date Range
            </span>
          )}
        </div>
      )}
    </div>
  );
};

JournalSearchFilter.propTypes = {
  /**
   * Callback function called when filters change
   * Receives filters object with searchQuery, mood, tags, startDate, endDate
   */
  onFilterChange: PropTypes.func.isRequired,
  /**
   * Available mood options (will be auto-populated if not provided)
   */
  availableMoods: PropTypes.arrayOf(PropTypes.string),
  /**
   * Available tag options (will be auto-populated if not provided)
   */
  availableTags: PropTypes.arrayOf(PropTypes.string),
  /**
   * Additional CSS classes
   */
  className: PropTypes.string
};

export default JournalSearchFilter;

