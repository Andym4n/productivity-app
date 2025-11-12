import { useState, useEffect } from 'react';
import { Modal, Button } from '../index.js';
import { format, parseISO } from 'date-fns';
import eventsStore from '../../storage/indexeddb/stores/eventsStore.js';

/**
 * EventDetailModal Component
 * Displays event details and allows editing/deleting
 */
export default function EventDetailModal({ 
  isOpen, 
  eventId, 
  onClose, 
  onEdit, 
  onDelete 
}) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && eventId) {
      loadEvent();
    } else {
      setEvent(null);
      setError(null);
    }
  }, [isOpen, eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedEvent = await eventsStore.get(eventId);
      if (loadedEvent) {
        setEvent(loadedEvent);
      } else {
        setError('Event not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      setLoading(true);
      await eventsStore.delete(eventId);
      if (onDelete) {
        onDelete(eventId);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (onEdit && event) {
      onEdit(event);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event ? event.title : 'Event Details'}
      size="md"
    >
      {loading && (
        <div className="text-center py-8 text-dark-text-tertiary">
          Loading event...
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {event && !loading && (
        <div className="space-y-4">
          {/* Event Title */}
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">
              Title
            </label>
            <p className="text-dark-text-primary text-lg">{event.title}</p>
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-1">
                Description
              </label>
              <p className="text-dark-text-primary whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-1">
                Start
              </label>
              <p className="text-dark-text-primary">
                {event.allDay
                  ? format(parseISO(event.startTime), 'MMM d, yyyy')
                  : format(parseISO(event.startTime), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-1">
                End
              </label>
              <p className="text-dark-text-primary">
                {event.allDay
                  ? format(parseISO(event.endTime), 'MMM d, yyyy')
                  : format(parseISO(event.endTime), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-1">
                Location
              </label>
              <p className="text-dark-text-primary">{event.location}</p>
            </div>
          )}

          {/* Context */}
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">
              Context
            </label>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                event.context === 'work'
                  ? 'bg-blue-600/20 text-blue-400'
                  : event.context === 'focus'
                  ? 'bg-green-600/20 text-green-400'
                  : 'bg-purple-600/20 text-purple-400'
              }`}
            >
              {event.context || 'personal'}
            </span>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-1">
              Status
            </label>
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-600/20 text-gray-400">
              {event.status || 'confirmed'}
            </span>
          </div>

          {/* Sync Status */}
          {event.googleEventId && (
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-1">
                Sync Status
              </label>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  event.synced
                    ? 'bg-green-600/20 text-green-400'
                    : 'bg-yellow-600/20 text-yellow-400'
                }`}
              >
                {event.synced ? 'Synced' : 'Pending Sync'}
              </span>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-1">
                Attendees
              </label>
              <div className="space-y-1">
                {event.attendees.map((attendee, idx) => (
                  <p key={idx} className="text-dark-text-primary text-sm">
                    {attendee.email || attendee.displayName || 'Unknown'}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t border-dark-border">
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleEdit}
            >
              Edit
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

