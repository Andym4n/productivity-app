/**
 * Centralized error handling and error management utilities
 */

/**
 * Custom error classes for different error types
 */
export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class StorageError extends AppError {
  constructor(message, details = null) {
    super(message, 'STORAGE_ERROR', 500, details);
    this.name = 'StorageError';
  }
}

export class NetworkError extends AppError {
  constructor(message, details = null) {
    super(message, 'NETWORK_ERROR', 503, details);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message, details = null) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message, details = null) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Error handler configuration
 */
const errorHandlerConfig = {
  logToConsole: true,
  logToStorage: false, // Can be enabled to log errors to IndexedDB
  showUserNotifications: true,
  onError: null // Custom error handler callback
};

/**
 * Sets error handler configuration
 * @param {Object} config - Configuration object
 */
export function configureErrorHandler(config) {
  Object.assign(errorHandlerConfig, config);
}

/**
 * Logs an error with context
 * @param {Error} error - Error to log
 * @param {Object} context - Additional context
 */
export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    code: error.code || 'UNKNOWN',
    statusCode: error.statusCode || 500,
    details: error.details || null,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  if (errorHandlerConfig.logToConsole) {
    console.error('Error logged:', errorInfo);
  }

  // Call custom error handler if provided
  if (errorHandlerConfig.onError) {
    try {
      errorHandlerConfig.onError(errorInfo);
    } catch (handlerError) {
      console.error('Error in custom error handler:', handlerError);
    }
  }

  return errorInfo;
}

/**
 * Handles an error and returns a user-friendly message
 * @param {Error} error - Error to handle
 * @param {Object} options - Handling options
 * @returns {Object} { message: string, code: string, shouldRetry: boolean }
 */
export function handleError(error, options = {}) {
  const {
    showNotification = errorHandlerConfig.showUserNotifications,
    defaultMessage = 'An unexpected error occurred'
  } = options;

  // Log the error
  const errorInfo = logError(error, options.context);

  // Determine user-friendly message
  let userMessage = defaultMessage;
  let shouldRetry = false;

  if (error instanceof ValidationError) {
    userMessage = error.message || 'Invalid input provided';
  } else if (error instanceof StorageError) {
    userMessage = 'Failed to save or retrieve data. Please try again.';
    shouldRetry = true;
  } else if (error instanceof NetworkError) {
    userMessage = 'Network error. Please check your connection and try again.';
    shouldRetry = true;
  } else if (error instanceof AuthenticationError) {
    userMessage = 'Authentication failed. Please log in again.';
  } else if (error instanceof AuthorizationError) {
    userMessage = 'You do not have permission to perform this action.';
  } else if (error instanceof AppError) {
    userMessage = error.message || defaultMessage;
  } else if (error instanceof Error) {
    // Generic error - use message if available, otherwise default
    userMessage = error.message || defaultMessage;
  }

  // Show notification if enabled
  if (showNotification && typeof window !== 'undefined') {
    // This will be enhanced when we add UI notification system
    console.warn('User notification:', userMessage);
  }

  return {
    message: userMessage,
    code: errorInfo.code,
    shouldRetry,
    errorInfo
  };
}

/**
 * Wraps an async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, options = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const handled = handleError(error, options);
      if (options.throwAfterHandling !== false) {
        throw error;
      }
      return handled;
    }
  };
}

/**
 * Creates an error from a response object
 * @param {Response} response - Fetch response object
 * @returns {Promise<AppError>} Error object
 */
export async function createErrorFromResponse(response) {
  let message = `HTTP ${response.status}: ${response.statusText}`;
  let details = null;

  try {
    const data = await response.json();
    if (data.message) {
      message = data.message;
    }
    details = data;
  } catch {
    // If response is not JSON, use status text
    try {
      const text = await response.text();
      if (text) {
        message = text;
      }
    } catch {
      // Ignore
    }
  }

  if (response.status === 401) {
    return new AuthenticationError(message, details);
  } else if (response.status === 403) {
    return new AuthorizationError(message, details);
  } else if (response.status >= 400 && response.status < 500) {
    return new ValidationError(message, details);
  } else if (response.status >= 500) {
    return new NetworkError(message, details);
  } else {
    return new AppError(message, 'HTTP_ERROR', response.status, details);
  }
}

/**
 * Checks if an error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is retryable
 */
export function isRetryableError(error) {
  if (error instanceof NetworkError || error instanceof StorageError) {
    return true;
  }
  if (error instanceof AppError && error.statusCode >= 500) {
    return true;
  }
  return false;
}

/**
 * Gets a user-friendly error message
 * @param {Error} error - Error to get message for
 * @returns {string} User-friendly message
 */
export function getUserFriendlyMessage(error) {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export default {
  AppError,
  ValidationError,
  StorageError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  configureErrorHandler,
  logError,
  handleError,
  withErrorHandling,
  createErrorFromResponse,
  isRetryableError,
  getUserFriendlyMessage
};

