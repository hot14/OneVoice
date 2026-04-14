import { auth } from '../firebase';

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
  // Note: Auth info removed to prevent PII exposure in logs
  userId?: string;
}

// Sanitized error info for logging (no PII)
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  // Extract only safe, non-PII information
  const errorMessage = error instanceof Error ? error.message : String(error);
  const userId = auth.currentUser?.uid;

  const errorInfo: FirestoreErrorInfo = {
    error: errorMessage,
    operationType,
    path,
    userId: userId || undefined, // Only user ID, never email or personal info
  };

  // Log sanitized error info for debugging
  console.error('Firestore Error:', JSON.stringify(errorInfo));

  // Throw user-friendly error message without exposing internal details
  const userMessage = getUserFriendlyErrorMessage(error, operationType);
  throw new Error(userMessage);
}

/**
 * Get user-friendly error message without exposing sensitive details
 */
function getUserFriendlyErrorMessage(error: unknown, operationType: OperationType): string {
  // Firestore error codes
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('permission-denied') || message.includes('permission denied')) {
      return 'You do not have permission to perform this action.';
    }
    if (message.includes('not-found') || message.includes('not found')) {
      return 'The requested data was not found.';
    }
    if (message.includes('quota') || message.includes('exceeded')) {
      return 'Database quota exceeded. Please try again later.';
    }
    if (message.includes('network') || message.includes('offline')) {
      return 'Network error. Please check your connection.';
    }
    if (message.includes('already-exists') || message.includes('already exists')) {
      return 'This data already exists.';
    }
  }

  // Default generic message
  return `Failed to ${operationType} data. Please try again.`;
}

/**
 * Log error for debugging (development only)
 * This should be replaced with proper logging service in production
 */
export function debugLog(message: string, data?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.debug(`[DEBUG] ${message}`, data);
  }
}
