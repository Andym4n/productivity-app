/**
 * Time Block CRUD Operations
 * 
 * Provides create, read, update, and delete operations for time blocks
 * with validation and conflict detection.
 */

import { createTimeBlock as buildTimeBlock, normalizeTimeBlock } from '../models/index.js';
import { validateTimeBlock, validateTimeBlockConflicts, ScheduleValidationError } from '../models/validateSchedule.js';
import timeBlockStore from '../../storage/indexeddb/stores/timeBlockStore.js';
import { parseISO } from 'date-fns';

/**
 * Custom error class for time block operations
 */
export class TimeBlockOperationError extends Error {
  constructor(message, code = 'TIMEBLOCK_OPERATION_ERROR', conflicts = []) {
    super(message);
    this.name = 'TimeBlockOperationError';
    this.code = code;
    this.conflicts = conflicts;
  }
}

// Using singleton timeBlockStore instance imported above

/**
 * Creates a new time block
 * @param {Object} blockData - Time block data
 * @param {boolean} checkConflicts - Whether to check for conflicts (default: true)
 * @returns {Promise<Object>} Promise resolving to the created time block
 * @throws {ScheduleValidationError} If validation fails
 * @throws {TimeBlockOperationError} If creation fails or conflicts exist
 */
export async function createTimeBlock(blockData, checkConflicts = true) {
  console.log('[Adder] Creating time block:', { startTime: blockData.startTime, endTime: blockData.endTime, projectId: blockData.projectId });
  try {
    // Create time block using model (sets defaults, generates ID, timestamps)
    const block = buildTimeBlock(blockData);
    console.log('[Adder] Time block model created:', { id: block.id, startTime: block.startTime, endTime: block.endTime });
    
    // Validate the complete time block with defaults
    validateTimeBlock(block);
    
    // Normalize the time block (ensures dates are ISO strings)
    const normalizedBlock = normalizeTimeBlock(block);
    
    // Check for conflicts if requested
    if (checkConflicts) {
      const store = timeBlockStore;
      const startDate = parseISO(normalizedBlock.startTime);
      const endDate = parseISO(normalizedBlock.endTime);
      
      // Get existing blocks that might conflict
      const existingBlocks = await store.getByDateRange(startDate, endDate);
      
      // Validate no conflicts
      const conflictCheck = validateTimeBlockConflicts(normalizedBlock, existingBlocks);
      
      if (!conflictCheck.valid) {
        console.warn('[Adder] Time block conflicts detected:', { conflicts: conflictCheck.conflicts.length });
        throw new TimeBlockOperationError(
          `Time block conflicts with ${conflictCheck.conflicts.length} existing block(s)`,
          'CONFLICT_ERROR',
          conflictCheck.conflicts
        );
      }
    }
    
    // Store in IndexedDB
    const store = timeBlockStore;
    await store.create(normalizedBlock);
    console.log('[Adder] Time block created successfully:', { id: normalizedBlock.id, startTime: normalizedBlock.startTime, endTime: normalizedBlock.endTime });
    
    return normalizedBlock;
  } catch (error) {
    console.error('[Adder] Error creating time block:', { error: error.message, code: error.code, blockData });
    if (error instanceof ScheduleValidationError || error instanceof TimeBlockOperationError) {
      throw error;
    }
    
    // Handle IndexedDB errors
    if (error.name === 'ConstraintError' || error.message.includes('already exists')) {
      console.warn('[Adder] Duplicate time block detected:', blockData.id || 'unknown');
      throw new TimeBlockOperationError(
        `Time block with ID ${blockData.id || 'unknown'} already exists`,
        'DUPLICATE_BLOCK'
      );
    }
    
    throw new TimeBlockOperationError(
      `Failed to create time block: ${error.message}`,
      'CREATE_ERROR'
    );
  }
}

/**
 * Retrieves a time block by ID
 * @param {string} blockId - Time block ID
 * @returns {Promise<Object|null>} Promise resolving to the block or null if not found
 * @throws {TimeBlockOperationError} If retrieval fails
 */
export async function getTimeBlock(blockId) {
  try {
    if (!blockId || typeof blockId !== 'string') {
      throw new TimeBlockOperationError('Time block ID is required and must be a string', 'INVALID_ID');
    }
    
    const store = timeBlockStore;
    const block = await store.get(blockId);
    
    if (!block) {
      return null;
    }
    
    return block;
  } catch (error) {
    if (error instanceof TimeBlockOperationError) {
      throw error;
    }
    
    throw new TimeBlockOperationError(
      `Failed to retrieve time block: ${error.message}`,
      'READ_ERROR'
    );
  }
}

/**
 * Retrieves time blocks with optional filters
 * @param {Object} filters - Filter options
 * @param {Date|string} filters.startDate - Start date for range
 * @param {Date|string} filters.endDate - End date for range
 * @param {Date|string} filters.date - Specific date
 * @param {string} filters.projectId - Project ID
 * @param {string} filters.status - Time block status
 * @param {string} filters.type - Time block type
 * @param {string} filters.scheduleId - Schedule ID
 * @returns {Promise<Array>} Promise resolving to array of time blocks
 * @throws {TimeBlockOperationError} If retrieval fails
 */
export async function getTimeBlocks(filters = {}) {
  try {
    const store = timeBlockStore;
    let blocks = [];
    
    // Filter by date range
    if (filters.startDate && filters.endDate) {
      blocks = await store.getByDateRange(filters.startDate, filters.endDate);
    }
    // Filter by specific date
    else if (filters.date) {
      blocks = await store.getByDate(filters.date);
    }
    // Filter by project
    else if (filters.projectId) {
      blocks = await store.getByProjectId(filters.projectId);
    }
    // Filter by status
    else if (filters.status) {
      blocks = await store.getByStatus(filters.status);
    }
    // Filter by type
    else if (filters.type) {
      blocks = await store.getByType(filters.type);
    }
    // Filter by schedule
    else if (filters.scheduleId) {
      blocks = await store.getByScheduleId(filters.scheduleId);
    }
    // Get all blocks
    else {
      blocks = await store.getAll();
    }
    
    // Sort by start time ascending
    return blocks.sort((a, b) => {
      const dateA = new Date(a.startTime);
      const dateB = new Date(b.startTime);
      return dateA - dateB;
    });
  } catch (error) {
    throw new TimeBlockOperationError(
      `Failed to retrieve time blocks: ${error.message}`,
      'READ_ERROR'
    );
  }
}

/**
 * Updates an existing time block
 * @param {string} blockId - Time block ID
 * @param {Object} updates - Time block updates
 * @param {boolean} checkConflicts - Whether to check for conflicts (default: true)
 * @returns {Promise<Object>} Promise resolving to the updated time block
 * @throws {ScheduleValidationError} If validation fails
 * @throws {TimeBlockOperationError} If update fails or conflicts exist
 */
export async function updateTimeBlock(blockId, updates, checkConflicts = true) {
  try {
    if (!blockId || typeof blockId !== 'string') {
      throw new TimeBlockOperationError('Time block ID is required and must be a string', 'INVALID_ID');
    }
    
    // Get existing time block
    const store = timeBlockStore;
    const existing = await store.get(blockId);
    
    if (!existing) {
      throw new TimeBlockOperationError(
        `Time block with ID ${blockId} not found`,
        'NOT_FOUND'
      );
    }
    
    // Merge updates with existing block
    const updated = {
      ...existing,
      ...updates,
      id: blockId, // Ensure ID doesn't change
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString() // Update timestamp
    };
    
    // Validate the updated time block
    validateTimeBlock(updated);
    
    // Normalize the time block
    const normalizedBlock = normalizeTimeBlock(updated);
    
    // Check for conflicts if requested and time changed
    if (checkConflicts && (updates.startTime || updates.endTime)) {
      const startDate = parseISO(normalizedBlock.startTime);
      const endDate = parseISO(normalizedBlock.endTime);
      
      // Get existing blocks that might conflict
      const existingBlocks = await store.getByDateRange(startDate, endDate);
      
      // Validate no conflicts
      const conflictCheck = validateTimeBlockConflicts(normalizedBlock, existingBlocks);
      
      if (!conflictCheck.valid) {
        throw new TimeBlockOperationError(
          `Time block conflicts with ${conflictCheck.conflicts.length} existing block(s)`,
          'CONFLICT_ERROR',
          conflictCheck.conflicts
        );
      }
    }
    
    // Update in IndexedDB
    await store.update(blockId, normalizedBlock);
    
    return normalizedBlock;
  } catch (error) {
    if (error instanceof ScheduleValidationError || error instanceof TimeBlockOperationError) {
      throw error;
    }
    
    throw new TimeBlockOperationError(
      `Failed to update time block: ${error.message}`,
      'UPDATE_ERROR'
    );
  }
}

/**
 * Deletes a time block
 * @param {string} blockId - Time block ID
 * @returns {Promise<boolean>} Promise resolving to true if deleted
 * @throws {TimeBlockOperationError} If deletion fails
 */
export async function deleteTimeBlock(blockId) {
  try {
    if (!blockId || typeof blockId !== 'string') {
      throw new TimeBlockOperationError('Time block ID is required and must be a string', 'INVALID_ID');
    }
    
    const store = timeBlockStore;
    const existing = await store.get(blockId);
    
    if (!existing) {
      throw new TimeBlockOperationError(
        `Time block with ID ${blockId} not found`,
        'NOT_FOUND'
      );
    }
    
    // Delete from IndexedDB
    await store.delete(blockId);
    
    return true;
  } catch (error) {
    if (error instanceof TimeBlockOperationError) {
      throw error;
    }
    
    throw new TimeBlockOperationError(
      `Failed to delete time block: ${error.message}`,
      'DELETE_ERROR'
    );
  }
}

/**
 * Start tracking a time block (sets actualStartTime and status to in-progress)
 * @param {string} blockId - Time block ID
 * @returns {Promise<Object>} Promise resolving to the updated time block
 * @throws {TimeBlockOperationError} If operation fails
 */
export async function startTimeBlock(blockId) {
  return await updateTimeBlock(blockId, {
    actualStartTime: new Date().toISOString(),
    status: 'in-progress'
  }, false); // Don't check conflicts when starting
}

/**
 * Complete a time block (sets actualEndTime, actualDuration, and status to completed)
 * @param {string} blockId - Time block ID
 * @returns {Promise<Object>} Promise resolving to the updated time block
 * @throws {TimeBlockOperationError} If operation fails
 */
export async function completeTimeBlock(blockId) {
  const block = await getTimeBlock(blockId);
  
  if (!block) {
    throw new TimeBlockOperationError(`Time block with ID ${blockId} not found`, 'NOT_FOUND');
  }
  
  const actualEndTime = new Date().toISOString();
  const actualStart = block.actualStartTime ? parseISO(block.actualStartTime) : parseISO(block.startTime);
  const actualEnd = parseISO(actualEndTime);
  
  const actualDuration = Math.round((actualEnd - actualStart) / 60000); // Minutes
  
  return await updateTimeBlock(blockId, {
    actualEndTime,
    actualDuration,
    status: 'completed'
  }, false); // Don't check conflicts when completing
}

export default {
  createTimeBlock,
  getTimeBlock,
  getTimeBlocks,
  updateTimeBlock,
  deleteTimeBlock,
  startTimeBlock,
  completeTimeBlock,
  TimeBlockOperationError
};

