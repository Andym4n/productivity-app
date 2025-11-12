/**
 * Context Detection Service
 * 
 * Analyzes calendar events and work schedules to detect user context
 * (work, personal, focus time) for adaptive UI/UX and filtering.
 */

import { parseISO, getDay, getHours, getMinutes, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { parseTimeToMinutes, formatMinutesToTime, DAYS_OF_WEEK } from '../schedule/models/WorkSchedule.js';
import { getCurrentSchedule } from '../schedule/crud/scheduleOperations.js';

/**
 * Context types
 */
export const CONTEXT_TYPES = {
  WORK: 'work',
  PERSONAL: 'personal',
  FOCUS: 'focus'
};

/**
 * Work-related keywords for event analysis
 */
const WORK_KEYWORDS = [
  'meeting', 'standup', 'stand-up', 'sprint', 'review', 'retrospective',
  'conference', 'call', 'interview', 'presentation', 'demo', 'workshop',
  'training', 'onboarding', 'sync', 'planning', 'grooming', 'scrum',
  'client', 'customer', 'project', 'team', 'dept', 'department',
  'office', 'workplace', 'hq', 'headquarters', 'zoom', 'teams', 'slack',
  'code review', 'pull request', 'pr review', 'deployment', 'release'
];

/**
 * Personal-related keywords for event analysis
 */
const PERSONAL_KEYWORDS = [
  'lunch', 'dinner', 'breakfast', 'coffee', 'gym', 'workout', 'exercise',
  'doctor', 'dentist', 'appointment', 'personal', 'family', 'friends',
  'birthday', 'anniversary', 'vacation', 'holiday', 'trip', 'travel',
  'movie', 'theater', 'concert', 'party', 'celebration', 'wedding',
  'home', 'house', 'personal time', 'break', 'rest'
];

/**
 * Focus time indicators
 */
const FOCUS_KEYWORDS = [
  'focus', 'deep work', 'deepwork', 'concentration', 'heads down',
  'no meetings', 'do not disturb', 'dnd', 'quiet time', 'coding',
  'writing', 'analysis', 'research', 'study', 'learning'
];

/**
 * Common work email domains (can be extended)
 */
const WORK_EMAIL_DOMAINS = [
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'
];

/**
 * Checks if a time falls within work hours based on schedule
 * @param {Date} eventTime - Event time to check
 * @param {Object} schedule - Work schedule object
 * @returns {boolean} True if within work hours
 */
function isWithinWorkHours(eventTime, schedule) {
  if (!schedule || !schedule.isActive) {
    return false;
  }

  const dayOfWeek = getDay(eventTime);
  const eventHour = getHours(eventTime);
  const eventMinute = getMinutes(eventTime);
  const eventMinutes = eventHour * 60 + eventMinute;

  // Check weekly schedule first
  if (schedule.weeklySchedule && schedule.weeklySchedule[dayOfWeek]) {
    const daySchedule = schedule.weeklySchedule[dayOfWeek];
    if (!daySchedule.enabled) {
      return false;
    }
    
    if (daySchedule.startTime && daySchedule.endTime) {
      const startMinutes = parseTimeToMinutes(daySchedule.startTime);
      const endMinutes = parseTimeToMinutes(daySchedule.endTime);
      return eventMinutes >= startMinutes && eventMinutes <= endMinutes;
    }
  }

  // Fall back to default schedule
  if (schedule.defaultStartTime && schedule.defaultEndTime) {
    const startMinutes = parseTimeToMinutes(schedule.defaultStartTime);
    const endMinutes = parseTimeToMinutes(schedule.defaultEndTime);
    
    // Check if day is in preferred work days
    if (schedule.preferredWorkDays && schedule.preferredWorkDays.length > 0) {
      if (!schedule.preferredWorkDays.includes(dayOfWeek)) {
        return false;
      }
    }
    
    return eventMinutes >= startMinutes && eventMinutes <= endMinutes;
  }

  return false;
}

/**
 * Checks if a day is a work day based on schedule
 * @param {Date} eventDate - Event date to check
 * @param {Object} schedule - Work schedule object
 * @returns {boolean} True if work day
 */
function isWorkDay(eventDate, schedule) {
  if (!schedule || !schedule.isActive) {
    return false;
  }

  const dayOfWeek = getDay(eventDate);

  // Check weekly schedule
  if (schedule.weeklySchedule && schedule.weeklySchedule[dayOfWeek]) {
    return schedule.weeklySchedule[dayOfWeek].enabled === true;
  }

  // Check preferred work days
  if (schedule.preferredWorkDays && schedule.preferredWorkDays.length > 0) {
    return schedule.preferredWorkDays.includes(dayOfWeek);
  }

  // Default: Mon-Fri
  return dayOfWeek >= DAYS_OF_WEEK.MONDAY && dayOfWeek <= DAYS_OF_WEEK.FRIDAY;
}

/**
 * Analyzes event metadata for work-related keywords
 * @param {Object} event - Event object
 * @returns {number} Score from 0-1 indicating work likelihood
 */
function analyzeEventMetadata(event) {
  let workScore = 0;
  let personalScore = 0;
  let focusScore = 0;

  const searchText = [
    event.title || '',
    event.description || '',
    event.location || '',
    event.googleCalendarId || '' // Calendar name can indicate context
  ].join(' ').toLowerCase();

  // Check work keywords
  const workMatches = WORK_KEYWORDS.filter(keyword => 
    searchText.includes(keyword.toLowerCase())
  ).length;
  workScore = Math.min(workMatches / 3, 1); // Normalize to 0-1

  // Check personal keywords
  const personalMatches = PERSONAL_KEYWORDS.filter(keyword => 
    searchText.includes(keyword.toLowerCase())
  ).length;
  personalScore = Math.min(personalMatches / 2, 1); // Normalize to 0-1

  // Check focus keywords
  const focusMatches = FOCUS_KEYWORDS.filter(keyword => 
    searchText.includes(keyword.toLowerCase())
  ).length;
  focusScore = Math.min(focusMatches / 2, 1); // Normalize to 0-1

  // Analyze attendees for work emails
  if (event.attendees && Array.isArray(event.attendees)) {
    const workAttendees = event.attendees.filter(attendee => {
      if (!attendee.email) return false;
      const domain = attendee.email.split('@')[1]?.toLowerCase();
      // If domain is NOT in common personal domains, likely work
      return domain && !WORK_EMAIL_DOMAINS.includes(domain);
    }).length;
    
    if (event.attendees.length > 0) {
      const workAttendeeRatio = workAttendees / event.attendees.length;
      workScore = Math.max(workScore, workAttendeeRatio * 0.5); // Boost work score
    }
  }

  return { workScore, personalScore, focusScore };
}

/**
 * Detects context for a calendar event
 * @param {Object} event - Event object with startTime, endTime, and metadata
 * @param {Object} schedule - Optional work schedule (if not provided, will fetch active schedule)
 * @returns {Promise<string>} Detected context ('work', 'personal', or 'focus')
 */
export async function detectEventContext(event, schedule = null) {
  if (!event || !event.startTime) {
    return CONTEXT_TYPES.PERSONAL; // Default to personal
  }

  // Get schedule if not provided
  let workSchedule = schedule;
  if (!workSchedule) {
    try {
      workSchedule = await getCurrentSchedule();
    } catch (error) {
      console.warn('Failed to fetch work schedule for context detection:', error);
      workSchedule = null;
    }
  }

  // If schedule is inactive or doesn't exist, default to personal (unless strong keywords suggest otherwise)
  if (!workSchedule || !workSchedule.isActive) {
    // Still check for strong work/focus keywords, but default to personal
    const { workScore, personalScore, focusScore } = analyzeEventMetadata(event);
    
    if (focusScore > 0.5 || (event.title && event.title.toLowerCase().includes('focus'))) {
      return CONTEXT_TYPES.FOCUS;
    }
    
    // Only return work if there are very strong work indicators
    if (workScore > 0.7) {
      return CONTEXT_TYPES.WORK;
    }
    
    return CONTEXT_TYPES.PERSONAL;
  }

  const eventStart = typeof event.startTime === 'string' 
    ? parseISO(event.startTime) 
    : new Date(event.startTime);
  
  const eventEnd = event.endTime 
    ? (typeof event.endTime === 'string' ? parseISO(event.endTime) : new Date(event.endTime))
    : null;

  // Analyze event metadata
  const { workScore, personalScore, focusScore } = analyzeEventMetadata(event);

  // Check if event is during work hours
  const isWorkTime = isWithinWorkHours(eventStart, workSchedule);
  const isWorkDayCheck = isWorkDay(eventStart, workSchedule);

  // Focus time detection (high priority)
  if (focusScore > 0.5 || (event.title && event.title.toLowerCase().includes('focus'))) {
    return CONTEXT_TYPES.FOCUS;
  }

  // Work context detection
  if (isWorkTime && isWorkDayCheck) {
    // During work hours on work day - likely work
    if (workScore > 0.3 || personalScore < 0.5) {
      return CONTEXT_TYPES.WORK;
    }
  } else if (workScore > 0.6) {
    // Strong work keywords even outside work hours
    return CONTEXT_TYPES.WORK;
  }

  // Personal context detection
  if (personalScore > 0.5) {
    return CONTEXT_TYPES.PERSONAL;
  }

  // Default based on work schedule
  if (isWorkTime && isWorkDayCheck) {
    return CONTEXT_TYPES.WORK;
  }

  // Default to personal
  return CONTEXT_TYPES.PERSONAL;
}

/**
 * Gets the current context based on current time and work schedule
 * @param {Object} schedule - Optional work schedule (if not provided, will fetch active schedule)
 * @returns {Promise<string>} Current context ('work' or 'personal')
 */
export async function getCurrentContext(schedule = null) {
  const now = new Date();

  // Get schedule if not provided
  let workSchedule = schedule;
  if (!workSchedule) {
    try {
      workSchedule = await getCurrentSchedule();
    } catch (error) {
      console.warn('Failed to fetch work schedule for current context:', error);
      return CONTEXT_TYPES.PERSONAL; // Default to personal
    }
  }

  if (!workSchedule || !workSchedule.isActive) {
    return CONTEXT_TYPES.PERSONAL;
  }

  const isWorkTime = isWithinWorkHours(now, workSchedule);
  const isWorkDayCheck = isWorkDay(now, workSchedule);

  if (isWorkTime && isWorkDayCheck) {
    return CONTEXT_TYPES.WORK;
  }

  return CONTEXT_TYPES.PERSONAL;
}

/**
 * Detects context for multiple events (batch processing)
 * @param {Array<Object>} events - Array of event objects
 * @param {Object} schedule - Optional work schedule
 * @returns {Promise<Array<Object>>} Events with detected context added
 */
export async function detectEventsContext(events, schedule = null) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  // Get schedule once for all events
  let workSchedule = schedule;
  if (!workSchedule) {
    try {
      workSchedule = await getCurrentSchedule();
    } catch (error) {
      console.warn('Failed to fetch work schedule for batch context detection:', error);
    }
  }

  // Detect context for each event
  const eventsWithContext = await Promise.all(
    events.map(async (event) => {
      const context = await detectEventContext(event, workSchedule);
      return {
        ...event,
        context
      };
    })
  );

  return eventsWithContext;
}

export default {
  detectEventContext,
  getCurrentContext,
  detectEventsContext,
  CONTEXT_TYPES
};

