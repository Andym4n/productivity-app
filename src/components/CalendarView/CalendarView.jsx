import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import eventsStore from '../../storage/indexeddb/stores/eventsStore.js';
import { useCalendarSync } from '../calendar/useCalendarSync.js';
import { useGoogleAuth } from '../auth/GoogleAuthProvider.jsx';
import { GoogleLoginButton } from '../auth/GoogleLogin.jsx';
import { format, startOfDay, endOfDay } from 'date-fns';

/**
 * CalendarView Component
 * Displays calendar events using FullCalendar with day/week/month views
 */
export default function CalendarView({ onEventClick, onDateClick, onEventDrop }) {
  const [events, setEvents] = useState([]);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarRef = useRef(null);
  
  // Get authentication state
  const { isAuthenticated, isLoading: authLoading, error: authError, user } = useGoogleAuth();
  
  const { syncing, lastSync, syncError, fullSync, incrementalSync } = useCalendarSync({
    autoSyncInterval: 0 // Manual sync for now
  });

  /**
   * Convert local event to FullCalendar event format
   */
  const mapEventToFullCalendar = (event) => {
    // Determine colors based on context
    let backgroundColor, borderColor;
    const context = event.context || 'personal';
    
    switch (context) {
      case 'work':
        backgroundColor = '#3b82f6'; // Blue
        borderColor = '#2563eb';
        break;
      case 'focus':
        backgroundColor = '#10b981'; // Green/Teal for focus time
        borderColor = '#059669';
        break;
      case 'personal':
      default:
        backgroundColor = '#8b5cf6'; // Purple
        borderColor = '#7c3aed';
        break;
    }

    return {
      id: event.id,
      title: event.title || 'Untitled Event',
      start: event.startTime,
      end: event.endTime,
      allDay: event.allDay || false,
      backgroundColor,
      borderColor,
      extendedProps: {
        description: event.description || '',
        location: event.location || '',
        status: event.status || 'confirmed',
        context,
        googleEventId: event.googleEventId || null,
        googleCalendarId: event.googleCalendarId || null,
        synced: event.synced || false,
        attendees: event.attendees || [],
        reminders: event.reminders || {}
      }
    };
  };

  /**
   * Load events for the current view's date range
   */
  const loadEvents = async (viewStart, viewEnd) => {
    try {
      // Convert to Date objects if needed
      const start = viewStart instanceof Date ? viewStart : new Date(viewStart);
      const end = viewEnd instanceof Date ? viewEnd : new Date(viewEnd);
      
      // Ensure dates are at start/end of day for proper range matching
      const startOfRange = startOfDay(start);
      const endOfRange = endOfDay(end);
      
      // Get events in date range
      // Note: getByDateRange expects Date objects and handles conversion internally
      const fetchedEvents = await eventsStore.getByDateRange(startOfRange, endOfRange);
      
      // Map to FullCalendar format
      const mappedEvents = fetchedEvents.map(mapEventToFullCalendar);
      setEvents(mappedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      // Set empty array on error to prevent stale data
      setEvents([]);
    }
  };

  /**
   * Handle view change
   */
  const handleViewChange = (view) => {
    setCurrentView(view.view.type);
    setCurrentDate(view.view.currentStart);
    
    // Load events for new view
    loadEvents(view.view.currentStart, view.view.currentEnd);
  };

  /**
   * Handle dates set (when calendar navigates)
   */
  const handleDatesSet = (dateInfo) => {
    loadEvents(dateInfo.start, dateInfo.end);
  };

  /**
   * Handle event click
   */
  const handleEventClick = (clickInfo) => {
    if (onEventClick) {
      // Get full event data from store
      eventsStore.get(clickInfo.event.id).then(event => {
        if (event) {
          onEventClick(event, clickInfo);
        }
      });
    }
  };

  /**
   * Handle date click
   */
  const handleDateClick = (dateClickInfo) => {
    if (onDateClick) {
      onDateClick(dateClickInfo.date);
    }
  };

  /**
   * Handle event drop (drag and drop)
   */
  const handleEventDrop = async (dropInfo) => {
    try {
      const eventId = dropInfo.event.id;
      const event = await eventsStore.get(eventId);
      
      if (!event) {
        console.error('Event not found:', eventId);
        return;
      }

      // Calculate new start and end times
      const oldStart = new Date(dropInfo.event.start);
      const newStart = new Date(dropInfo.event.start);
      const oldEnd = new Date(dropInfo.event.end);
      const duration = oldEnd - oldStart;
      const newEnd = new Date(newStart.getTime() + duration);

      // Update event
      await eventsStore.update(eventId, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        synced: false // Mark as unsynced after local edit
      });

      // Reload events
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        loadEvents(calendarApi.view.currentStart, calendarApi.view.currentEnd);
      }

      // Call custom handler if provided
      if (onEventDrop) {
        onEventDrop(event, dropInfo);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      // Revert the change
      dropInfo.revert();
    }
  };

  /**
   * Handle manual sync
   */
  const handleSync = async () => {
    if (!isAuthenticated) {
      return; // Don't attempt sync if not authenticated
    }
    
    try {
      await incrementalSync();
      // Reload events after sync
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        loadEvents(calendarApi.view.currentStart, calendarApi.view.currentEnd);
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  /**
   * Handle successful authentication
   */
  const handleAuthSuccess = () => {
    // Reload events after authentication
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      loadEvents(calendarApi.view.currentStart, calendarApi.view.currentEnd);
    }
  };

  // Load events on mount
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      loadEvents(calendarApi.view.currentStart, calendarApi.view.currentEnd);
    }
  }, []);

  // Reload events when sync completes
  useEffect(() => {
    if (lastSync && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      loadEvents(calendarApi.view.currentStart, calendarApi.view.currentEnd);
    }
  }, [lastSync]);

  return (
    <div className="calendar-container">
      {/* Sync Status Bar */}
      <div className="mb-4 space-y-2">
        {/* Authentication Status */}
        {authError && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">
              <strong>Auth Error:</strong> {authError}
            </p>
            {authError.includes('client') && (
              <p className="text-xs text-red-300 mt-1">
                Make sure VITE_GOOGLE_CLIENT_ID is set in your .env file and restart the dev server.
              </p>
            )}
          </div>
        )}
        
        {/* Sync Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {syncing && (
              <span className="text-sm text-blue-400">Syncing...</span>
            )}
            {syncError && syncError !== 'Not authenticated' && (
              <span className="text-sm text-red-400">Sync error: {syncError}</span>
            )}
            {lastSync && !syncing && isAuthenticated && (
              <span className="text-sm text-dark-text-tertiary">
                Last synced: {format(new Date(lastSync), 'MMM d, HH:mm')}
              </span>
            )}
            {isAuthenticated && user && (
              <span className="text-sm text-dark-text-tertiary">
                Signed in as: {user.email || user.name || 'Google User'}
              </span>
            )}
            {!isAuthenticated && !authLoading && !authError && (
              <span className="text-sm text-dark-text-tertiary">
                Sign in with Google to sync your calendar
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            ) : (
              <GoogleLoginButton
                onSuccess={handleAuthSuccess}
                onError={(error) => {
                  console.error('Login error:', error);
                }}
                buttonText="Sign in to Sync"
                variant="primary"
                size="sm"
              />
            )}
          </div>
        </div>
      </div>

      {/* FullCalendar */}
      <div className="bg-dark-bg-secondary rounded-lg p-4 border border-dark-border">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          editable={true}
          droppable={false}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
          datesSet={handleDatesSet}
          viewDidMount={handleViewChange}
          height="auto"
          eventDisplay="block"
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
          }}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          allDaySlot={true}
          // Dark theme styling
          themeSystem="standard"
          eventClassNames="calendar-event"
          dayCellClassNames="calendar-day-cell"
          // Custom button text
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day'
          }}
        />
      </div>

      {/* Custom CSS for dark theme */}
      <style>{`
        .fc {
          --fc-border-color: rgb(55, 65, 81);
          --fc-daygrid-event-dot-width: 8px;
          --fc-small-font-size: 0.875rem;
          --fc-page-bg-color: transparent;
        }
        
        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: rgb(55, 65, 81);
        }
        
        .fc-theme-standard .fc-scrollgrid {
          border-color: rgb(55, 65, 81);
        }
        
        .fc-col-header-cell {
          background-color: rgb(31, 41, 55);
          color: rgb(209, 213, 219);
          font-weight: 600;
          padding: 0.75rem 0.5rem;
        }
        
        .fc-daygrid-day {
          background-color: rgb(17, 24, 39);
        }
        
        .fc-daygrid-day.fc-day-today {
          background-color: rgb(30, 58, 138);
        }
        
        .fc-daygrid-day-number {
          color: rgb(209, 213, 219);
          padding: 0.5rem;
        }
        
        .fc-day-today .fc-daygrid-day-number {
          color: white;
          font-weight: 700;
        }
        
        .fc-button {
          background-color: rgb(55, 65, 81);
          border-color: rgb(75, 85, 99);
          color: rgb(209, 213, 219);
          padding: 0.5rem 1rem;
          font-weight: 500;
          border-radius: 0.375rem;
        }
        
        .fc-button:hover {
          background-color: rgb(75, 85, 99);
          border-color: rgb(107, 114, 128);
        }
        
        .fc-button-active {
          background-color: rgb(59, 130, 246);
          border-color: rgb(37, 99, 235);
          color: white;
        }
        
        .fc-button-primary:not(:disabled):active,
        .fc-button-primary:not(:disabled).fc-button-active {
          background-color: rgb(59, 130, 246);
          border-color: rgb(37, 99, 235);
        }
        
        .fc-toolbar-title {
          color: rgb(209, 213, 219);
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .calendar-event {
          border-radius: 0.25rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
        }
        
        .calendar-event:hover {
          opacity: 0.9;
        }
        
        .fc-timegrid-slot {
          border-color: rgb(55, 65, 81);
        }
        
        .fc-timegrid-col {
          background-color: rgb(17, 24, 39);
        }
        
        .fc-timegrid-now-indicator-line {
          border-color: rgb(239, 68, 68);
        }
      `}</style>
    </div>
  );
}

