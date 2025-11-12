import { useState } from 'react';
import { CalendarView, EventDetailModal } from '../components';
import eventsStore from '../storage/indexeddb/stores/eventsStore.js';

/**
 * Calendar Page Component
 * Main page for calendar view with event management
 */
export default function CalendarPage() {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  /**
   * Handle event click from calendar
   */
  const handleEventClick = (event, clickInfo) => {
    setSelectedEventId(event.id);
    setShowEventModal(true);
  };

  /**
   * Handle date click (for creating new events)
   */
  const handleDateClick = (date) => {
    // TODO: Open event creation form
    console.log('Date clicked:', date);
    // For now, just log - can be extended to create new events
  };

  /**
   * Handle event drop (drag and drop)
   */
  const handleEventDrop = (event, dropInfo) => {
    console.log('Event dropped:', event, dropInfo);
    // Event is already updated in CalendarView component
  };

  /**
   * Handle event edit
   */
  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowEventModal(false);
    // TODO: Open event edit form
    console.log('Edit event:', event);
  };

  /**
   * Handle event delete
   */
  const handleDelete = async (eventId) => {
    // Event is already deleted in EventDetailModal
    // Just refresh the calendar view
    console.log('Event deleted:', eventId);
  };

  /**
   * Close event modal
   */
  const handleCloseModal = () => {
    setShowEventModal(false);
    setSelectedEventId(null);
    setEditingEvent(null);
  };

  return (
    <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Calendar</h1>
          <p className="text-dark-text-tertiary">
            View and manage your calendar events
          </p>
        </div>

        {/* Calendar View */}
        <CalendarView
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onEventDrop={handleEventDrop}
        />

        {/* Event Detail Modal */}
        {showEventModal && selectedEventId && (
          <EventDetailModal
            isOpen={showEventModal}
            eventId={selectedEventId}
            onClose={handleCloseModal}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

