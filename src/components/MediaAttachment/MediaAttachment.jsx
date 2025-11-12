/**
 * Media Attachment Component
 * 
 * Displays and manages media attachments (images/audio) for journal entries
 */

import { useState, useEffect } from 'react';
import { getBlobURL, revokeBlobURL, deleteBlob } from '../../journal/services/mediaService.js';

/**
 * MediaAttachment component
 * @param {Object} props
 * @param {string} props.blobId - Blob ID for the media
 * @param {string} props.type - Media type ('image' or 'audio')
 * @param {Function} props.onRemove - Callback when media is removed
 * @param {boolean} props.readOnly - Whether the attachment is read-only
 */
export default function MediaAttachment({ blobId, type, onRemove, readOnly = false }) {
  const [blobURL, setBlobURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let url = null;

    const loadBlob = async () => {
      try {
        setLoading(true);
        setError(null);
        url = await getBlobURL(blobId);
        setBlobURL(url);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBlob();

    // Cleanup: revoke blob URL when component unmounts
    return () => {
      if (url) {
        revokeBlobURL(url);
      }
    };
  }, [blobId]);

  const handleRemove = async () => {
    if (readOnly || !onRemove) return;

    try {
      await deleteBlob(blobId);
      if (blobURL) {
        revokeBlobURL(blobURL);
      }
      if (onRemove) {
        onRemove(blobId);
      }
    } catch (err) {
      console.error('Failed to remove media:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
        <div className="text-sm text-gray-500">Loading {type}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 rounded-lg bg-red-50">
        <div className="text-sm text-red-600">Error loading {type}: {error}</div>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className="relative inline-block">
        <img
          src={blobURL}
          alt="Attachment"
          className="max-w-full h-auto rounded-lg border border-gray-300"
          style={{ maxHeight: '400px' }}
        />
        {!readOnly && onRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-xs"
            title="Remove image"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
        <div className="flex items-center gap-2">
          <audio controls src={blobURL} className="flex-1">
            Your browser does not support the audio element.
          </audio>
          {!readOnly && onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              title="Remove audio"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

