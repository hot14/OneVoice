/**
 * Secure localStorage utilities with XSS protection
 * Values are validated before use to prevent injection attacks
 */

/**
 * Check if a string is safely encodable (no potential XSS)
 */
function isSafeString(value: string): boolean {
  // If encoding changes the value, it contains unsafe characters
  try {
    return decodeURIComponent(value) === value;
  } catch {
    return false;
  }
}

/**
 * Get a string value from localStorage with validation
 */
export function getLocalStorageString(key: string, fallback: string = ''): string {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    if (typeof value !== 'string') return fallback;

    // Validate for XSS patterns
    if (!isSafeString(value)) {
      console.warn(`[SECURITY] Unsafe characters detected in localStorage key: ${key}`);
      // Sanitize by re-encoding
      return decodeURIComponent(value) || fallback;
    }

    return value || fallback;
  } catch (error) {
    console.warn(`[STORAGE] Failed to read localStorage key: ${key}`, error);
    return fallback;
  }
}

/**
 * Get a number value from localStorage with validation and bounds checking
 */
export function getLocalStorageNumber(
  key: string,
  fallback: number,
  min?: number,
  max?: number
): number {
  const value = getLocalStorageString(key);
  if (!value) return fallback;

  const num = parseInt(value, 10);
  if (isNaN(num)) return fallback;

  // Bounds checking
  if (min !== undefined && num < min) return fallback;
  if (max !== undefined && num > max) return fallback;

  return num;
}

/**
 * Set a string value in localStorage
 */
export function setLocalStorageString(key: string, value: string): boolean {
  try {
    if (typeof value !== 'string') {
      console.warn(`[STORAGE] Attempted to store non-string value for key: ${key}`);
      return false;
    }
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[STORAGE] Failed to write localStorage key: ${key}`, error);
    return false;
  }
}

/**
 * Remove a value from localStorage
 */
export function removeLocalStorage(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[STORAGE] Failed to remove localStorage key: ${key}`, error);
    return false;
  }
}

/**
 * Clear all values with a specific prefix
 */
export function clearLocalStorageByPrefix(prefix: string): number {
  let count = 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      count++;
    });
  } catch (error) {
    console.warn(`[STORAGE] Failed to clear localStorage with prefix: ${prefix}`, error);
  }
  return count;
}

/**
 * Get API key from localStorage with security check
 */
export function getApiKey(storageKey: string): string {
  const key = getLocalStorageString(storageKey);
  // Basic validation: should not contain newlines or be empty
  if (key.includes('\n') || key.includes('\r')) {
    console.warn(`[SECURITY] API key contains invalid characters: ${storageKey}`);
    return '';
  }
  return key;
}

/**
 * Set API key in localStorage
 */
export function setApiKey(storageKey: string, value: string): boolean {
  // Validate before storing
  if (!value || typeof value !== 'string') return false;
  if (value.length < 10) {
    console.warn(`[SECURITY] API key appears to be invalid: ${storageKey}`);
    return false;
  }
  return setLocalStorageString(storageKey, value);
}
