import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateEncryptionKey,
  exportKey,
  importKey,
  encryptData,
  decryptData,
  generateOAuthState,
  storeKeyInSession,
  getKeyFromSession,
  clearSessionKey
} from '../../../src/utils/encryption.js';

describe('Encryption Utilities', () => {
  let encryptionKey;

  beforeEach(async () => {
    // Generate a key for testing
    encryptionKey = await generateEncryptionKey();
    // Clear session storage
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('generateEncryptionKey', () => {
    it('should generate a random encryption key', async () => {
      const key = await generateEncryptionKey();
      
      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
      expect(key.algorithm.length).toBe(256);
    });

    it('should generate a key from password', async () => {
      const password = 'test-password-123';
      const key = await generateEncryptionKey(password);
      
      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should generate same key from same password', async () => {
      const password = 'test-password-123';
      const key1 = await generateEncryptionKey(password);
      const key2 = await generateEncryptionKey(password);
      
      const exported1 = await exportKey(key1);
      const exported2 = await exportKey(key2);
      
      expect(exported1).toBe(exported2);
    });
  });

  describe('exportKey and importKey', () => {
    it('should export and import a key', async () => {
      const exported = await exportKey(encryptionKey);
      
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(0);
      
      const imported = await importKey(exported);
      
      expect(imported).toBeDefined();
      expect(imported.type).toBe('secret');
      expect(imported.algorithm.name).toBe('AES-GCM');
    });

    it('should maintain key functionality after export/import', async () => {
      const testData = 'sensitive data';
      
      // Encrypt with original key
      const { encrypted, iv } = await encryptData(testData, encryptionKey);
      
      // Export and import key
      const exported = await exportKey(encryptionKey);
      const imported = await importKey(exported);
      
      // Decrypt with imported key
      const decrypted = await decryptData(encrypted, iv, imported);
      
      expect(decrypted).toBe(testData);
    });
  });

  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const testData = 'sensitive information';
      
      const { encrypted, iv } = await encryptData(testData, encryptionKey);
      
      expect(encrypted).toBeDefined();
      expect(iv).toBeDefined();
      expect(encrypted).not.toBe(testData);
      
      const decrypted = await decryptData(encrypted, iv, encryptionKey);
      
      expect(decrypted).toBe(testData);
    });

    it('should produce different encrypted output each time', async () => {
      const testData = 'sensitive information';
      
      const result1 = await encryptData(testData, encryptionKey);
      const result2 = await encryptData(testData, encryptionKey);
      
      // IVs should be different
      expect(result1.iv).not.toBe(result2.iv);
      // Encrypted data should be different
      expect(result1.encrypted).not.toBe(result2.encrypted);
    });

    it('should handle unicode characters', async () => {
      const testData = '🔐 Encryption 測試 тест';
      
      const { encrypted, iv } = await encryptData(testData, encryptionKey);
      const decrypted = await decryptData(encrypted, iv, encryptionKey);
      
      expect(decrypted).toBe(testData);
    });

    it('should handle empty string', async () => {
      const testData = '';
      
      const { encrypted, iv } = await encryptData(testData, encryptionKey);
      const decrypted = await decryptData(encrypted, iv, encryptionKey);
      
      expect(decrypted).toBe(testData);
    });

    it('should fail with wrong key', async () => {
      const testData = 'sensitive information';
      const wrongKey = await generateEncryptionKey();
      
      const { encrypted, iv } = await encryptData(testData, encryptionKey);
      
      await expect(
        decryptData(encrypted, iv, wrongKey)
      ).rejects.toThrow();
    });

    it('should fail with tampered data', async () => {
      const testData = 'sensitive information';
      
      const { encrypted, iv } = await encryptData(testData, encryptionKey);
      const tamperedData = encrypted.slice(0, -1) + 'X';
      
      await expect(
        decryptData(tamperedData, iv, encryptionKey)
      ).rejects.toThrow();
    });
  });

  describe('generateOAuthState', () => {
    it('should generate a random state string', () => {
      const state = generateOAuthState();
      
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });

    it('should generate different states each time', () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();
      
      expect(state1).not.toBe(state2);
    });
  });

  describe('Session key storage', () => {
    it('should store and retrieve key from session', async () => {
      await storeKeyInSession(encryptionKey);
      
      const retrieved = await getKeyFromSession();
      
      expect(retrieved).toBeDefined();
      expect(retrieved.type).toBe('secret');
      expect(retrieved.algorithm.name).toBe('AES-GCM');
    });

    it('should maintain key functionality after session storage', async () => {
      const testData = 'test data';
      
      await storeKeyInSession(encryptionKey);
      const retrieved = await getKeyFromSession();
      
      const { encrypted, iv } = await encryptData(testData, encryptionKey);
      const decrypted = await decryptData(encrypted, iv, retrieved);
      
      expect(decrypted).toBe(testData);
    });

    it('should return null when no key is stored', async () => {
      const retrieved = await getKeyFromSession();
      
      expect(retrieved).toBeNull();
    });

    it('should clear key from session', async () => {
      await storeKeyInSession(encryptionKey);
      
      let retrieved = await getKeyFromSession();
      expect(retrieved).not.toBeNull();
      
      clearSessionKey();
      
      retrieved = await getKeyFromSession();
      expect(retrieved).toBeNull();
    });
  });
});


