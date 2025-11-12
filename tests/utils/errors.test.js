import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  StorageError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  handleError,
  isRetryableError,
  getUserFriendlyMessage,
  configureErrorHandler
} from '../../src/utils/errors.js';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create error with code and status', () => {
      const error = new AppError('Test error', 'TEST_CODE', 400);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.timestamp).toBeTruthy();
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('StorageError', () => {
    it('should create storage error', () => {
      const error = new StorageError('Storage failed');
      expect(error.name).toBe('StorageError');
      expect(error.code).toBe('STORAGE_ERROR');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('NetworkError', () => {
    it('should create network error', () => {
      const error = new NetworkError('Network failed');
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(503);
    });
  });

  describe('handleError', () => {
    it('should handle ValidationError', () => {
      const error = new ValidationError('Invalid input');
      const handled = handleError(error, { showNotification: false });
      expect(handled.message).toBe('Invalid input');
      expect(handled.code).toBe('VALIDATION_ERROR');
      expect(handled.shouldRetry).toBe(false);
    });

    it('should handle StorageError', () => {
      const error = new StorageError('Storage failed');
      const handled = handleError(error, { showNotification: false });
      expect(handled.shouldRetry).toBe(true);
    });

    it('should handle NetworkError', () => {
      const error = new NetworkError('Network failed');
      const handled = handleError(error, { showNotification: false });
      expect(handled.shouldRetry).toBe(true);
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');
      const handled = handleError(error, { showNotification: false });
      expect(handled.message).toBe('Generic error');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      expect(isRetryableError(new StorageError('test'))).toBe(true);
      expect(isRetryableError(new NetworkError('test'))).toBe(true);
      expect(isRetryableError(new ValidationError('test'))).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should get message from AppError', () => {
      const error = new AppError('User message');
      expect(getUserFriendlyMessage(error)).toBe('User message');
    });

    it('should get message from generic Error', () => {
      const error = new Error('Generic message');
      expect(getUserFriendlyMessage(error)).toBe('Generic message');
    });
  });

  describe('configureErrorHandler', () => {
    it('should update configuration', () => {
      configureErrorHandler({ logToConsole: false });
      // Configuration should be updated (tested indirectly through handleError)
      configureErrorHandler({ logToConsole: true }); // Reset
    });
  });
});

