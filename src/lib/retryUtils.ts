/**
 * Retry utility with circuit breaker pattern
 * Provides exponential backoff retry logic for unstable operations
 */

import { debug, warn, error as loggerError } from './logger';

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'closed',     // Normal operation, retries allowed
  OPEN = 'open',         // Circuit is open, fail fast
  HALF_OPEN = 'half_open', // Testing if service recovered
}

// Circuit breaker configuration
interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening circuit
  successThreshold: number;    // Successes needed to close circuit (half-open → closed)
  timeout: number;             // Time in ms before trying half-open
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
};

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime >= this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
        debug('Circuit breaker: OPEN → HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN - operation rejected');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        debug('Circuit breaker: HALF_OPEN → CLOSED');
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Immediately open circuit on failure in half-open state
      this.state = CircuitState.OPEN;
      this.successCount = 0;
      warn('Circuit breaker: HALF_OPEN → OPEN (failed while testing)');
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      warn(`Circuit breaker: CLOSED → OPEN (${this.failureCount} failures)`);
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

// Global circuit breaker for Firestore operations
export const firestoreCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
});

// Retry configuration
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
};

// Common retryable error patterns
const RETRYABLE_ERROR_PATTERNS = [
  'network',
  'offline',
  'timeout',
  'quota',
  'exceeded',
  'too-many-requests',
  'RESOURCE_EXHAUSTED',
  'UNAVAILABLE',
  'DEADLINE_EXCEEDED',
];

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const message = String(error.message || error).toLowerCase();
  return RETRYABLE_ERROR_PATTERNS.some(pattern => message.includes(pattern.toLowerCase()));
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName = 'operation'
): Promise<T> {
  const { maxAttempts, initialDelayMs, maxDelayMs, backoffMultiplier, shouldRetry } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const isRetryable = shouldRetry 
        ? shouldRetry(error) 
        : isRetryableError(error);

      if (!isRetryable || attempt === maxAttempts) {
        loggerError(`${operationName} failed after ${attempt} attempts:`, lastError.message);
        throw lastError;
      }

      warn(`${operationName} attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`);
      
      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Retry a function with circuit breaker and exponential backoff
 */
export async function withCircuitBreakerRetry<T>(
  fn: () => Promise<T>,
  operationName = 'operation',
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  return firestoreCircuitBreaker.execute(() => withRetry(fn, retryConfig, operationName));
}

/**
 * Create an AbortController wrapper for request cancellation
 */
export interface CancellablePromise<T> {
  promise: Promise<T>;
  cancel: () => void;
  isCancelled: () => boolean;
}

export function withCancellation<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  operationName = 'operation'
): CancellablePromise<T> {
  const controller = new AbortController();
  let cancelled = false;

  const promise = fn(controller.signal).catch(error => {
    if (error.name === 'AbortError') {
      debug(`${operationName} was cancelled`);
      cancelled = true;
      return null as T;
    }
    throw error;
  });

  return {
    promise,
    cancel: () => {
      if (!cancelled) {
        debug(`${operationName} cancellation requested`);
        controller.abort();
      }
    },
    isCancelled: () => cancelled,
  };
}

/**
 * Batch multiple promises with concurrency limit
 */
export async function batchPromises<T>(
  items: T[],
  fn: (item: T, index: number) => Promise<any>,
  { concurrency = 5, signal }: { concurrency?: number; signal?: AbortSignal } = {}
): Promise<any[]> {
  const results: any[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) {
      throw new Error('Operation aborted');
    }

    const item = items[i];
    const promise = fn(item, i).then(result => {
      results[i] = result;
    });

    if (concurrency > 0) {
      executing.push(promise);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex(p => p === promise),
          1
        );
      }
    } else {
      await promise;
    }
  }

  await Promise.all(executing);
  return results;
}