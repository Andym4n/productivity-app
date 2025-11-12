import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import PropTypes from 'prop-types';
import googleAuth, { GOOGLE_CALENDAR_SCOPES } from '../../services/googleAuth.js';
import { useGoogleAuth } from './GoogleAuthProvider.jsx';
import { Button } from '../Button';

/**
 * GoogleLoginButton - Button component for Google OAuth login
 * @param {Object} props - Component props
 * @param {Function} [props.onSuccess] - Callback on successful authentication
 * @param {Function} [props.onError] - Callback on authentication error
 * @param {string} [props.buttonText] - Custom button text
 * @param {string} [props.variant] - Button variant
 * @param {string} [props.size] - Button size
 */
export function GoogleLoginButton({
  onSuccess,
  onError,
  buttonText = 'Sign in with Google',
  variant = 'primary',
  size = 'md'
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { setIsAuthenticated, setUser, setError } = useGoogleAuth();

  // Check if we have a valid client ID
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId || clientId === 'your-google-oauth-client-id-here') {
    return (
      <div className="p-3 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
        <p className="text-sm text-yellow-400">
          <strong>Configuration Required:</strong> Please set VITE_GOOGLE_CLIENT_ID in your .env file
        </p>
        <p className="text-xs text-yellow-300 mt-1">
          See README.md for setup instructions
        </p>
      </div>
    );
  }

  const login = useGoogleLogin({
    scope: GOOGLE_CALENDAR_SCOPES.join(' '),
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setError(null);

      try {
        // Verify state parameter
        if (tokenResponse.state && !googleAuth.verifyState(tokenResponse.state)) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Store tokens
        await googleAuth.storeTokens(tokenResponse);

        // Get user info
        const userInfo = await googleAuth.getUserInfo();
        setUser(userInfo);
        setIsAuthenticated(true);

        // Call success callback
        if (onSuccess) {
          onSuccess(userInfo);
        }
      } catch (error) {
        console.error('Error during login:', error);
        setError(error.message);
        if (onError) {
          onError(error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('OAuth error:', error);
      const errorMessage = error.error_description || error.error || 'Authentication failed';
      setError(errorMessage);
      if (onError) {
        onError(error);
      }
    },
    onNonOAuthError: (error) => {
      console.error('Non-OAuth error:', error);
      setError(error.message);
      if (onError) {
        onError(error);
      }
    },
    // Use redirect flow instead of popup to avoid COOP issues
    // Redirect is more reliable and doesn't have Cross-Origin-Opener-Policy problems
    ux_mode: 'redirect',
    // Disable FedCM to avoid additional issues
    use_fedcm_for_prompt: false,
    // Generate and use state parameter for CSRF protection
    state: googleAuth.generateState(),
    // Request offline access to get refresh token
    flow: 'auth-code'
  });

  return (
    <Button
      onClick={login}
      disabled={isLoading}
      variant={variant}
      size={size}
      aria-label="Sign in with Google Calendar"
    >
      {isLoading ? (
        <>
          <span className="inline-block animate-spin mr-2">⚪</span>
          Signing in...
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {buttonText}
        </>
      )}
    </Button>
  );
}

GoogleLoginButton.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  buttonText: PropTypes.string,
  variant: PropTypes.string,
  size: PropTypes.string
};

/**
 * GoogleLogoutButton - Button component for signing out
 * @param {Object} props - Component props
 * @param {Function} [props.onSuccess] - Callback on successful sign out
 * @param {string} [props.buttonText] - Custom button text
 * @param {string} [props.variant] - Button variant
 * @param {string} [props.size] - Button size
 */
export function GoogleLogoutButton({
  onSuccess,
  buttonText = 'Sign out',
  variant = 'secondary',
  size = 'md'
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { setIsAuthenticated, setUser, setError } = useGoogleAuth();

  const handleSignOut = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await googleAuth.signOut();
      setIsAuthenticated(false);
      setUser(null);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSignOut}
      disabled={isLoading}
      variant={variant}
      size={size}
      aria-label="Sign out from Google Calendar"
    >
      {isLoading ? 'Signing out...' : buttonText}
    </Button>
  );
}

GoogleLogoutButton.propTypes = {
  onSuccess: PropTypes.func,
  buttonText: PropTypes.string,
  variant: PropTypes.string,
  size: PropTypes.string
};

export default GoogleLoginButton;


