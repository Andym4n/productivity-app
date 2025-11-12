import { BaseStore } from './baseStore.js';

/**
 * Media blob store - handles storage and retrieval of media blobs (images/audio)
 * for journal entries
 */
export class MediaBlobStore extends BaseStore {
  constructor() {
    super('mediaBlobs');
  }

  /**
   * Stores a blob and returns its ID
   * @param {Blob} blob - The blob to store
   * @param {string} entryId - The journal entry ID this blob belongs to
   * @param {string} type - Media type ('image' or 'audio')
   * @param {string} mimeType - MIME type of the blob
   * @returns {Promise<string>} Promise resolving to the blob ID
   */
  async storeBlob(blob, entryId, type, mimeType) {
    if (!(blob instanceof Blob)) {
      throw new Error('First argument must be a Blob');
    }
    if (!entryId || typeof entryId !== 'string') {
      throw new Error('Entry ID is required');
    }
    if (type !== 'image' && type !== 'audio') {
      throw new Error('Type must be "image" or "audio"');
    }

    // Generate blob ID
    const blobId = `${entryId}_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const blobData = {
      id: blobId,
      entryId,
      type,
      mimeType,
      blob,
      createdAt: new Date().toISOString()
    };

    await this.create(blobData);
    return blobId;
  }

  /**
   * Retrieves a blob by ID
   * @param {string} blobId - The blob ID
   * @returns {Promise<Blob|null>} Promise resolving to the blob or null if not found
   */
  async getBlob(blobId) {
    const blobData = await this.get(blobId);
    return blobData ? blobData.blob : null;
  }

  /**
   * Retrieves blob metadata by ID
   * @param {string} blobId - The blob ID
   * @returns {Promise<Object|null>} Promise resolving to blob metadata or null
   */
  async getBlobMetadata(blobId) {
    const blobData = await this.get(blobId);
    if (!blobData) return null;

    return {
      id: blobData.id,
      entryId: blobData.entryId,
      type: blobData.type,
      mimeType: blobData.mimeType,
      createdAt: blobData.createdAt
    };
  }

  /**
   * Gets all blob IDs for a specific journal entry
   * @param {string} entryId - The journal entry ID
   * @returns {Promise<Array>} Promise resolving to array of blob IDs
   */
  async getBlobsByEntry(entryId) {
    return await this.query('byEntryId', entryId);
  }

  /**
   * Deletes a blob by ID
   * @param {string} blobId - The blob ID to delete
   * @returns {Promise<void>}
   */
  async deleteBlob(blobId) {
    await this.delete(blobId);
  }

  /**
   * Deletes all blobs for a specific journal entry
   * @param {string} entryId - The journal entry ID
   * @returns {Promise<void>}
   */
  async deleteBlobsByEntry(entryId) {
    const blobs = await this.getBlobsByEntry(entryId);
    for (const blobData of blobs) {
      await this.deleteBlob(blobData.id);
    }
  }

  /**
   * Creates a blob URL for preview
   * @param {string} blobId - The blob ID
   * @returns {Promise<string>} Promise resolving to blob URL
   */
  async createBlobURL(blobId) {
    const blob = await this.getBlob(blobId);
    if (!blob) {
      throw new Error(`Blob with ID ${blobId} not found`);
    }
    return URL.createObjectURL(blob);
  }
}

export default new MediaBlobStore();

