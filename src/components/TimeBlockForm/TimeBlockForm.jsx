/**
 * Time Block Form Component
 * 
 * Form for creating and editing time blocks
 */

import { useState, useEffect } from 'react';
import { Button, Input } from '../index.js';
import { 
  createTimeBlock, 
  updateTimeBlock, 
  getTimeBlock,
  TIMEBLOCK_TYPES,
  TIMEBLOCK_STATUSES 
} from '../../schedule/index.js';
import { format, parseISO, addHours } from 'date-fns';

/**
 * TimeBlockForm component
 * @param {Object} props
 * @param {string|null} props.blockId - Time block ID for editing (null for new block)
 * @param {Date|string|null} props.defaultDate - Default date for new blocks
 * @param {Function} props.onSave - Callback when block is saved
 * @param {Function} props.onCancel - Callback when form is cancelled
 */
export default function TimeBlockForm({ blockId = null, defaultDate = null, onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(TIMEBLOCK_TYPES.WORK);
  const [status, setStatus] = useState(TIMEBLOCK_STATUSES.SCHEDULED);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('#3b82f6'); // Blue default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  // Load time block if editing
  useEffect(() => {
    if (blockId) {
      loadTimeBlock();
    } else {
      // Initialize with default date if provided
      initializeNewBlock();
    }
  }, [blockId, defaultDate]);

  const loadTimeBlock = async () => {
    try {
      setLoading(true);
      const block = await getTimeBlock(blockId);
      if (block) {
        setTitle(block.title || '');
        setDescription(block.description || '');
        setType(block.type || TIMEBLOCK_TYPES.WORK);
        setStatus(block.status || TIMEBLOCK_STATUSES.SCHEDULED);
        
        // Format times for datetime-local input
        const start = parseISO(block.startTime);
        const end = parseISO(block.endTime);
        setStartTime(format(start, "yyyy-MM-dd'T'HH:mm"));
        setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
        
        setProjectId(block.projectId || '');
        setProjectName(block.projectName || '');
        setNotes(block.notes || '');
        setTags(block.tags ? block.tags.join(', ') : '');
        setColor(block.color || '#3b82f6');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeNewBlock = () => {
    const now = defaultDate ? (typeof defaultDate === 'string' ? parseISO(defaultDate) : defaultDate) : new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0); // Round to nearest hour
    const end = addHours(start, 1);
    
    setStartTime(format(start, "yyyy-MM-dd'T'HH:mm"));
    setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setConflicts([]);
    setLoading(true);

    try {
      const blockData = {
        title,
        description,
        type,
        status,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        projectId: projectId.trim() || null,
        projectName: projectName.trim() || null,
        notes,
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        color: color || null
      };

      let savedBlock;
      if (blockId) {
        savedBlock = await updateTimeBlock(blockId, blockData, true); // Check conflicts
      } else {
        savedBlock = await createTimeBlock(blockData, true); // Check conflicts
      }

      if (onSave) {
        onSave(savedBlock);
      }
    } catch (err) {
      // Check if it's a conflict error
      if (err.code === 'CONFLICT_ERROR' && err.conflicts) {
        setConflicts(err.conflicts);
        setError(`This time block conflicts with ${err.conflicts.length} existing block(s). Please adjust the time or cancel the conflicting blocks.`);
      } else {
        setError(err.message || 'Failed to save time block');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && blockId) {
    return <div className="p-4 text-dark-text-primary">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/50 text-red-400 rounded">
          {error}
          {conflicts.length > 0 && (
            <div className="mt-2 text-sm">
              <div className="font-semibold mb-1">Conflicting blocks:</div>
              <ul className="list-disc list-inside space-y-1">
                {conflicts.map((conflict, idx) => (
                  <li key={idx}>
                    {conflict.blockTitle || 'Untitled'} ({format(parseISO(conflict.startTime), 'HH:mm')} - {format(parseISO(conflict.endTime), 'HH:mm')})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-dark-text-primary mb-1">
          Title *
        </label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Project work, Meeting, Focus time"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-dark-text-primary mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={3}
          className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-dark-text-primary mb-1">
            Type *
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {Object.values(TIMEBLOCK_TYPES).map(t => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-dark-text-primary mb-1">
            Status *
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {Object.values(TIMEBLOCK_STATUSES).map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-dark-text-primary mb-1">
            Start Time *
          </label>
          <Input
            id="startTime"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-dark-text-primary mb-1">
            End Time *
          </label>
          <Input
            id="endTime"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="projectId" className="block text-sm font-medium text-dark-text-primary mb-1">
            Project ID
          </label>
          <Input
            id="projectId"
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Optional project ID"
          />
        </div>

        <div>
          <label htmlFor="projectName" className="block text-sm font-medium text-dark-text-primary mb-1">
            Project Name
          </label>
          <Input
            id="projectName"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g., Client Project A"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-dark-text-primary mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          rows={2}
          className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-dark-text-primary mb-1">
            Tags (comma-separated)
          </label>
          <Input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., development, meeting, review"
          />
        </div>

        <div>
          <label htmlFor="color" className="block text-sm font-medium text-dark-text-primary mb-1">
            Color
          </label>
          <input
            id="color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-10 px-1 py-1 bg-dark-bg-tertiary border border-dark-border rounded-md cursor-pointer"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-dark-border">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : blockId ? 'Update Time Block' : 'Create Time Block'}
        </Button>
      </div>
    </form>
  );
}

