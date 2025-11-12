import googleAuth from './googleAuth.js';

/**
 * Google Calendar API v3 Service
 * Provides methods for interacting with Google Calendar API
 */

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * GoogleCalendarService - Handles all Google Calendar API interactions
 */
class GoogleCalendarService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the calendar service
   */
  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * Make an authenticated API request to Google Calendar
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} API response
   */
  async makeRequest(endpoint, options = {}) {
    const accessToken = await googleAuth.getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated with Google Calendar');
    }

    const url = `${CALENDAR_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API Error: ${response.status}`);
    }

    return response;
  }

  /**
   * List all calendars for the authenticated user
   * @returns {Promise<Array>} List of calendars
   */
  async listCalendars() {
    const response = await this.makeRequest('/users/me/calendarList');
    const data = await response.json();
    return data.items || [];
  }

  /**
   * Get a specific calendar
   * @param {string} calendarId - Calendar ID (use 'primary' for main calendar)
   * @returns {Promise<Object>} Calendar details
   */
  async getCalendar(calendarId = 'primary') {
    const response = await this.makeRequest(`/calendars/${calendarId}`);
    return response.json();
  }

  /**
   * List events from a calendar
   * @param {string} calendarId - Calendar ID
   * @param {Object} options - Query options
   * @param {string} [options.syncToken] - Sync token for incremental sync
   * @param {string} [options.pageToken] - Page token for pagination
   * @param {string} [options.timeMin] - Start time (ISO string)
   * @param {string} [options.timeMax] - End time (ISO string)
   * @param {number} [options.maxResults] - Max results per page
   * @param {boolean} [options.showDeleted] - Include deleted events
   * @returns {Promise<Object>} Events list with pagination info
   */
  async listEvents(calendarId = 'primary', options = {}) {
    const params = new URLSearchParams({
      singleEvents: 'false', // Get recurring events as single instances
      showDeleted: options.showDeleted !== false, // Include deleted for sync
      ...(options.syncToken && { syncToken: options.syncToken }),
      ...(options.pageToken && { pageToken: options.pageToken }),
      ...(options.timeMin && { timeMin: options.timeMin }),
      ...(options.timeMax && { timeMax: options.timeMax }),
      ...(options.maxResults && { maxResults: options.maxResults.toString() })
    });

    const response = await this.makeRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events?${params}`
    );
    
    return response.json();
  }

  /**
   * Get a single event
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Event details
   */
  async getEvent(calendarId = 'primary', eventId) {
    const response = await this.makeRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    );
    return response.json();
  }

  /**
   * Create a new event
   * @param {string} calendarId - Calendar ID
   * @param {Object} event - Event data
   * @returns {Promise<Object>} Created event
   */
  async createEvent(calendarId = 'primary', event) {
    const response = await this.makeRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(event)
      }
    );
    return response.json();
  }

  /**
   * Update an existing event
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @param {Object} event - Updated event data
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(calendarId = 'primary', eventId, event) {
    const response = await this.makeRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(event)
      }
    );
    return response.json();
  }

  /**
   * Patch (partially update) an event
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @param {Object} updates - Partial event updates
   * @returns {Promise<Object>} Updated event
   */
  async patchEvent(calendarId = 'primary', eventId, updates) {
    const response = await this.makeRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }
    );
    return response.json();
  }

  /**
   * Delete an event
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @returns {Promise<void>}
   */
  async deleteEvent(calendarId = 'primary', eventId) {
    await this.makeRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE'
      }
    );
  }

  /**
   * Quick add an event using natural language
   * @param {string} text - Natural language event description
   * @param {string} calendarId - Calendar ID
   * @returns {Promise<Object>} Created event
   */
  async quickAdd(text, calendarId = 'primary') {
    const params = new URLSearchParams({ text });
    const response = await this.makeRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/quickAdd?${params}`,
      {
        method: 'POST'
      }
    );
    return response.json();
  }

  /**
   * Setup push notifications for calendar changes (webhooks)
   * @param {string} calendarId - Calendar ID
   * @param {Object} channel - Notification channel configuration
   * @param {string} channel.id - Unique channel ID
   * @param {string} channel.address - Webhook URL
   * @param {string} [channel.token] - Optional verification token
   * @param {number} [channel.expiration] - Channel expiration timestamp
   * @returns {Promise<Object>} Channel details
   */
  async watchEvents(calendarId = 'primary', channel) {
    const response = await this.makeRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      {
        method: 'POST',
        body: JSON.stringify({
          id: channel.id,
          type: 'web_hook',
          address: channel.address,
          ...(channel.token && { token: channel.token }),
          ...(channel.expiration && { expiration: channel.expiration })
        })
      }
    );
    return response.json();
  }

  /**
   * Stop watching a channel
   * @param {Object} channel - Channel to stop
   * @param {string} channel.id - Channel ID
   * @param {string} channel.resourceId - Resource ID from watch response
   * @returns {Promise<void>}
   */
  async stopWatching(channel) {
    await this.makeRequest('/channels/stop', {
      method: 'POST',
      body: JSON.stringify(channel)
    });
  }
}

// Export singleton instance
export const googleCalendar = new GoogleCalendarService();

export default googleCalendar;

