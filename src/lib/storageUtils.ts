/**
 * Utility for reading numbers from local storage with fallback and range validation.
 */
export function getLocalStorageNumber(
  key: string,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  
  const parsed = parseInt(stored, 10);
  if (isNaN(parsed)) return defaultValue;
  
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  
  return parsed;
}

/**
 * Utility for reading strings from local storage with fallback.
 */
export function getLocalStorageString(key: string, defaultValue: string): string {
  const stored = localStorage.getItem(key);
  return stored !== null ? stored : defaultValue;
}
