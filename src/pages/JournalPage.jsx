/**
 * Journal Page Component
 * 
 * Main page for journal functionality, integrating all journal features:
 * - Entry list with search and filtering
 * - Create/edit entries with rich text editor
 * - Template selection
 * - Media attachments
 * - Auto-linking to tasks/events
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../components';
import JournalEntryForm from '../components/JournalEntryForm/JournalEntryForm.jsx';
import JournalSearchFilter from '../components/JournalSearchFilter/JournalSearchFilter.jsx';
import { getJournalEntries, deleteJournalEntry } from '../journal/index.js';
import { format, parseISO } from 'date-fns';

/**
 * JournalPage component
 * Main page for managing journal entries
 */
export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({});
  
  // Check if we should open new entry form (from navigation)
  useEffect(() => {
    if (sessionStorage.getItem('journalNewEntry') === 'true') {
      sessionStorage.removeItem('journalNewEntry');
      setShowCreateForm(true);
    }
  }, []);

  // Load entries on mount and when filters change
  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, filters]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const allEntries = await getJournalEntries();
      // Sort by date descending (newest first)
      const sorted = allEntries.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
      setEntries(sorted);
    } catch (err) {
      setError(err.message || 'Failed to load journal entries');
      console.error('Error loading entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...entries];

    // Apply filters from JournalSearchFilter
    if (filters.searchQuery) {
      // Search is handled by getJournalEntries, but we can also filter client-side
      // The backend search should already be applied, but we'll keep this for safety
    }

    if (filters.mood) {
      filtered = filtered.filter(entry => entry.mood === filters.mood);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(entry => {
        if (!entry.tags || entry.tags.length === 0) return false;
        return filters.tags.some(tag => 
          entry.tags.some(entryTag => 
            entryTag.toLowerCase() === tag.toLowerCase()
          )
        );
      });
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= start;
      });
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate <= end;
      });
    }

    setFilteredEntries(filtered);
  };

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    
    // If search query is provided, reload entries with search
    if (newFilters.searchQuery) {
      loadEntriesWithFilters(newFilters);
    } else {
      // Otherwise, just apply client-side filters
      loadEntries();
    }
  }, []);

  const loadEntriesWithFilters = async (filterParams) => {
    try {
      setLoading(true);
      setError(null);
      const filtered = await getJournalEntries(filterParams);
      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
      setEntries(sorted);
    } catch (err) {
      setError(err.message || 'Failed to load filtered entries');
      console.error('Error loading filtered entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEntrySave = async (savedEntry) => {
    // Reload entries to get updated list
    await loadEntries();
    setSelectedEntryId(null);
    setShowCreateForm(false);
  };

  const handleEntryCancel = () => {
    setSelectedEntryId(null);
    setShowCreateForm(false);
  };

  const handleEditEntry = (entryId) => {
    setSelectedEntryId(entryId);
    setShowCreateForm(false);
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this journal entry?')) {
      return;
    }

    try {
      await deleteJournalEntry(entryId);
      await loadEntries();
      if (selectedEntryId === entryId) {
        setSelectedEntryId(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete entry');
      console.error('Error deleting entry:', err);
    }
  };

  const handleCreateNew = () => {
    setSelectedEntryId(null);
    setShowCreateForm(true);
  };

  // Extract text preview from Slate.js content with proper line breaks
  const getContentPreview = (content) => {
    if (!content || !Array.isArray(content)) return '';
    
    const extractText = (nodes, depth = 0) => {
      const lines = [];
      
      for (const node of nodes) {
        // Handle text nodes
        if (node.text !== undefined) {
          return node.text;
        }
        
        // Handle block nodes (paragraphs, headings, list items, etc.)
        if (node.children && Array.isArray(node.children)) {
          const childText = node.children.map(child => extractText([child], depth + 1)).join('');
          
          // Add the text from this block
          if (childText.trim()) {
            lines.push(childText);
          }
        }
      }
      
      // Join blocks with line breaks
      return depth === 0 ? lines.join('\n') : lines.join('');
    };

    const preview = extractText(content);
    return preview.length > 200 ? preview.substring(0, 200) + '...' : preview;
  };

  if (showCreateForm || selectedEntryId) {
    return (
      <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={handleEntryCancel}
            >
              ← Back to Journal
            </Button>
          </div>
          
          <div className="bg-dark-bg-secondary rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">
              {selectedEntryId ? 'Edit Journal Entry' : 'New Journal Entry'}
            </h1>
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 text-red-400 rounded">
                {error}
              </div>
            )}
            <JournalEntryForm
              entryId={selectedEntryId}
              onSave={handleEntrySave}
              onCancel={handleEntryCancel}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Journal</h1>
            <p className="text-dark-text-tertiary">
              Record your thoughts, experiences, and reflections
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleCreateNew}
          >
            + New Entry
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-6">
          <JournalSearchFilter
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Entries List */}
        {loading ? (
          <div className="text-center py-12 text-dark-text-tertiary">
            Loading entries...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-dark-text-tertiary mb-4">
              {entries.length === 0 
                ? "No journal entries yet. Create your first entry to get started!"
                : "No entries match your filters. Try adjusting your search criteria."}
            </p>
            {entries.length === 0 && (
              <Button
                variant="primary"
                onClick={handleCreateNew}
              >
                Create First Entry
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-dark-bg-secondary rounded-lg p-6 hover:bg-dark-bg-hover transition-colors border border-dark-border"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h2 className="text-xl font-semibold">
                        {format(parseISO(entry.date), 'EEEE, MMMM d, yyyy')}
                      </h2>
                      {entry.mood && (
                        <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm">
                          {entry.mood}
                        </span>
                      )}
                    </div>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {entry.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {entry.template && (
                      <span className="text-sm text-dark-text-tertiary italic">
                        Template: {entry.template}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditEntry(entry.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="prose prose-invert max-w-none mb-4">
                  <p className="text-dark-text-secondary whitespace-pre-wrap">
                    {getContentPreview(entry.content)}
                  </p>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-dark-text-tertiary pt-4 border-t border-dark-border">
                  {entry.media && (
                    <span>
                      📎 {((entry.media.images || []).length + (entry.media.audio || []).length)} attachment(s)
                    </span>
                  )}
                  {entry.linkedTasks && entry.linkedTasks.length > 0 && (
                    <span>
                      🔗 {entry.linkedTasks.length} linked task(s)
                    </span>
                  )}
                  {entry.linkedEvents && entry.linkedEvents.length > 0 && (
                    <span>
                      📅 {entry.linkedEvents.length} linked event(s)
                    </span>
                  )}
                  {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
                    <span>
                      Updated {format(parseISO(entry.updatedAt), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Entry Count */}
        {!loading && filteredEntries.length > 0 && (
          <div className="mt-8 text-center text-sm text-dark-text-tertiary">
            Showing {filteredEntries.length} of {entries.length} entries
          </div>
        )}
      </div>
    </div>
  );
}

