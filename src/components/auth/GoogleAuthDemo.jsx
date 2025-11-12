import React from 'react';
import { useGoogleAuth } from './GoogleAuthProvider.jsx';
import { GoogleLoginButton, GoogleLogoutButton } from './GoogleLogin.jsx';

/**
 * GoogleAuthDemo - Example component demonstrating Google OAuth integration
 * This component shows how to use the authentication system in your app
 */
export function GoogleAuthDemo() {
  const { isAuthenticated, isLoading, user, error } = useGoogleAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Initializing authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Google Calendar Authentication
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded">
            <p className="text-red-700 dark:text-red-200">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {!isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              Sign in with your Google account to access Google Calendar features:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
              <li>Sync calendar events</li>
              <li>Create and manage events</li>
              <li>Automatic context detection</li>
              <li>Bidirectional synchronization</li>
            </ul>
            <div className="mt-6">
              <GoogleLoginButton
                onSuccess={(userInfo) => {
                  console.log('Successfully signed in:', userInfo);
                }}
                onError={(error) => {
                  console.error('Sign in error:', error);
                }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Your tokens will be encrypted and stored securely using AES-GCM encryption.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-green-50 dark:bg-green-900 rounded-lg">
              <div className="flex-shrink-0">
                <svg
                  className="h-12 w-12 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Successfully Authenticated
                </h3>
                {user && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                Available Features
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Calendar event synchronization
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Create and edit events
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Conflict resolution
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Context detection
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <GoogleLogoutButton
                onSuccess={() => {
                  console.log('Successfully signed out');
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          🔒 Security Features
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>AES-GCM Encryption:</strong> All OAuth tokens are encrypted using 256-bit AES-GCM before storage</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>CSRF Protection:</strong> State parameter validation prevents cross-site request forgery</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>FedCM Support:</strong> Uses Federated Credential Management API for improved security</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>Secure Storage:</strong> Tokens stored in IndexedDB with automatic cleanup</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span><strong>Token Refresh:</strong> Automatic token refresh using secure refresh tokens</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default GoogleAuthDemo;


