import { BaseStore } from './baseStore.js';
import { generateId } from '../../../utils/id.js';

/**
 * OAuthTokensStore - Handles storage of OAuth 2.0 tokens
 * Provides methods for storing and retrieving encrypted OAuth tokens
 */
class OAuthTokensStore extends BaseStore {
  constructor() {
    super('oauthTokens');
  }

  /**
   * Store OAuth tokens for a provider
   * @param {Object} tokenData - Token data
   * @param {string} tokenData.provider - OAuth provider (e.g., 'google')
   * @param {string} tokenData.userId - User identifier
   * @param {string} tokenData.encryptedAccessToken - Encrypted access token
   * @param {string} tokenData.encryptedRefreshToken - Encrypted refresh token (optional)
   * @param {string} tokenData.iv - Initialization vector for encryption
   * @param {number} tokenData.expiresAt - Token expiration timestamp
   * @param {Object} tokenData.scope - Granted scopes
   * @returns {Promise<Object>} Created token record
   */
  async storeTokens(tokenData) {
    const id = generateId();
    const now = Date.now();

    const tokenRecord = {
      id,
      provider: tokenData.provider,
      userId: tokenData.userId || 'default',
      encryptedAccessToken: tokenData.encryptedAccessToken,
      encryptedRefreshToken: tokenData.encryptedRefreshToken || null,
      iv: tokenData.iv,
      expiresAt: tokenData.expiresAt,
      scope: tokenData.scope || [],
      createdAt: now,
      updatedAt: now
    };

    return this.create(tokenRecord);
  }

  /**
   * Get tokens for a specific provider and user
   * @param {string} provider - OAuth provider
   * @param {string} [userId='default'] - User identifier
   * @returns {Promise<Object|null>} Token record or null
   */
  async getTokensByProvider(provider, userId = 'default') {
    const tokens = await this.query('byProvider', provider);
    return tokens.find(token => token.userId === userId) || null;
  }

  /**
   * Update tokens for an existing record
   * @param {string} id - Token record ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated token record
   */
  async updateTokens(id, updates) {
    const existingToken = await this.get(id);
    if (!existingToken) {
      throw new Error(`Token record not found: ${id}`);
    }

    return this.update(id, {
      ...updates,
      updatedAt: Date.now()
    });
  }

  /**
   * Delete tokens for a provider
   * @param {string} provider - OAuth provider
   * @param {string} [userId='default'] - User identifier
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteTokensByProvider(provider, userId = 'default') {
    const token = await this.getTokensByProvider(provider, userId);
    if (token) {
      await this.delete(token.id);
      return true;
    }
    return false;
  }

  /**
   * Check if tokens exist and are not expired
   * @param {string} provider - OAuth provider
   * @param {string} [userId='default'] - User identifier
   * @returns {Promise<boolean>} True if valid tokens exist
   */
  async hasValidTokens(provider, userId = 'default') {
    const token = await this.getTokensByProvider(provider, userId);
    if (!token) return false;

    const now = Date.now();
    return token.expiresAt > now;
  }

  /**
   * Get all expired tokens
   * @returns {Promise<Array>} Array of expired token records
   */
  async getExpiredTokens() {
    const now = Date.now();
    const allTokens = await this.getAll();
    return allTokens.filter(token => token.expiresAt <= now);
  }

  /**
   * Clean up expired tokens
   * @returns {Promise<number>} Number of tokens deleted
   */
  async cleanupExpiredTokens() {
    const expiredTokens = await this.getExpiredTokens();
    await Promise.all(expiredTokens.map(token => this.delete(token.id)));
    return expiredTokens.length;
  }
}

export default OAuthTokensStore;


