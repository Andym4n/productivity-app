/**
 * Journal Entry Form Component
 * 
 * A form component for creating and editing journal entries
 * with rich text editing support.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import RichTextEditor from '../RichTextEditor/RichTextEditor.jsx';
import { MediaAttachmentInput, MediaAttachmentList } from '../MediaAttachment/index.js';
import { TemplateSelector } from '../TemplateSelector/index.js';
import { createEmptySlateValue } from '../../journal/models/Journal.js';
import { createJournalEntry, updateJournalEntry, getJournalEntry } from '../../journal/index.js';
import { getTemplate } from '../../journal/templates/templateService.js';
import { performAutoLinking } from '../../journal/services/autoLinkingService.js';

/**
 * JournalEntryForm component
 * @param {Object} props
 * @param {string|null} props.entryId - Entry ID for editing (null for new entry)
 * @param {Function} props.onSave - Callback when entry is saved
 * @param {Function} props.onCancel - Callback when form is cancelled
 */
export default function JournalEntryForm({ entryId = null, onSave, onCancel }) {
  // CRITICAL: Always initialize with a valid Slate.js value
  const initialContent = createEmptySlateValue();
  const [content, setContent] = useState(initialContent);
  
  // Debug: Log if content becomes invalid
  useEffect(() => {
    if (!content || !Array.isArray(content) || content.length === 0) {
      console.error('JournalEntryForm: content is invalid!', content);
      setContent(createEmptySlateValue());
    }
  }, [content]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mood, setMood] = useState('');
  const [tags, setTags] = useState('');
  const [media, setMedia] = useState({ images: [], audio: [] });
  const [templateId, setTemplateId] = useState(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(!entryId); // Show selector for new entries
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentEntryId, setCurrentEntryId] = useState(entryId);
  const [linkedTasks, setLinkedTasks] = useState([]);
  const [linkedEvents, setLinkedEvents] = useState([]);
  const [autoLinking, setAutoLinking] = useState(false);
  const autoLinkTimeoutRef = useRef(null);

  // Update currentEntryId when prop changes
  useEffect(() => {
    setCurrentEntryId(entryId);
  }, [entryId]);

  // Load entry if editing
  useEffect(() => {
    if (entryId) {
      loadEntry();
    } else {
      // Show template selector for new entries
      setShowTemplateSelector(true);
    }
  }, [entryId]);

  const loadEntry = async () => {
    try {
      setLoading(true);
      const entry = await getJournalEntry(entryId);
      if (entry) {
        setContent(entry.content || createEmptySlateValue());
        setDate(entry.date ? entry.date.split('T')[0] : new Date().toISOString().split('T')[0]);
        setMood(entry.mood || '');
        setTags(entry.tags ? entry.tags.join(', ') : '');
        setMedia(entry.media || { images: [], audio: [] });
        setTemplateId(entry.template || null);
        setCurrentEntryId(entry.id);
        setLinkedTasks(entry.linkedTasks || []);
        setLinkedEvents(entry.linkedEvents || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-linking function (debounced)
  const performAutoLink = useCallback(async (entryContent, entryDate) => {
    if (!entryContent || !currentEntryId) {
      return;
    }

    try {
      setAutoLinking(true);
      const entry = {
        id: currentEntryId,
        content: entryContent,
        date: entryDate,
        linkedTasks,
        linkedEvents
      };

      const result = await performAutoLinking(entry, {
        referenceDate: new Date(entryDate),
        updateEntry: false, // We'll update on save
        cleanupUnreferenced: false // Don't cleanup while editing
      });

      setLinkedTasks(result.linkedTasks);
      setLinkedEvents(result.linkedEvents);
    } catch (err) {
      console.warn('Auto-linking failed:', err);
      // Don't show error to user - auto-linking is non-critical
    } finally {
      setAutoLinking(false);
    }
  }, [currentEntryId, linkedTasks, linkedEvents]);

  // Debounced content change handler for auto-linking
  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);

    // Clear existing timeout
    if (autoLinkTimeoutRef.current) {
      clearTimeout(autoLinkTimeoutRef.current);
    }

    // Only auto-link if entry is saved (has an ID)
    if (currentEntryId) {
      // Debounce auto-linking by 1 second
      autoLinkTimeoutRef.current = setTimeout(() => {
        performAutoLink(newContent, date);
      }, 1000);
    }
  }, [currentEntryId, date, performAutoLink]);

  const handleMediaAdded = (blobId, type) => {
    setMedia(prev => ({
      ...prev,
      [type === 'image' ? 'images' : 'audio']: [...prev[type === 'image' ? 'images' : 'audio'], blobId]
    }));
  };

  const handleMediaChange = ({ images, audio }) => {
    setMedia({ images: images || [], audio: audio || [] });
  };

  const handleTemplateSelect = async (template) => {
    try {
      console.log('handleTemplateSelect called with:', template ? template.name : 'null (blank)');
      
      // Ensure we always have valid content before hiding template selector
      let newContent;
      if (template) {
        // Apply template content - ensure it's a valid array
        newContent = Array.isArray(template.content) && template.content.length > 0
          ? template.content
          : createEmptySlateValue();
        setTemplateId(template.id);
        console.log('Template selected:', template.name, 'Content nodes:', newContent.length);
      } else {
        // Blank entry
        newContent = createEmptySlateValue();
        setTemplateId(null);
        console.log('Blank entry selected, content:', newContent);
      }
      
      // Validate content before proceeding
      if (!newContent || !Array.isArray(newContent) || newContent.length === 0) {
        console.error('Invalid content generated, using default');
        newContent = createEmptySlateValue();
      }
      
      // Set content and hide template selector synchronously
      // React will batch these updates, so they'll happen together
      setContent(newContent);
      setShowTemplateSelector(false);
      
      console.log('Template selector hidden, form should now be visible');
    } catch (err) {
      console.error('Error selecting template:', err);
      setError(`Failed to load template: ${err.message}`);
    }
  };

  const handleChangeTemplate = () => {
    setShowTemplateSelector(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Clear auto-link timeout
    if (autoLinkTimeoutRef.current) {
      clearTimeout(autoLinkTimeoutRef.current);
    }

    try {
      // Perform final auto-linking before save
      const entryForLinking = {
        id: currentEntryId,
        content,
        date: new Date(date).toISOString(),
        linkedTasks,
        linkedEvents
      };

      let finalLinkedTasks = linkedTasks;
      let finalLinkedEvents = linkedEvents;

      // Only perform auto-linking if entry exists or after creation
      if (currentEntryId || content) {
        try {
          const linkingResult = await performAutoLinking(entryForLinking, {
            referenceDate: new Date(date),
            updateEntry: false,
            cleanupUnreferenced: true
          });
          finalLinkedTasks = linkingResult.linkedTasks;
          finalLinkedEvents = linkingResult.linkedEvents;
        } catch (linkingErr) {
          console.warn('Auto-linking during save failed:', linkingErr);
          // Continue with save even if auto-linking fails
        }
      }

      const entryData = {
        content,
        date: new Date(date).toISOString(),
        template: templateId,
        mood: mood.trim() || null,
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        media,
        linkedTasks: finalLinkedTasks,
        linkedEvents: finalLinkedEvents
      };

      let savedEntry;
      if (currentEntryId) {
        savedEntry = await updateJournalEntry(currentEntryId, entryData);
      } else {
        savedEntry = await createJournalEntry(entryData);
        // Update currentEntryId after creation so media can be linked
        setCurrentEntryId(savedEntry.id);
        // Update linked arrays from saved entry
        setLinkedTasks(savedEntry.linkedTasks || []);
        setLinkedEvents(savedEntry.linkedEvents || []);
      }

      if (onSave) {
        onSave(savedEntry);
      }
    } catch (err) {
      setError(err.message || 'Failed to save journal entry');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoLinkTimeoutRef.current) {
        clearTimeout(autoLinkTimeoutRef.current);
      }
    };
  }, []);

  // Ensure content is valid before rendering the form
  // This prevents RichTextEditor from receiving invalid values
  // IMPORTANT: This hook must be called before any conditional returns to follow Rules of Hooks
  const validContent = useMemo(() => {
    if (!content || !Array.isArray(content) || content.length === 0) {
      console.warn('JournalEntryForm: content is invalid, using default', content);
      return createEmptySlateValue();
    }
    return content;
  }, [content]);

  if (loading && entryId) {
    return <div className="p-4 text-dark-text-primary">Loading...</div>;
  }

  // Show template selector for new entries
  if (showTemplateSelector && !entryId) {
    return (
      <div className="p-6 bg-dark-bg-secondary rounded-lg min-h-[400px]">
        <div className="mb-4 text-dark-text-primary">
          <h2 className="text-xl font-semibold">Choose a Template</h2>
          <p className="text-sm text-dark-text-tertiary mt-1">Select a template to start your journal entry, or choose blank to start from scratch.</p>
        </div>
        <TemplateSelector
          onSelect={handleTemplateSelect}
          selectedTemplateId={templateId}
          onCancel={onCancel}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/50 text-red-400 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label htmlFor="date" className="block text-sm font-medium text-dark-text-primary mb-1">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        {!entryId && (
          <div className="ml-4">
            <button
              type="button"
              onClick={handleChangeTemplate}
              className="px-4 py-2 text-sm border border-dark-border rounded-md hover:bg-dark-bg-hover text-dark-text-primary bg-dark-bg-secondary"
            >
              Change Template
            </button>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-dark-text-primary mb-1">
          Content
          {autoLinking && (
            <span className="ml-2 text-xs text-dark-text-tertiary italic">(Auto-linking...)</span>
          )}
        </label>
        {/* Always pass a valid value - RichTextEditor will handle validation internally */}
        {/* Use a key based on entryId and a content hash to force remount when content changes significantly */}
        {(() => {
          try {
            // Create a stable key that changes when content changes significantly
            const contentKey = currentEntryId || `new-${JSON.stringify(validContent).slice(0, 50)}`;
            
            return (
              <RichTextEditor
                key={contentKey}
                value={validContent}
                onChange={handleContentChange}
                placeholder="Write your journal entry here..."
                linkedTaskIds={linkedTasks}
                linkedEventIds={linkedEvents}
              />
            );
          } catch (err) {
            console.error('Error rendering RichTextEditor:', err);
            return (
              <div className="border border-red-500 rounded-lg p-4 bg-red-900/20">
                <div className="text-red-400">Error loading editor: {err.message}</div>
                <button
                  type="button"
                  onClick={() => {
                    setContent(createEmptySlateValue());
                    setShowTemplateSelector(true);
                  }}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Try Again
                </button>
              </div>
            );
          }
        })()}
        {(linkedTasks.length > 0 || linkedEvents.length > 0) && (
          <div className="mt-2 text-xs text-dark-text-tertiary">
            Linked: {linkedTasks.length} task{linkedTasks.length !== 1 ? 's' : ''}, {linkedEvents.length} event{linkedEvents.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="mood" className="block text-sm font-medium text-dark-text-primary mb-1">
          Mood (optional)
        </label>
        <input
          type="text"
          id="mood"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="e.g., happy, sad, anxious"
          className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-dark-text-primary mb-1">
          Tags (comma-separated, optional)
        </label>
        <input
          type="text"
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., work, personal, reflection"
          className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-text-primary mb-2">
          Media Attachments
        </label>
        {currentEntryId && (
          <>
            <MediaAttachmentInput
              entryId={currentEntryId}
              onMediaAdded={handleMediaAdded}
            />
            <div className="mt-4">
              <MediaAttachmentList
                entryId={currentEntryId}
                blobIds={[...media.images, ...media.audio]}
                onMediaChange={handleMediaChange}
                readOnly={false}
              />
            </div>
          </>
        )}
        {!currentEntryId && (
          <div className="text-sm text-dark-text-tertiary italic">
            Save the entry first to add media attachments
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-dark-border rounded-md hover:bg-dark-bg-hover text-dark-text-primary bg-dark-bg-secondary disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Saving...' : entryId ? 'Update Entry' : 'Create Entry'}
        </button>
      </div>
    </form>
  );
}

