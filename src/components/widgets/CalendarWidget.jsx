/**
 * Calendar Widget Component
 * 
 * Displays today's and upcoming calendar events with monthly calendar view
 */

import { useState, useEffect, useMemo } from 'react';
import eventsStore from '../../storage/indexeddb/stores/eventsStore.js';
import { CONTEXT_TYPES } from '../../services/contextDetection.js';
import { navigateTo } from '../../utils/navigation.js';

export default function CalendarWidget({ context = CONTEXT_TYPES.PERSONAL }) {
  const [events, setEvents] = useState([]);
  const [monthEvents, setMonthEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      
      // Get events for today and tomorrow
      const allEvents = await eventsStore.getByDateRange(today, tomorrow).catch(() => []);
      
      // Filter by context - handle null/undefined events
      const contextEvents = (allEvents || []).filter(event => {
        if (!event) return false;
        const eventContext = event.context || 'personal';
        return eventContext === (context === CONTEXT_TYPES.WORK ? 'work' : 'personal');
      });
      
      // Sort by start time
      const sortedEvents = contextEvents
        .sort((a, b) => {
          const aTime = new Date(a.startTime).getTime();
          const bTime = new Date(b.startTime).getTime();
          return aTime - bTime;
        })
        .slice(0, 5); // Limit to 5 events
      
      setEvents(sortedEvents);
      
      // Also load events for the current month for calendar view
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      const monthEventsData = await eventsStore.getByDateRange(monthStart, monthEnd).catch(() => []);
      const contextMonthEvents = (monthEventsData || []).filter(event => {
        if (!event) return false;
        const eventContext = event.context || 'personal';
        return eventContext === (context === CONTEXT_TYPES.WORK ? 'work' : 'personal');
      });
      
      setMonthEvents(contextMonthEvents);
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // Refresh every minute
    const interval = setInterval(loadEvents, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  const formatTime = (dateTime) => {
    const date = new Date(dateTime);
    if (date.toDateString() === new Date().toDateString()) {
      return 'Today';
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatEventTime = (startTime, allDay) => {
    if (allDay) return 'All day';
    const date = new Date(startTime);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Generate calendar grid for current month
  const calendarGrid = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Day of week for first day (0 = Sunday, 6 = Saturday)
    const startDayOfWeek = firstDay.getDay();
    
    // Create array of days in month
    const daysInMonth = lastDay.getDate();
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    // Group into weeks (7 days per week)
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return { weeks, year, month };
  }, []);

  // Check if a date has events
  const hasEventsOnDate = (day) => {
    if (!day) return false;
    const date = new Date(calendarGrid.year, calendarGrid.month, day);
    date.setHours(0, 0, 0, 0);
    
    return monthEvents.some(event => {
      const eventDate = new Date(event.startTime);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === date.getTime();
    });
  };

  // Check if a date is today
  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      calendarGrid.month === today.getMonth() &&
      calendarGrid.year === today.getFullYear()
    );
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="card-glow h-full p-4">
        <h3 className="text-lg font-semibold mb-4">Calendar</h3>
        <div className="text-dark-text-tertiary text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glow h-full p-4">
        <h3 className="text-lg font-semibold mb-4">Calendar</h3>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="card-glow h-full p-4 flex flex-col overflow-hidden">
      <h3 className="text-lg font-semibold mb-4 flex-shrink-0">Calendar</h3>
      
      {events.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Monthly Calendar View */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="text-xs font-medium text-dark-text-secondary mb-2 text-center">
              {monthNames[calendarGrid.month]} {calendarGrid.year}
            </div>
            
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-[10px] text-dark-text-tertiary text-center font-medium py-0.5"
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5 flex-1 min-h-0">
              {calendarGrid.weeks.flat().map((day, index) => {
                const hasEvents = hasEventsOnDate(day);
                const isTodayDate = isToday(day);
                
                return (
                  <div
                    key={index}
                    className={`
                      flex flex-col items-center justify-center text-[10px] relative min-h-0
                      ${day 
                        ? `rounded cursor-pointer transition-colors ${
                            isTodayDate
                              ? 'bg-purple-500/20 text-purple-400 font-semibold border border-purple-500/50'
                              : hasEvents
                              ? 'bg-purple-500/10 text-dark-text-primary hover:bg-purple-500/20'
                              : 'text-dark-text-secondary hover:bg-dark-bg-secondary'
                          }`
                        : ''
                      }
                    `}
                    title={day && hasEvents ? `${monthEvents.filter(e => {
                      const eventDate = new Date(e.startTime);
                      eventDate.setHours(0, 0, 0, 0);
                      const dayDate = new Date(calendarGrid.year, calendarGrid.month, day);
                      dayDate.setHours(0, 0, 0, 0);
                      return eventDate.getTime() === dayDate.getTime();
                    }).length} event(s)` : ''}
                  >
                    {day}
                    {day && hasEvents && (
                      <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full"></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <p className="text-dark-text-tertiary text-[10px] text-center mt-2 pt-2 border-t border-dark-border">
            No {context === CONTEXT_TYPES.WORK ? 'work' : 'personal'} events today
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-3 rounded-lg bg-dark-bg-secondary border border-dark-border hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 text-right">
                  <div className="text-xs text-dark-text-tertiary">
                    {formatTime(event.startTime)}
                  </div>
                  <div className="text-sm font-medium text-purple-400 mt-1">
                    {formatEventTime(event.startTime, event.allDay)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-text-primary font-medium truncate">
                    {event.title || 'Untitled Event'}
                  </p>
                  {event.location && (
                    <p className="text-xs text-dark-text-tertiary mt-1 truncate">
                      📍 {event.location}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-xs text-dark-text-tertiary mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-dark-border flex-shrink-0">
        <button
          onClick={() => navigateTo('calendar')}
          className="block w-full text-center text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          View Full Calendar
        </button>
      </div>
    </div>
  );
}

