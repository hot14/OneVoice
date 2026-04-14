/**
 * Production-safe logging utility
 * Only logs in development mode or when explicitly enabled
 */

const isDev = import.meta.env.DEV;
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || (isDev ? 'debug' : 'error');

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL as LogLevel] || isDev;
}

export function debug(...args: unknown[]) {
  if (shouldLog('debug')) {
    console.debug('[DEBUG]', ...args);
  }
}

export function info(...args: unknown[]) {
  if (shouldLog('info')) {
    console.info('[INFO]', ...args);
  }
}

export function warn(...args: unknown[]) {
  if (shouldLog('warn')) {
    console.warn('[WARN]', ...args);
  }
}

export function error(...args: unknown[]) {
  if (shouldLog('error')) {
    console.error('[ERROR]', ...args);
  }
}

// Re-export for backward compatibility during migration
export const logger = {
  debug,
  info,
  warn,
  error,
};
