/**
 * Media Attachment Input Component
 * 
 * File input component for adding images and audio to journal entries
 */

import { useState, useRef } from 'react';
import { 
  storeImageBlob, 
  storeAudioBlob, 
  isValidImageFile, 
  isValidAudioFile,
  MediaServiceError 
} from '../../journal/services/mediaService.js';

/**
 * MediaAttachmentInput component
 * @param {Object} props
 * @param {string} props.entryId - Journal entry ID
 * @param {Function} props.onMediaAdded - Callback when media is added (receives blobId)
 * @param {string} props.accept - File types to accept (e.g., 'image/*,audio/*')
 */
export default function MediaAttachmentInput({ entryId, onMediaAdded, accept = 'image/*,audio/*' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      for (const file of files) {
        let blobId;

        if (isValidImageFile(file)) {
          blobId = await storeImageBlob(file, entryId);
        } else if (isValidAudioFile(file)) {
          blobId = await storeAudioBlob(file, entryId);
        } else {
          throw new MediaServiceError(`Unsupported file type: ${file.type}`, 'UNSUPPORTED_TYPE');
        }

        if (onMediaAdded) {
          onMediaAdded(blobId, file.type.startsWith('image/') ? 'image' : 'audio');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to upload media');
      console.error('Media upload error:', err);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (fileInputRef.current && !uploading) {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading || !entryId}
      />
      
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading || !entryId}
        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {uploading ? 'Uploading...' : 'Add Media (Images/Audio)'}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}

