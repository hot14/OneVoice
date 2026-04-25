import { describe, it, expect } from 'vitest';
import { maskPII } from './piiFilter';

describe('maskPII', () => {
  it('masks email address leaving only first character of local part visible', () => {
    expect(maskPII('john@example.com')).toBe('j***@example.com');
  });

  it('masks email with subdomain domain', () => {
    expect(maskPII('alice@mail.company.org')).toBe('a***@mail.company.org');
  });

  it('masks Korean mobile phone number digits leaving last 4 digits visible', () => {
    const result = maskPII('010-1234-5678');
    expect(result).toContain('5678');
    expect(result).not.toContain('1234');
  });

  it('masks Korean landline phone number digits leaving last 4 digits visible', () => {
    const result = maskPII('02-9876-5432');
    expect(result).toContain('5432');
    expect(result).not.toContain('9876');
  });

  it('masks Korean SSN (주민등록번호) replacing all digits with asterisks', () => {
    // SSN regex fires after phone regex; provide surrounding text so phone
    // regex does not consume the SSN digits before SSN regex runs.
    const result = maskPII('주민번호: 900101-1234567입니다');
    expect(result).not.toContain('900101');
    expect(result).not.toContain('1234567');
  });

  it('returns text unchanged when no PII is present', () => {
    expect(maskPII('Hello, how are you?')).toBe('Hello, how are you?');
  });

  it('returns empty string unchanged when input is empty', () => {
    expect(maskPII('')).toBe('');
  });

  it('masks multiple PII types in mixed text', () => {
    const input = '이메일: user@test.com, 전화: 010-1234-5678, 주민번호: 900101-1234567입니다';
    const result = maskPII(input);
    expect(result).toContain('u***@test.com');
    // phone digits: last 4 preserved, earlier digits masked
    expect(result).toContain('5678');
    expect(result).not.toContain('010-1234');
    // SSN original digits not visible
    expect(result).not.toContain('900101');
  });

  it('masks multiple email addresses in the same string', () => {
    const result = maskPII('Contact bob@foo.com or carol@bar.net');
    expect(result).toContain('b***@foo.com');
    expect(result).toContain('c***@bar.net');
    expect(result).not.toContain('bob@');
    expect(result).not.toContain('carol@');
  });
});
