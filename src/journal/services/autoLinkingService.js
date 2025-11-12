/**
 * Auto-Linking Service
 * 
 * Coordinates parsing, matching, and updating of journal entry links
 * to tasks and events based on content analysis.
 */

import { extractReferences } from '../utils/contentParser.js';
import { matchReferences } from '../utils/referenceMatcher.js';
import { updateJournalEntry } from '../crud/index.js';

/**
 * Custom error class for auto-linking operations
 */
export class AutoLinkingError extends Error {
  constructor(message, code = 'AUTO_LINKING_ERROR') {
    super(message);
    this.name = 'AutoLinkingError';
    this.code = code;
  }
}

/**
 * Analyzes journal entry content and finds matching tasks/events
 * @param {Object} entry - Journal entry object
 * @param {Object} options - Options
 * @param {Date} options.referenceDate - Reference date for date matching (default: entry date)
 * @param {number} options.proximityDays - Days for proximity window (default: 7)
 * @param {boolean} options.updateEntry - Whether to update the entry with found links (default: false)
 * @returns {Promise<Object>} Promise resolving to analysis results
 */
export async function analyzeAndLink(entry, options = {}) {
  try {
    if (!entry || !entry.content) {
      throw new AutoLinkingError('Journal entry and content are required', 'INVALID_ENTRY');
    }

    const {
      referenceDate = entry.date ? new Date(entry.date) : new Date(),
      proximityDays = 7,
      updateEntry = false
    } = options;

    // Extract references from content
    const references = extractReferences(entry.content, referenceDate);

    // Match references with tasks and events
    const matches = await matchReferences(references, {
      referenceDate,
      proximityDays
    });

    // Extract IDs from matched items
    const matchedTaskIds = matches.tasks.map(t => t.id);
    const matchedEventIds = matches.events.map(e => e.id);

    // Combine with existing links (avoid duplicates)
    const linkedTasks = [...new Set([
      ...(entry.linkedTasks || []),
      ...matchedTaskIds
    ])];

    const linkedEvents = [...new Set([
      ...(entry.linkedEvents || []),
      ...matchedEventIds
    ])];

    const result = {
      references,
      matches,
      linkedTasks,
      linkedEvents,
      newTasks: matchedTaskIds.filter(id => !(entry.linkedTasks || []).includes(id)),
      newEvents: matchedEventIds.filter(id => !(entry.linkedEvents || []).includes(id))
    };

    // Update entry if requested
    if (updateEntry && entry.id) {
      try {
        await updateJournalEntry(entry.id, {
          linkedTasks,
          linkedEvents
        });
        result.updated = true;
      } catch (error) {
        console.error('Failed to update journal entry with links:', error);
        result.updateError = error.message;
      }
    }

    return result;
  } catch (error) {
    if (error instanceof AutoLinkingError) {
      throw error;
    }
    throw new AutoLinkingError(
      `Failed to analyze and link: ${error.message}`,
      'ANALYSIS_ERROR'
    );
  }
}

/**
 * Removes links that are no longer referenced in the content
 * @param {Object} entry - Journal entry object
 * @param {Object} options - Options
 * @param {Date} options.referenceDate - Reference date for date matching (default: entry date)
 * @param {boolean} options.updateEntry - Whether to update the entry (default: false)
 * @returns {Promise<Object>} Promise resolving to cleanup results
 */
export async function cleanupUnreferencedLinks(entry, options = {}) {
  try {
    if (!entry || !entry.content) {
      throw new AutoLinkingError('Journal entry and content are required', 'INVALID_ENTRY');
    }

    const {
      referenceDate = entry.date ? new Date(entry.date) : new Date(),
      updateEntry = false
    } = options;

    // Extract references from content
    const references = extractReferences(entry.content, referenceDate);

    // Get all referenced IDs (from UUIDs in content)
    const referencedIds = new Set(references.uuids);

    // Filter linked tasks/events to only include those still referenced
    const linkedTasks = (entry.linkedTasks || []).filter(id => referencedIds.has(id));
    const linkedEvents = (entry.linkedEvents || []).filter(id => referencedIds.has(id));

    const removedTasks = (entry.linkedTasks || []).filter(id => !referencedIds.has(id));
    const removedEvents = (entry.linkedEvents || []).filter(id => !referencedIds.has(id));

    const result = {
      linkedTasks,
      linkedEvents,
      removedTasks,
      removedEvents
    };

    // Update entry if requested
    if (updateEntry && entry.id) {
      try {
        await updateJournalEntry(entry.id, {
          linkedTasks,
          linkedEvents
        });
        result.updated = true;
      } catch (error) {
        console.error('Failed to update journal entry after cleanup:', error);
        result.updateError = error.message;
      }
    }

    return result;
  } catch (error) {
    if (error instanceof AutoLinkingError) {
      throw error;
    }
    throw new AutoLinkingError(
      `Failed to cleanup links: ${error.message}`,
      'CLEANUP_ERROR'
    );
  }
}

/**
 * Performs full auto-linking: analyzes content, adds new links, and removes unreferenced ones
 * @param {Object} entry - Journal entry object
 * @param {Object} options - Options
 * @param {Date} options.referenceDate - Reference date for date matching (default: entry date)
 * @param {number} options.proximityDays - Days for proximity window (default: 7)
 * @param {boolean} options.updateEntry - Whether to update the entry (default: false)
 * @param {boolean} options.cleanupUnreferenced - Whether to remove unreferenced links (default: true)
 * @returns {Promise<Object>} Promise resolving to full linking results
 */
export async function performAutoLinking(entry, options = {}) {
  try {
    const {
      cleanupUnreferenced = true,
      ...analysisOptions
    } = options;

    // First, analyze and add new links
    const analysis = await analyzeAndLink(entry, {
      ...analysisOptions,
      updateEntry: false // We'll update at the end
    });

    // Then, cleanup unreferenced links if requested
    let cleanup = null;
    if (cleanupUnreferenced) {
      cleanup = await cleanupUnreferencedLinks(entry, {
        referenceDate: analysisOptions.referenceDate,
        updateEntry: false // We'll update at the end
      });
    }

    // Combine results
    const linkedTasks = cleanup
      ? cleanup.linkedTasks.filter(id => analysis.linkedTasks.includes(id))
      : analysis.linkedTasks;

    const linkedEvents = cleanup
      ? cleanup.linkedEvents.filter(id => analysis.linkedEvents.includes(id))
      : analysis.linkedEvents;

    // Update entry if requested
    let updated = false;
    if (analysisOptions.updateEntry && entry.id) {
      try {
        await updateJournalEntry(entry.id, {
          linkedTasks,
          linkedEvents
        });
        updated = true;
      } catch (error) {
        console.error('Failed to update journal entry with auto-links:', error);
      }
    }

    return {
      ...analysis,
      cleanup,
      linkedTasks,
      linkedEvents,
      updated
    };
  } catch (error) {
    if (error instanceof AutoLinkingError) {
      throw error;
    }
    throw new AutoLinkingError(
      `Failed to perform auto-linking: ${error.message}`,
      'AUTO_LINKING_ERROR'
    );
  }
}

export default {
  analyzeAndLink,
  cleanupUnreferencedLinks,
  performAutoLinking,
  AutoLinkingError
};

