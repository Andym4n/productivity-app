import React from 'react';
import { createRoot } from 'react-dom/client';
import { initStorage } from './storage/index.js';
import { initializeBuiltInTemplates } from './journal/templates/templateService.js';
import { GoogleAuthProvider } from './components/auth/GoogleAuthProvider.jsx';
import App from './App.jsx';
import './index.css';

/**
 * Application entry point
 * Initializes storage and renders the React app
 */
async function init() {
  try {
    // Initialize IndexedDB storage
    await initStorage();
    
    // Initialize built-in journal templates
    await initializeBuiltInTemplates();
    
    console.log('Application initialized successfully');
    
    // Get Google OAuth Client ID from environment variable
    // Set VITE_GOOGLE_CLIENT_ID in your .env file or environment
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    
    // Render the React app
    const rootElement = document.getElementById('root');
    if (rootElement) {
      const root = createRoot(rootElement);
      root.render(
        <GoogleAuthProvider clientId={googleClientId}>
          <App />
        </GoogleAuthProvider>
      );
    } else {
      throw new Error('Root element not found');
    }
  } catch (error) {
    console.error('Failed to initialize application:', error);
    // Show error message to user
    const rootElement = document.getElementById('root');
    if (rootElement) {
      const root = createRoot(rootElement);
      root.render(
        <div className="p-8 text-center text-red-500">
          <h1 className="text-2xl font-bold mb-4">Application Error</h1>
          <p className="mb-2">Failed to initialize the application. Please refresh the page.</p>
          <p className="text-sm text-dark-text-tertiary">{error.message}</p>
        </div>
      );
    }
  }
}

// Service worker is automatically registered by vite-plugin-pwa
// The plugin handles registration, updates, and caching strategies

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

