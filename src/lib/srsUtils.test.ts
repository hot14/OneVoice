import { describe, it, expect } from 'vitest';
import { calculateNextReview } from './srsUtils';

describe('srsUtils - SM-2 Algorithm', () => {
  describe('calculateNextReview', () => {
    it('should return correct values for quality 0 (again)', () => {
      const result = calculateNextReview(0, 5, 2.5, 3);
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBe(2.5); // No change on fail
    });

    it('should return correct values for quality 1 (hard)', () => {
      const result = calculateNextReview(1, 5, 2.5, 3);
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });

    it('should return correct values for quality 2 (good) - first repetition', () => {
      const result = calculateNextReview(2, 0, 2.5, 0);
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
    });

    it('should return correct values for quality 2 (good) - second repetition', () => {
      const result = calculateNextReview(2, 1, 2.5, 1);
      expect(result.repetitions).toBe(2);
      expect(result.interval).toBe(6);
    });

    it('should return correct values for quality 2 (good) - third+ repetition', () => {
      const result = calculateNextReview(2, 6, 2.5, 2);
      expect(result.repetitions).toBe(3);
      expect(result.interval).toBe(15); // 6 * 2.5 = 15
    });

    it('should return correct values for quality 3 (easy)', () => {
      const result = calculateNextReview(3, 6, 2.5, 2);
      expect(result.repetitions).toBe(3);
      expect(result.interval).toBe(15); // 6 * 2.5 = 15
    });

    it('should not let ease factor go below 1.3', () => {
      // Repeated failures can decrease EF, but it should never go below 1.3
      const result = calculateNextReview(0, 1, 1.3, 1);
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('should not change ease factor for good quality (2)', () => {
      // For quality 2 (good): EF' = EF + 0
      const result = calculateNextReview(2, 1, 2.5, 1);
      expect(result.easeFactor).toBe(2.5);
    });

    it('should increase ease factor for easy quality (3)', () => {
      // For quality 3 (easy): EF' = EF + 0.1
      const result = calculateNextReview(3, 1, 2.5, 1);
      expect(result.easeFactor).toBe(2.6);
    });

    it('should return nextReviewAt as a Date', () => {
      const result = calculateNextReview(2, 0, 2.5, 0);
      expect(result.nextReviewAt).toBeInstanceOf(Date);
    });

    it('should set nextReviewAt to correct future date', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = calculateNextReview(2, 0, 2.5, 0);

      const expected = new Date(today);
      expected.setDate(expected.getDate() + 1);

      expect(result.nextReviewAt.getTime()).toBe(expected.getTime());
    });
  });
});
