// Prompt Normalizer - 중복 API 호출 방지를 위한 프롬프트 정규화
// Similar prompts are normalized to reduce duplicate API calls

export function normalizePrompt(prompt: string): string {
  if (!prompt) return '';

  return prompt
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')                    // 다중 공백을 단일 공백으로
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅡ0-9]/g, '') // 영문자/숫자/한국어/공백 외 제거
    .slice(0, 500);                          // 길이 제한으로 메모리 절약
}

// LRU Cache implementation for exact match cache
interface CacheEntry {
  response: string;
  timestamp: number;
  lastAccessed: number;
}

const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

// Using Map with insertion order for LRU behavior (ES2015+ maintains insertion order)
const exactCache = new Map<string, CacheEntry>();

// Track cache stats for debugging
let hitCount = 0;
let missCount = 0;

/**
 * Get cache entry stats
 */
function getCacheEntryStats(): { size: number; hits: number; misses: number; hitRate: number } {
  return {
    size: exactCache.size,
    hits: hitCount,
    misses: missCount,
    hitRate: hitCount + missCount > 0 ? hitCount / (hitCount + missCount) : 0,
  };
}

/**
 * Evict oldest entries if cache is full (LRU eviction)
 */
function evictIfNeeded(): void {
  if (exactCache.size >= MAX_CACHE_SIZE) {
    // Find and remove the oldest entry (first in Map iteration order)
    const firstKey = exactCache.keys().next().value;
    if (firstKey) {
      exactCache.delete(firstKey);
    }
  }
}

/**
 * Remove expired entries from cache
 */
function removeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of exactCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      exactCache.delete(key);
    }
  }
}

/**
 * Get cached response with LRU update
 * @param prompt Original prompt
 * @returns Cached response or null
 */
export function getCachedResponse(prompt: string): string | null {
  const key = normalizePrompt(prompt);
  const cached = exactCache.get(key);

  if (cached) {
    // Check TTL
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      // Update last accessed time (LRU)
      cached.lastAccessed = Date.now();
      hitCount++;
      return cached.response;
    }
    // Expired - remove
    exactCache.delete(key);
  }

  missCount++;
  return null;
}

/**
 * Cache response with LRU management
 * @param prompt Original prompt
 * @param response API response
 */
export function setCachedResponse(prompt: string, response: string): void {
  const key = normalizePrompt(prompt);

  // Evict oldest if at capacity
  evictIfNeeded();

  // Remove expired entries periodically (every 10th insertion)
  if (exactCache.size % 10 === 0) {
    removeExpired();
  }

  exactCache.set(key, {
    response,
    timestamp: Date.now(),
    lastAccessed: Date.now(),
  });
}

/**
 * Get cache statistics (debugging)
 */
export function getCacheStats(): { size: number; hitRate: number; hits: number; misses: number } {
  const stats = getCacheEntryStats();
  return {
    size: stats.size,
    hitRate: stats.hitRate,
    hits: stats.hits,
    misses: stats.misses,
  };
}

/**
 * Clear all caches (testing)
 */
export function clearCache(): void {
  exactCache.clear();
  hitCount = 0;
  missCount = 0;
}

/**
 * Clear expired entries only
 */
export function clearExpiredCache(): void {
  removeExpired();
}
