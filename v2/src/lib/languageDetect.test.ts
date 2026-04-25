import { describe, it, expect } from 'vitest';
import { detectLanguage } from './languageDetect';

describe('detectLanguage', () => {
  it('returns ko when text contains Korean characters and ko is a candidate', () => {
    expect(detectLanguage('안녕하세요', ['ko', 'en'])).toBe('ko');
  });

  it('returns jp when text contains hiragana and jp is a candidate', () => {
    expect(detectLanguage('こんにちは', ['jp', 'en'])).toBe('jp');
  });

  it('returns jp when text contains katakana and jp is a candidate', () => {
    expect(detectLanguage('コンニチハ', ['jp', 'en'])).toBe('jp');
  });

  it('returns cn when text contains Chinese characters and cn is a candidate', () => {
    expect(detectLanguage('你好世界', ['cn', 'en'])).toBe('cn');
  });

  it('returns fr when text contains French accented characters and fr is a candidate', () => {
    expect(detectLanguage('Bonjour, voilà un café', ['fr', 'en'])).toBe('fr');
  });

  it('returns de when text contains German umlaut characters and de is a candidate', () => {
    expect(detectLanguage('Schöne Grüße aus München', ['de', 'en'])).toBe('de');
  });

  it('returns first candidate when text contains only basic Latin and no pattern matches', () => {
    expect(detectLanguage('Hello world', ['en', 'fr'])).toBe('en');
  });

  it('returns first candidate when text is empty', () => {
    expect(detectLanguage('', ['en', 'ko'])).toBe('en');
  });

  it('returns the single candidate regardless of text content', () => {
    expect(detectLanguage('Hello world', ['jp'])).toBe('jp');
  });

  it('returns ko when candidates include ko and en and text is Korean', () => {
    expect(detectLanguage('대한민국', ['en', 'ko'])).toBe('ko');
  });

  it('returns jp when candidates include en and jp and text is Japanese', () => {
    expect(detectLanguage('東京へようこそ', ['en', 'jp'])).toBe('jp');
  });

  it('returns first candidate (en) when candidates are empty', () => {
    expect(detectLanguage('hello', [])).toBe('en');
  });
});
