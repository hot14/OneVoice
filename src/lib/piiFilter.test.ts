import { describe, it, expect } from 'vitest';
import { maskPII } from './piiFilter';

describe('piiFilter', () => {
  it('should mask email addresses', () => {
    const input = 'My email is test@example.com';
    const output = maskPII(input);
    expect(output).toBe('My email is [EMAIL]');
  });

  it('should mask phone numbers', () => {
    const input = 'Call me at 010-1234-5678';
    const output = maskPII(input);
    expect(output).toBe('Call me at [PHONE]');
  });

  it('should mask multiple PII types', () => {
    const input = 'Contact test@example.com or 010-1234-5678';
    const output = maskPII(input);
    expect(output).toBe('Contact [EMAIL] or [PHONE]');
  });

  it('should not mask normal text', () => {
    const input = 'Hello world';
    const output = maskPII(input);
    expect(output).toBe('Hello world');
  });
});
