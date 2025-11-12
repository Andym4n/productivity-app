import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, closeDatabase } from '../../../src/storage/indexeddb/database.js';
import OAuthTokensStore from '../../../src/storage/indexeddb/stores/OAuthTokensStore.js';

describe('OAuthTokensStore', () => {
  let db;
  let store;

  beforeEach(async () => {
    db = await initDatabase();
    store = new OAuthTokensStore();
  });

  afterEach(async () => {
    // Clean up all tokens
    const allTokens = await store.getAll();
    await Promise.all(allTokens.map(token => store.delete(token.id)));
    await closeDatabase();
  });

  describe('storeTokens', () => {
    it('should store OAuth tokens', async () => {
      const tokenData = {
        provider: 'google',
        userId: 'user123',
        encryptedAccessToken: 'encrypted-access-token',
        encryptedRefreshToken: 'encrypted-refresh-token',
        iv: 'initialization-vector',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        scope: ['calendar', 'calendar.events']
      };

      const result = await store.storeTokens(tokenData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.provider).toBe('google');
      expect(result.userId).toBe('user123');
      expect(result.encryptedAccessToken).toBe('encrypted-access-token');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should use default userId when not provided', async () => {
      const tokenData = {
        provider: 'google',
        encryptedAccessToken: 'encrypted-access-token',
        iv: 'initialization-vector',
        expiresAt: Date.now() + 3600000
      };

      const result = await store.storeTokens(tokenData);

      expect(result.userId).toBe('default');
    });

    it('should handle optional refresh token', async () => {
      const tokenData = {
        provider: 'google',
        userId: 'user123',
        encryptedAccessToken: 'encrypted-access-token',
        iv: 'initialization-vector',
        expiresAt: Date.now() + 3600000
      };

      const result = await store.storeTokens(tokenData);

      expect(result.encryptedRefreshToken).toBeNull();
    });
  });

  describe('getTokensByProvider', () => {
    it('should retrieve tokens by provider', async () => {
      const tokenData = {
        provider: 'google',
        userId: 'user123',
        encryptedAccessToken: 'encrypted-access-token',
        iv: 'initialization-vector',
        expiresAt: Date.now() + 3600000
      };

      await store.storeTokens(tokenData);
      const result = await store.getTokensByProvider('google', 'user123');

      expect(result).toBeDefined();
      expect(result.provider).toBe('google');
      expect(result.userId).toBe('user123');
    });

    it('should return null when provider not found', async () => {
      const result = await store.getTokensByProvider('nonexistent', 'user123');

      expect(result).toBeNull();
    });

    it('should return null when userId does not match', async () => {
      const tokenData = {
        provider: 'google',
        userId: 'user123',
        encryptedAccessToken: 'encrypted-access-token',
        iv: 'initialization-vector',
        expiresAt: Date.now() + 3600000
      };

      await store.storeTokens(tokenData);
      const result = await store.getTokensByProvider('google', 'different-user');

      expect(result).toBeNull();
    });

    it('should use default userId when not provided', async () => {
      const tokenData = {
        provider: 'google',
        encryptedAccessToken: 'encrypted-access-token',
        iv: 'initialization-vector',
        expiresAt: Date.now() + 3600000
      };

      await store.storeTokens(tokenData);
      const result = await store.getTokensByProvider('google');

      expect(result).toBeDefined();
      expect(result.userId).toBe('default');
    });
  });

  describe('updateTokens', () => {
    it('should update existing tokens', async () => {
      const tokenData = {
        provider: 'google',
        userId: 'user123',
        encryptedAccessToken: 'old-access-token',
        iv: 'old-iv',
        expiresAt: Date.now() + 3600000
      };

      const created = await store.storeTokens(tokenData);
      
      // Add small delay to ensure updatedAt changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updates = {
        encryptedAccessToken: 'new-access-token',
        iv: 'new-iv'
      };

      const result = await store.updateTokens(created.id, updates);

      expect(result.encryptedAccessToken).toBe('new-access-token');
      expect(result.iv).toBe('new-iv');
      expect(result.updatedAt).toBeDefined();
      expect(result.updatedAt).not.toBe(created.updatedAt);
    });

    it('should throw error for non-existent token', async () => {
      await expect(
        store.updateTokens('nonexistent-id', { encryptedAccessToken: 'new' })
      ).rejects.toThrow('Token record not found');
    });
  });

  describe('deleteTokensByProvider', () => {
    it('should delete tokens by provider', async () => {
      const tokenData = {
        provider: 'google',
        userId: 'user123',
        encryptedAccessToken: 'encrypted-access-token',
        iv: 'initialization-vector',
        expiresAt: Date.now() + 3600000
      };

      await store.storeTokens(tokenData);
      
      const deleted = await store.deleteTokensByProvider('google', 'user123');
      expect(deleted).toBe(true);

      const result = await store.getTokensByProvider('google', 'user123');
      expect(result).toBeNull();
    });

    it('should return false when no tokens to delete', async () => {
      const deleted = await store.deleteTokensByProvider('nonexistent', 'user123');
      expect(deleted).toBe(false);
    });
  });

  describe('hasValidTokens', () => {
    it('should return true for valid unexpired tokens', async () => {
      const tokenData = {
        provider: 'google',
        userId: 'user123',
        encryptedAccessToken: 'encrypted-access-token',
        iv: 'initialization-vector',
        expiresAt: Date.now() + 3600000 // 1 hour from now
      };

      await store.storeTokens(tokenData);
      
      const hasValid = await store.hasValidTokens('google', 'user123');
      expect(hasValid).toBe(true);
    });

    it('should return false for expired tokens', async () => {
      const tokenData = {
        provider: 'google',
        userId: 'user123',
        encryptedAccessToken: 'encrypted-access-token',
        iv: 'initialization-vector',
        expiresAt: Date.now() - 1000 // Expired 1 second ago
      };

      await store.storeTokens(tokenData);
      
      const hasValid = await store.hasValidTokens('google', 'user123');
      expect(hasValid).toBe(false);
    });

    it('should return false when no tokens exist', async () => {
      const hasValid = await store.hasValidTokens('google', 'user123');
      expect(hasValid).toBe(false);
    });
  });

  describe('getExpiredTokens and cleanupExpiredTokens', () => {
    it('should identify expired tokens', async () => {
      // Create expired token
      const expiredToken = {
        provider: 'google',
        userId: 'user1',
        encryptedAccessToken: 'expired-token',
        iv: 'iv1',
        expiresAt: Date.now() - 1000
      };

      // Create valid token
      const validToken = {
        provider: 'google',
        userId: 'user2',
        encryptedAccessToken: 'valid-token',
        iv: 'iv2',
        expiresAt: Date.now() + 3600000
      };

      await store.storeTokens(expiredToken);
      await store.storeTokens(validToken);

      const expired = await store.getExpiredTokens();
      
      expect(expired).toHaveLength(1);
      expect(expired[0].userId).toBe('user1');
    });

    it('should cleanup expired tokens', async () => {
      // Create multiple expired tokens
      await store.storeTokens({
        provider: 'google',
        userId: 'user1',
        encryptedAccessToken: 'token1',
        iv: 'iv1',
        expiresAt: Date.now() - 1000
      });

      await store.storeTokens({
        provider: 'google',
        userId: 'user2',
        encryptedAccessToken: 'token2',
        iv: 'iv2',
        expiresAt: Date.now() - 2000
      });

      // Create valid token
      await store.storeTokens({
        provider: 'google',
        userId: 'user3',
        encryptedAccessToken: 'token3',
        iv: 'iv3',
        expiresAt: Date.now() + 3600000
      });

      const cleanedCount = await store.cleanupExpiredTokens();
      
      expect(cleanedCount).toBe(2);

      const remaining = await store.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].userId).toBe('user3');
    });

    it('should return 0 when no expired tokens', async () => {
      await store.storeTokens({
        provider: 'google',
        encryptedAccessToken: 'token',
        iv: 'iv',
        expiresAt: Date.now() + 3600000
      });

      const cleanedCount = await store.cleanupExpiredTokens();
      expect(cleanedCount).toBe(0);
    });
  });

  describe('Multiple providers', () => {
    it('should handle tokens from different providers', async () => {
      await store.storeTokens({
        provider: 'google',
        userId: 'user1',
        encryptedAccessToken: 'google-token',
        iv: 'iv1',
        expiresAt: Date.now() + 3600000
      });

      await store.storeTokens({
        provider: 'microsoft',
        userId: 'user1',
        encryptedAccessToken: 'microsoft-token',
        iv: 'iv2',
        expiresAt: Date.now() + 3600000
      });

      const googleToken = await store.getTokensByProvider('google', 'user1');
      const microsoftToken = await store.getTokensByProvider('microsoft', 'user1');

      expect(googleToken.encryptedAccessToken).toBe('google-token');
      expect(microsoftToken.encryptedAccessToken).toBe('microsoft-token');
    });
  });
});


