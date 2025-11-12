/**
 * Encryption utilities using Web Crypto API (AES-GCM)
 * Provides secure encryption/decryption for sensitive data like OAuth tokens
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Generate a cryptographic key for encryption/decryption
 * @param {string} [password] - Optional password to derive key from
 * @returns {Promise<CryptoKey>} Generated encryption key
 */
export async function generateEncryptionKey(password) {
  if (password) {
    // Derive key from password using PBKDF2
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Use a fixed salt for consistency (in production, store this securely)
    const salt = enc.encode('productivity-app-salt-2025');

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Generate a random key
  return window.crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a key for storage
 * @param {CryptoKey} key - Key to export
 * @returns {Promise<string>} Base64-encoded key
 */
export async function exportKey(key) {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import a key from storage
 * @param {string} keyData - Base64-encoded key
 * @returns {Promise<CryptoKey>} Imported key
 */
export async function importKey(keyData) {
  const keyBuffer = base64ToArrayBuffer(keyData);
  return window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 * @param {string} data - Data to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<{encrypted: string, iv: string}>} Encrypted data and IV
 */
export async function encryptData(data, key) {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    enc.encode(data)
  );

  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv)
  };
}

/**
 * Decrypt data using AES-GCM
 * @param {string} encryptedData - Base64-encoded encrypted data
 * @param {string} ivData - Base64-encoded initialization vector
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<string>} Decrypted data
 */
export async function decryptData(encryptedData, ivData, key) {
  const encrypted = base64ToArrayBuffer(encryptedData);
  const iv = base64ToArrayBuffer(ivData);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

/**
 * Generate a secure random state parameter for OAuth
 * @returns {string} Random state string
 */
export function generateOAuthState() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return arrayBufferToBase64(array.buffer);
}

/**
 * Helper: Convert ArrayBuffer to Base64
 * @param {ArrayBuffer} buffer - Buffer to convert
 * @returns {string} Base64-encoded string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary);
}

/**
 * Helper: Convert Base64 to ArrayBuffer
 * @param {string} base64 - Base64-encoded string
 * @returns {ArrayBuffer} Decoded buffer
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Securely store encryption key in session storage
 * Note: This is for convenience. For maximum security, derive key from user password.
 * @param {CryptoKey} key - Key to store
 */
export async function storeKeyInSession(key) {
  const exported = await exportKey(key);
  sessionStorage.setItem('encryption_key', exported);
}

/**
 * Retrieve encryption key from session storage
 * @returns {Promise<CryptoKey|null>} Stored key or null
 */
export async function getKeyFromSession() {
  const keyData = sessionStorage.getItem('encryption_key');
  if (!keyData) return null;
  return importKey(keyData);
}

/**
 * Remove encryption key from session storage
 */
export function clearSessionKey() {
  sessionStorage.removeItem('encryption_key');
}


