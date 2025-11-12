/**
 * Media Attachment List Component
 * 
 * Displays a list of media attachments for a journal entry
 */

import { useState, useEffect } from 'react';
import MediaAttachment from './MediaAttachment.jsx';
import { getBlobMetadata, getBlobsByEntry } from '../../journal/services/mediaService.js';

/**
 * MediaAttachmentList component
 * @param {Object} props
 * @param {string} props.entryId - Journal entry ID
 * @param {Array} props.blobIds - Array of blob IDs (optional, will fetch if not provided)
 * @param {Function} props.onMediaChange - Callback when media list changes (receives {images, audio})
 * @param {boolean} props.readOnly - Whether attachments are read-only
 */
export default function MediaAttachmentList({ 
  entryId, 
  blobIds: providedBlobIds = null, 
  onMediaChange,
  readOnly = false 
}) {
  const [blobIds, setBlobIds] = useState(providedBlobIds || []);
  const [blobMetadata, setBlobMetadata] = useState([]);
  const [loading, setLoading] = useState(!providedBlobIds);

  useEffect(() => {
    const loadBlobs = async () => {
      if (providedBlobIds) {
        // Use provided blob IDs
        setBlobIds(providedBlobIds);
        loadMetadata(providedBlobIds);
      } else if (entryId) {
        // Fetch blob IDs for this entry
        try {
          setLoading(true);
          const ids = await getBlobsByEntry(entryId);
          setBlobIds(ids);
          loadMetadata(ids);
        } catch (error) {
          console.error('Failed to load media attachments:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    const loadMetadata = async (ids) => {
      try {
        const metadataPromises = ids.map(async (id) => {
          try {
            const meta = await getBlobMetadata(id);
            return meta ? { id, ...meta } : null;
          } catch (err) {
            console.warn(`Failed to load metadata for blob ${id}:`, err);
            return null;
          }
        });
        const metadata = (await Promise.all(metadataPromises)).filter(m => m !== null);
        setBlobMetadata(metadata);
      } catch (error) {
        console.error('Failed to load blob metadata:', error);
      }
    };

    loadBlobs();
  }, [entryId, providedBlobIds]);

  const handleRemove = async (removedBlobId) => {
    const updatedIds = blobIds.filter(id => id !== removedBlobId);
    setBlobIds(updatedIds);
    const removedMeta = blobMetadata.find(m => m.id === removedBlobId);
    setBlobMetadata(prev => prev.filter(m => m.id !== removedBlobId));
    
    if (onMediaChange) {
      // Get updated metadata to properly separate images and audio
      const updatedMetadata = blobMetadata.filter(m => m.id !== removedBlobId);
      const images = updatedMetadata.filter(m => m.type === 'image').map(m => m.id);
      const audio = updatedMetadata.filter(m => m.type === 'audio').map(m => m.id);
      onMediaChange({ images, audio });
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500">Loading attachments...</div>
    );
  }

  if (blobIds.length === 0) {
    return null;
  }

  // Group by type
  const images = blobMetadata.filter(m => m.type === 'image');
  const audio = blobMetadata.filter(m => m.type === 'audio');

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Images</h4>
          <div className="flex flex-wrap gap-4">
            {images.map((meta) => (
              <MediaAttachment
                key={meta.id}
                blobId={meta.id}
                type="image"
                onRemove={handleRemove}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      )}
      
      {audio.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Audio</h4>
          <div className="space-y-2">
            {audio.map((meta) => (
              <MediaAttachment
                key={meta.id}
                blobId={meta.id}
                type="audio"
                onRemove={handleRemove}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

