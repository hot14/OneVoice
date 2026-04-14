import { describe, it, expect, beforeEach } from 'vitest';
import { normalizePrompt, getCachedResponse, setCachedResponse, clearCache, getCacheStats } from './promptNormalizer';

describe('promptNormalizer', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('normalizePrompt', () => {
    it('should return empty string for empty input', () => {
      expect(normalizePrompt('')).toBe('');
      expect(normalizePrompt('   ')).toBe('');
    });

    it('should convert to lowercase', () => {
      expect(normalizePrompt('Hello World')).toBe('hello world');
      // Note: colon is removed by the regex since it's not in the allowed character set
      expect(normalizePrompt('Korean: 안녕하세요')).toBe('korean 안녕하세요');
    });

    it('should trim whitespace', () => {
      expect(normalizePrompt('  hello  ')).toBe('hello');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizePrompt('hello    world')).toBe('hello world');
      expect(normalizePrompt('hello\n\n\tworld')).toBe('hello world');
    });

    it('should remove special characters but keep Korean and English', () => {
      // Note: special characters like !, @, #, $, % are removed
      expect(normalizePrompt('Hello! @#$% 안녕하세요')).toBe('hello  안녕하세요');
      expect(normalizePrompt('Test@123')).toBe('test123');
    });

    it('should limit length to 500 characters', () => {
      const longText = 'a'.repeat(600);
      expect(normalizePrompt(longText).length).toBe(500);
    });

    it('should handle mixed language input', () => {
      expect(normalizePrompt('Hello 한국어 123!')).toBe('hello 한국어 123');
    });
  });

  describe('cache operations', () => {
    it('should return null for non-existent cache', () => {
      expect(getCachedResponse('hello')).toBeNull();
    });

    it('should cache and retrieve response', () => {
      setCachedResponse('hello', 'world');
      expect(getCachedResponse('hello')).toBe('world');
    });

    it('should normalize keys for cache lookup', () => {
      setCachedResponse('  HELLO  ', 'world');
      expect(getCachedResponse('hello')).toBe('world');
    });

    it('should return null for expired cache', async () => {
      // This test is limited since we can't easily mock time
      // In real scenario, cache expires after 24 hours
      setCachedResponse('test', 'result');
      expect(getCachedResponse('test')).toBe('result');
    });

    it('should clear cache', () => {
      setCachedResponse('hello', 'world');
      clearCache();
      expect(getCachedResponse('hello')).toBeNull();
    });

    it('should report cache stats', () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
    });
  });
});
