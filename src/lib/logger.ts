const IS_DEV = import.meta.env.DEV;

export const debug = (...args: any[]) => {
  if (IS_DEV) {
    console.log('[DEBUG]', ...args);
  }
};

export const info = (...args: any[]) => {
  console.info('[INFO]', ...args);
};

export const warn = (...args: any[]) => {
  console.warn('[WARN]', ...args);
};

export const error = (...args: any[]) => {
  // In production, we might want to send this to an error tracking service
  console.error('[ERROR]', ...args);
};

export const maskValue = (val: string) => {
  if (!val) return '';
  if (val.length <= 8) return '********';
  return val.slice(0, 4) + '...' + val.slice(-4);
};
