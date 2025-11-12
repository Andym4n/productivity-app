import { 
  encryptData, 
  decryptData, 
  generateOAuthState,
  generateEncryptionKey,
  getKeyFromSession,
  storeKeyInSession
} from '../utils/encryption.js';
import { getDatabase } from '../storage/index.js';
import OAuthTokensStore from '../storage/indexeddb/stores/OAuthTokensStore.js';

/**
 * Google Calendar OAuth 2.0 scopes
 */
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Google OAuth configuration
 */
const OAUTH_CONFIG = {
  provider: 'google',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  revokeUrl: 'https://oauth2.googleapis.com/revoke',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
};

/**
 * GoogleAuthService - Handles Google OAuth 2.0 authentication and token management
 */
class GoogleAuthService {
  constructor() {
    this.tokenStore = null;
    this.encryptionKey = null;
    this.clientId = null;
    this.initialized = false;
  }

  /**
   * Initialize the authentication service
   * @param {string} clientId - Google OAuth client ID
   * @param {boolean} [useEncryption=true] - Whether to encrypt tokens
   */
  async initialize(clientId, useEncryption = true) {
    if (this.initialized) return;

    this.clientId = clientId;
    const db = await getDatabase();
    this.tokenStore = new OAuthTokensStore(db);

    // Initialize encryption key if enabled
    if (useEncryption) {
      this.encryptionKey = await getKeyFromSession();
      if (!this.encryptionKey) {
        // Generate new key and store in session
        this.encryptionKey = await generateEncryptionKey();
        await storeKeyInSession(this.encryptionKey);
      }
    }

    this.initialized = true;
  }

  /**
   * Check if user is authenticated
   * @param {string} [userId='default'] - User identifier
   * @returns {Promise<boolean>} True if authenticated with valid tokens
   */
  async isAuthenticated(userId = 'default') {
    if (!this.tokenStore) return false;
    return this.tokenStore.hasValidTokens(OAUTH_CONFIG.provider, userId);
  }

  /**
   * Get current access token (decrypted)
   * @param {string} [userId='default'] - User identifier
   * @returns {Promise<string|null>} Access token or null
   */
  async getAccessToken(userId = 'default') {
    const tokenRecord = await this.tokenStore.getTokensByProvider(
      OAUTH_CONFIG.provider,
      userId
    );

    if (!tokenRecord) return null;

    // Check if token is expired
    if (tokenRecord.expiresAt <= Date.now()) {
      // Try to refresh the token
      const refreshed = await this.refreshAccessToken(userId);
      return refreshed ? refreshed.accessToken : null;
    }

    // Decrypt and return access token
    if (this.encryptionKey) {
      return decryptData(
        tokenRecord.encryptedAccessToken,
        tokenRecord.iv,
        this.encryptionKey
      );
    }

    return tokenRecord.encryptedAccessToken;
  }

  /**
   * Store OAuth tokens securely
   * @param {Object} tokens - Token response from OAuth
   * @param {string} tokens.access_token - Access token
   * @param {string} [tokens.refresh_token] - Refresh token
   * @param {number} tokens.expires_in - Token expiry in seconds
   * @param {string} tokens.scope - Granted scopes
   * @param {string} [userId='default'] - User identifier
   */
  async storeTokens(tokens, userId = 'default') {
    if (!this.tokenStore) {
      throw new Error('GoogleAuthService not initialized');
    }

    // Calculate expiration timestamp
    const expiresAt = Date.now() + (tokens.expires_in * 1000);

    let encryptedAccessToken, encryptedRefreshToken, iv;

    // Encrypt tokens if encryption is enabled
    if (this.encryptionKey) {
      const accessTokenEncrypted = await encryptData(
        tokens.access_token,
        this.encryptionKey
      );
      encryptedAccessToken = accessTokenEncrypted.encrypted;
      iv = accessTokenEncrypted.iv;

      if (tokens.refresh_token) {
        const refreshTokenEncrypted = await encryptData(
          tokens.refresh_token,
          this.encryptionKey
        );
        encryptedRefreshToken = refreshTokenEncrypted.encrypted;
      }
    } else {
      // Store unencrypted (not recommended for production)
      encryptedAccessToken = tokens.access_token;
      encryptedRefreshToken = tokens.refresh_token;
      iv = '';
    }

    // Check if tokens already exist for this user
    const existingToken = await this.tokenStore.getTokensByProvider(
      OAUTH_CONFIG.provider,
      userId
    );

    if (existingToken) {
      // Update existing tokens
      await this.tokenStore.updateTokens(existingToken.id, {
        encryptedAccessToken,
        encryptedRefreshToken,
        iv,
        expiresAt,
        scope: tokens.scope ? tokens.scope.split(' ') : []
      });
    } else {
      // Create new token record
      await this.tokenStore.storeTokens({
        provider: OAUTH_CONFIG.provider,
        userId,
        encryptedAccessToken,
        encryptedRefreshToken,
        iv,
        expiresAt,
        scope: tokens.scope ? tokens.scope.split(' ') : []
      });
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} [userId='default'] - User identifier
   * @returns {Promise<Object|null>} New tokens or null
   */
  async refreshAccessToken(userId = 'default') {
    const tokenRecord = await this.tokenStore.getTokensByProvider(
      OAUTH_CONFIG.provider,
      userId
    );

    if (!tokenRecord || !tokenRecord.encryptedRefreshToken) {
      return null;
    }

    // Decrypt refresh token
    let refreshToken;
    if (this.encryptionKey) {
      refreshToken = await decryptData(
        tokenRecord.encryptedRefreshToken,
        tokenRecord.iv,
        this.encryptionKey
      );
    } else {
      refreshToken = tokenRecord.encryptedRefreshToken;
    }

    // Exchange refresh token for new access token
    try {
      const response = await fetch(OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const newTokens = await response.json();
      
      // Store new tokens
      await this.storeTokens({
        ...newTokens,
        refresh_token: refreshToken // Keep existing refresh token if not provided
      }, userId);

      return {
        accessToken: newTokens.access_token,
        expiresIn: newTokens.expires_in
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return null;
    }
  }

  /**
   * Revoke OAuth tokens and sign out
   * @param {string} [userId='default'] - User identifier
   */
  async signOut(userId = 'default') {
    const tokenRecord = await this.tokenStore.getTokensByProvider(
      OAUTH_CONFIG.provider,
      userId
    );

    if (tokenRecord) {
      // Try to revoke token with Google
      try {
        let accessToken;
        if (this.encryptionKey) {
          accessToken = await decryptData(
            tokenRecord.encryptedAccessToken,
            tokenRecord.iv,
            this.encryptionKey
          );
        } else {
          accessToken = tokenRecord.encryptedAccessToken;
        }

        await fetch(`${OAUTH_CONFIG.revokeUrl}?token=${accessToken}`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error revoking token:', error);
      }

      // Delete stored tokens
      await this.tokenStore.deleteTokensByProvider(OAUTH_CONFIG.provider, userId);
    }
  }

  /**
   * Get user info from Google
   * @param {string} [userId='default'] - User identifier
   * @returns {Promise<Object|null>} User info or null
   */
  async getUserInfo(userId = 'default') {
    const accessToken = await this.getAccessToken(userId);
    if (!accessToken) return null;

    try {
      const response = await fetch(OAUTH_CONFIG.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Generate OAuth state parameter and store it
   * @returns {string} State parameter
   */
  generateState() {
    const state = generateOAuthState();
    sessionStorage.setItem('oauth_state', state);
    return state;
  }

  /**
   * Verify OAuth state parameter
   * @param {string} state - State to verify
   * @returns {boolean} True if valid
   */
  verifyState(state) {
    const storedState = sessionStorage.getItem('oauth_state');
    sessionStorage.removeItem('oauth_state');
    return storedState === state;
  }

  /**
   * Clean up expired tokens
   * @returns {Promise<number>} Number of tokens cleaned up
   */
  async cleanupExpiredTokens() {
    if (!this.tokenStore) return 0;
    return this.tokenStore.cleanupExpiredTokens();
  }
}

// Export singleton instance
export const googleAuth = new GoogleAuthService();

export default googleAuth;


