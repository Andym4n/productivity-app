/**
 * Media Service
 * 
 * Provides high-level API for managing media attachments (images/audio)
 * for journal entries. Handles blob storage, retrieval, and cleanup.
 */

import mediaBlobStore from '../../storage/indexeddb/stores/mediaBlobStore.js';

/**
 * Custom error class for media operations
 */
export class MediaServiceError extends Error {
  constructor(message, code = 'MEDIA_SERVICE_ERROR') {
    super(message);
    this.name = 'MediaServiceError';
    this.code = code;
  }
}

/**
 * Validates that a file is a valid image
 * @param {File} file - File to validate
 * @returns {boolean} True if valid image
 */
export function isValidImageFile(file) {
  if (!(file instanceof File)) return false;
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Validates that a file is a valid audio file
 * @param {File} file - File to validate
 * @returns {boolean} True if valid audio
 */
export function isValidAudioFile(file) {
  if (!(file instanceof File)) return false;
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'];
  return validTypes.includes(file.type);
}

/**
 * Stores an image file as a blob
 * @param {File} file - Image file to store
 * @param {string} entryId - Journal entry ID
 * @returns {Promise<string>} Promise resolving to blob ID
 */
export async function storeImageBlob(file, entryId) {
  if (!isValidImageFile(file)) {
    throw new MediaServiceError('Invalid image file type', 'INVALID_IMAGE');
  }

  try {
    const blobId = await mediaBlobStore.storeBlob(file, entryId, 'image', file.type);
    return blobId;
  } catch (error) {
    if (error instanceof MediaServiceError) {
      throw error;
    }
    throw new MediaServiceError(`Failed to store image: ${error.message}`, 'STORE_ERROR');
  }
}

/**
 * Stores an audio file as a blob
 * @param {File} file - Audio file to store
 * @param {string} entryId - Journal entry ID
 * @returns {Promise<string>} Promise resolving to blob ID
 */
export async function storeAudioBlob(file, entryId) {
  if (!isValidAudioFile(file)) {
    throw new MediaServiceError('Invalid audio file type', 'INVALID_AUDIO');
  }

  try {
    const blobId = await mediaBlobStore.storeBlob(file, entryId, 'audio', file.type);
    return blobId;
  } catch (error) {
    if (error instanceof MediaServiceError) {
      throw error;
    }
    throw new MediaServiceError(`Failed to store audio: ${error.message}`, 'STORE_ERROR');
  }
}

/**
 * Retrieves a blob URL for preview
 * @param {string} blobId - Blob ID
 * @returns {Promise<string>} Promise resolving to blob URL
 */
export async function getBlobURL(blobId) {
  try {
    return await mediaBlobStore.createBlobURL(blobId);
  } catch (error) {
    throw new MediaServiceError(`Failed to get blob URL: ${error.message}`, 'GET_URL_ERROR');
  }
}

/**
 * Retrieves blob metadata
 * @param {string} blobId - Blob ID
 * @returns {Promise<Object|null>} Promise resolving to metadata or null
 */
export async function getBlobMetadata(blobId) {
  try {
    return await mediaBlobStore.getBlobMetadata(blobId);
  } catch (error) {
    throw new MediaServiceError(`Failed to get blob metadata: ${error.message}`, 'GET_METADATA_ERROR');
  }
}

/**
 * Gets all blob IDs for a journal entry
 * @param {string} entryId - Journal entry ID
 * @returns {Promise<Array>} Promise resolving to array of blob IDs
 */
export async function getBlobsByEntry(entryId) {
  try {
    const blobs = await mediaBlobStore.getBlobsByEntry(entryId);
    return blobs.map(b => b.id);
  } catch (error) {
    throw new MediaServiceError(`Failed to get blobs: ${error.message}`, 'GET_BLOBS_ERROR');
  }
}

/**
 * Deletes a blob
 * @param {string} blobId - Blob ID to delete
 * @returns {Promise<void>}
 */
export async function deleteBlob(blobId) {
  try {
    await mediaBlobStore.deleteBlob(blobId);
  } catch (error) {
    throw new MediaServiceError(`Failed to delete blob: ${error.message}`, 'DELETE_ERROR');
  }
}

/**
 * Deletes all blobs for a journal entry
 * @param {string} entryId - Journal entry ID
 * @returns {Promise<void>}
 */
export async function deleteBlobsByEntry(entryId) {
  try {
    await mediaBlobStore.deleteBlobsByEntry(entryId);
  } catch (error) {
    throw new MediaServiceError(`Failed to delete blobs: ${error.message}`, 'DELETE_BLOBS_ERROR');
  }
}

/**
 * Revokes a blob URL to free memory
 * @param {string} blobURL - Blob URL to revoke
 */
export function revokeBlobURL(blobURL) {
  if (blobURL && typeof blobURL === 'string' && blobURL.startsWith('blob:')) {
    URL.revokeObjectURL(blobURL);
  }
}

export default {
  storeImageBlob,
  storeAudioBlob,
  getBlobURL,
  getBlobMetadata,
  getBlobsByEntry,
  deleteBlob,
  deleteBlobsByEntry,
  revokeBlobURL,
  isValidImageFile,
  isValidAudioFile,
  MediaServiceError
};

