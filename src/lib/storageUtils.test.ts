/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getLocalStorageString,
  getLocalStorageNumber,
  setLocalStorageString,
  removeLocalStorage,
  clearLocalStorageByPrefix,
  getApiKey,
  setApiKey,
} from './storageUtils';

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('storageUtils', () => {
  const TEST_KEY = 'test_storage_key';
  const PREFIX = 'test_prefix_';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getLocalStorageString', () => {
    it('should return empty string for non-existent key', () => {
      expect(getLocalStorageString('nonexistent')).toBe('');
    });

    it('should return fallback for non-existent key', () => {
      expect(getLocalStorageString('nonexistent', 'fallback')).toBe('fallback');
    });

    it('should return stored value', () => {
      localStorage.setItem(TEST_KEY, 'hello');
      expect(getLocalStorageString(TEST_KEY)).toBe('hello');
    });

    it('should handle XSS attempts', () => {
      const xssValue = '<script>alert(1)</script>';
      localStorage.setItem(TEST_KEY, xssValue);
      const result = getLocalStorageString(TEST_KEY);
      expect(result).toBeDefined();
    });
  });

  describe('getLocalStorageNumber', () => {
    it('should return fallback for non-existent key', () => {
      expect(getLocalStorageNumber('nonexistent', 42)).toBe(42);
    });

    it('should return stored number', () => {
      localStorage.setItem(TEST_KEY, '123');
      expect(getLocalStorageNumber(TEST_KEY, 0)).toBe(123);
    });

    it('should return fallback for invalid number', () => {
      localStorage.setItem(TEST_KEY, 'abc');
      expect(getLocalStorageNumber(TEST_KEY, 0)).toBe(0);
    });

    it('should enforce minimum bound', () => {
      localStorage.setItem(TEST_KEY, '5');
      expect(getLocalStorageNumber(TEST_KEY, 10, 10, 100)).toBe(10);
    });

    it('should enforce maximum bound', () => {
      localStorage.setItem(TEST_KEY, '150');
      expect(getLocalStorageNumber(TEST_KEY, 50, 10, 100)).toBe(50);
    });
  });

  describe('setLocalStorageString', () => {
    it('should store string value', () => {
      setLocalStorageString(TEST_KEY, 'hello');
      expect(localStorage.getItem(TEST_KEY)).toBe('hello');
    });

    it('should return true on success', () => {
      expect(setLocalStorageString(TEST_KEY, 'value')).toBe(true);
    });

    it('should return false for non-string', () => {
      expect(setLocalStorageString(TEST_KEY, 123 as any)).toBe(false);
    });
  });

  describe('removeLocalStorage', () => {
    it('should remove value', () => {
      localStorage.setItem(TEST_KEY, 'hello');
      removeLocalStorage(TEST_KEY);
      expect(localStorage.getItem(TEST_KEY)).toBeNull();
    });
  });

  describe('clearLocalStorageByPrefix', () => {
    it('should clear all values with prefix', () => {
      localStorage.setItem(`${PREFIX}1`, 'a');
      localStorage.setItem(`${PREFIX}2`, 'b');
      localStorage.setItem('other', 'c');
      const count = clearLocalStorageByPrefix(PREFIX);
      expect(count).toBe(2);
      expect(localStorage.getItem(`${PREFIX}1`)).toBeNull();
      expect(localStorage.getItem(`${PREFIX}2`)).toBeNull();
      expect(localStorage.getItem('other')).toBe('c');
    });
  });

  describe('getApiKey / setApiKey', () => {
    const API_KEY = 'sk-test1234567890abcdef';

    it('should store and retrieve API key', () => {
      setApiKey(TEST_KEY, API_KEY);
      expect(getApiKey(TEST_KEY)).toBe(API_KEY);
    });

    it('should return empty for invalid API key (too short)', () => {
      expect(setApiKey(TEST_KEY, 'short')).toBe(false);
      expect(getApiKey(TEST_KEY)).toBe('');
    });

    it('should reject empty API key', () => {
      expect(setApiKey(TEST_KEY, '')).toBe(false);
    });
  });
});
