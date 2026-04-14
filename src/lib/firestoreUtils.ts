import { auth } from '../firebase';
import { withCircuitBreakerRetry, isRetryableError } from './retryUtils';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  userId?: string;
}

// Firestore error codes that are retryable
const RETRYABLE_FIRESTORE_CODES = [
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'too-many-requests',
];

// Sanitized error info for logging (no PII)
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const userId = auth.currentUser?.uid;

  const errorInfo: FirestoreErrorInfo = {
    error: errorMessage,
    operationType,
    path,
    userId: userId || undefined,
  };

  console.error('Firestore Error:', JSON.stringify(errorInfo));

  const userMessage = getUserFriendlyErrorMessage(error, operationType);
  throw new Error(userMessage);
}

/**
 * Get user-friendly error message without exposing sensitive details
 */
function getUserFriendlyErrorMessage(error: unknown, operationType: OperationType): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const code = (error as any)?.code?.toLowerCase?.() || '';

    if (message.includes('permission-denied') || code.includes('permission-denied')) {
      return 'You do not have permission to perform this action.';
    }
    if (message.includes('not-found') || code.includes('not-found')) {
      return 'The requested data was not found.';
    }
    if (message.includes('quota') || message.includes('exceeded') || code.includes('quota')) {
      return 'Database quota exceeded. Please try again later.';
    }
    if (message.includes('network') || message.includes('offline')) {
      return 'Network error. Please check your connection.';
    }
    if (message.includes('already-exists') || code.includes('already-exists')) {
      return 'This data already exists.';
    }
  }

  return `Failed to ${operationType} data. Please try again.`;
}

/**
 * Execute a Firestore operation with retry and circuit breaker
 */
export async function withFirestoreRetry<T>(
  operation: () => Promise<T>,
  operationType: OperationType,
  path: string
): Promise<T> {
  return withCircuitBreakerRetry(operation, `Firestore ${operationType}: ${path}`, {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    shouldRetry: (error) => {
      const code = (error as any)?.code || '';
      return RETRYABLE_FIRESTORE_CODES.some(rc => code.includes(rc)) || isRetryableError(error);
    },
  });
}

/**
 * Log error for debugging (development only)
 */
export function debugLog(message: string, data?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.debug(`[DEBUG] ${message}`, data);
  }
}
