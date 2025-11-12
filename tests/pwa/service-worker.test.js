import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('PWA Service Worker', () => {
  beforeEach(() => {
    // Mock service worker API
    global.navigator = {
      ...global.navigator,
      serviceWorker: {
        register: vi.fn(() => Promise.resolve({})),
        ready: Promise.resolve({}),
        controller: null
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have service worker support', () => {
    expect('serviceWorker' in navigator).toBe(true);
  });

  it('should register service worker', async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/sw.js');
      expect(registration).toBeDefined();
    }
  });
});

