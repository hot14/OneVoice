/**
 * useCancellableRequest - React hook for managing cancellable API requests
 * Provides automatic cleanup on unmount and request cancellation
 */

import { useRef, useCallback, useEffect, useState } from 'react';

export interface CancellableRequest<T> {
  promise: Promise<T | null>;
  cancel: () => void;
  isCancelled: () => boolean;
}

export interface UseCancellableRequestOptions {
  onCancel?: () => void;
}

/**
 * Hook for managing cancellable API requests
 * Automatically cancels pending requests on unmount
 */
export function useCancellableRequest<T>(options?: UseCancellableRequestOptions) {
  const controllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const onCancelRef = useRef(options?.onCancel);

  // Keep onCancel ref up to date
  useEffect(() => {
    onCancelRef.current = options?.onCancel;
  }, [options?.onCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRequest();
    };
  }, []);

  /**
   * Execute a cancellable fetch request
   */
  const fetchWithAbort = useCallback(async (
    url: string,
    init?: RequestInit
  ): Promise<Response | null> => {
    // Cancel any pending request
    cancelRequest();

    // Create new AbortController
    controllerRef.current = new AbortController();
    cancelledRef.current = false;

    try {
      const response = await fetch(url, {
        ...init,
        signal: controllerRef.current.signal,
      });
      return response;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }, []);

  /**
   * Execute a cancellable async function
   */
  const executeCancellable = useCallback(async (
    fn: (signal: AbortSignal) => Promise<T>
  ): Promise<T | null> => {
    // Cancel any pending request
    cancelRequest();

    // Create new AbortController
    controllerRef.current = new AbortController();
    cancelledRef.current = false;

    try {
      const result = await fn(controllerRef.current.signal);
      return result;
    } catch (error: any) {
      if (error?.name === 'AbortError' || cancelledRef.current) {
        return null;
      }
      throw error;
    }
  }, []);

  /**
   * Cancel the current request
   */
  const cancelRequest = useCallback(() => {
    if (controllerRef.current && !cancelledRef.current) {
      controllerRef.current.abort();
      cancelledRef.current = true;
      onCancelRef.current?.();
    }
  }, []);

  /**
   * Check if current request is cancelled
   */
  const isCancelled = useCallback(() => {
    return cancelledRef.current;
  }, []);

  return {
    fetchWithAbort,
    executeCancellable,
    cancelRequest,
    isCancelled,
  };
}

/**
 * usePrevious - Returns the previous value of a variable
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useDebounce - Debounce a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}