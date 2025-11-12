import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import PropTypes from 'prop-types';
import googleAuth from '../../services/googleAuth.js';

/**
 * Context for Google authentication state
 */
const GoogleAuthContext = createContext(null);

/**
 * GoogleAuthProvider - Wraps app with Google OAuth context and authentication state
 * @param {Object} props - Component props
 * @param {string} props.clientId - Google OAuth client ID
 * @param {React.ReactNode} props.children - Child components
 * @param {boolean} [props.useEncryption=true] - Whether to encrypt stored tokens
 */
export function GoogleAuthProvider({ clientId, children, useEncryption = true }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // Initialize Google Auth Service
  useEffect(() => {
    const initAuth = async () => {
      try {
        // If no clientId or placeholder, skip initialization
        if (!clientId || clientId === 'your-google-oauth-client-id-here' || clientId.trim() === '') {
          setIsLoading(false);
          setIsAuthenticated(false);
          setError(null); // Don't show error for missing config
          return;
        }

        await googleAuth.initialize(clientId, useEncryption);
        const authenticated = await googleAuth.isAuthenticated();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          const userInfo = await googleAuth.getUserInfo();
          setUser(userInfo);
        }
      } catch (err) {
        console.error('Error initializing Google Auth:', err);
        setError(err.message);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [clientId, useEncryption]);

  // Cleanup expired tokens periodically
  useEffect(() => {
    const cleanup = async () => {
      try {
        await googleAuth.cleanupExpiredTokens();
      } catch (err) {
        console.error('Error cleaning up expired tokens:', err);
      }
    };

    // Run cleanup on mount and every hour
    cleanup();
    const interval = setInterval(cleanup, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const contextValue = {
    isAuthenticated,
    isLoading,
    user,
    error,
    setIsAuthenticated,
    setUser,
    setError
  };

  // If no clientId is provided, still provide context but mark as not authenticated
  // This allows the app to work without Google Auth configured
  if (!clientId) {
    return (
      <GoogleAuthContext.Provider value={contextValue}>
        {children}
      </GoogleAuthContext.Provider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleAuthContext.Provider value={contextValue}>
        {children}
      </GoogleAuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

GoogleAuthProvider.propTypes = {
  clientId: PropTypes.string, // Optional - app can work without Google Auth
  children: PropTypes.node.isRequired,
  useEncryption: PropTypes.bool
};

/**
 * Hook to access Google authentication context
 * @returns {Object} Authentication context
 */
export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    // Return default context instead of throwing to allow app to work without provider
    // This can happen during development or if provider isn't set up
    console.warn('useGoogleAuth called outside GoogleAuthProvider - using default context');
    return {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      setIsAuthenticated: () => {},
      setUser: () => {},
      setError: () => {}
    };
  }
  return context;
}

export default GoogleAuthProvider;


