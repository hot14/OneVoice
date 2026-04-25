import { normalizePrompt } from "./promptNormalizer";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * SemanticCache provides a mechanism to store and retrieve AI responses
 * based on prompt similarity.
 * 
 * Currently implements Normalized Exact Match. 
 * Phase 2 will add Vector-based Semantic Similarity.
 */
export class SemanticCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private prefix: string = "onevoice_cache") {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          const entry = JSON.parse(localStorage.getItem(key) || "");
          if (entry && entry.expiresAt > Date.now()) {
            const promptKey = key.replace(`${this.prefix}_`, "");
            this.cache.set(promptKey, entry);
          } else {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load cache from localStorage", e);
    }
  }

  private saveToLocalStorage(key: string, entry: CacheEntry<any>) {
    try {
      localStorage.setItem(`${this.prefix}_${key}`, JSON.stringify(entry));
    } catch (e) {
      // If quota exceeded, clear old entries
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        this.clearOldEntries();
      }
    }
  }

  private clearOldEntries() {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    // Remove oldest 20%
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      localStorage.removeItem(`${this.prefix}_${key}`);
    }
  }

  /**
   * Get a cached response for a prompt
   */
  get<T>(prompt: string): T | null {
    const key = normalizePrompt(prompt);
    const entry = this.cache.get(key);

    if (entry) {
      if (entry.expiresAt > Date.now()) {
        return entry.data as T;
      } else {
        this.cache.delete(key);
        localStorage.removeItem(`${this.prefix}_${key}`);
      }
    }
    return null;
  }

  /**
   * Set a response in the cache
   */
  set<T>(prompt: string, data: T, ttl: number = this.DEFAULT_TTL) {
    const key = normalizePrompt(prompt);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };

    this.cache.set(key, entry);
    this.saveToLocalStorage(key, entry);
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    }
  }
}

// Singleton instance
export const semanticCache = new SemanticCache();
