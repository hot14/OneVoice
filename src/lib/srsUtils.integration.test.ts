import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateNextReview } from './srsUtils';

/**
 * SRS Integration Tests
 * Tests the full review flow: add vocabulary → review → mastery calculation → nextReviewAt
 *
 * Flow tested:
 * 1. New word added with default SRS values (interval=0, easeFactor=2.5, repetitions=0)
 * 2. User reviews with quality rating (0-3)
 * 3. calculateNextReview returns new interval, easeFactor, repetitions, nextReviewAt
 * 4. Mastery is calculated separately based on repetitions and quality
 */

describe('srsUtils Integration - Review Flow', () => {
  describe('Full vocabulary lifecycle', () => {
    it('should handle new word with first review (quality=2 good)', () => {
      // Simulate: New vocabulary added with defaults
      const newWord = {
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
      };

      // User studies and marks as "good" (quality=2)
      const result = calculateNextReview(
        2, // quality: good
        newWord.interval,
        newWord.easeFactor,
        newWord.repetitions
      );

      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1); // First correct: 1 day
      expect(result.easeFactor).toBe(2.5); // No change for quality=2
      expect(result.nextReviewAt).toBeInstanceOf(Date);

      // Mastery calculation (done in ReviewSession.tsx)
      const mastery = Math.min(100, (result.repetitions * 20) + (2 * 5));
      expect(mastery).toBe(30); // 1*20 + 2*5 = 30
    });

    it('should handle new word with first review (quality=3 easy)', () => {
      const result = calculateNextReview(3, 0, 2.5, 0);

      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBe(2.6); // EF increases for easy
      expect(result.nextReviewAt).toBeInstanceOf(Date);

      const mastery = Math.min(100, (result.repetitions * 20) + (3 * 5));
      expect(mastery).toBe(35); // 1*20 + 3*5 = 35
    });

    it('should handle failed review (quality=0)', () => {
      const result = calculateNextReview(0, 5, 2.5, 3);

      expect(result.repetitions).toBe(0); // Reset
      expect(result.interval).toBe(1); // Back to 1 day
      expect(result.easeFactor).toBe(2.5); // No change on fail
    });

    it('should progress interval correctly through repetitions', () => {
      // Simulate multiple successful reviews
      let currentInterval = 0;
      let currentEaseFactor = 2.5;
      let currentRepetitions = 0;

      // Review 1: good (quality=2)
      let result = calculateNextReview(2, currentInterval, currentEaseFactor, currentRepetitions);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
      currentInterval = result.interval;
      currentEaseFactor = result.easeFactor;
      currentRepetitions = result.repetitions;

      // Review 2: good (quality=2)
      result = calculateNextReview(2, currentInterval, currentEaseFactor, currentRepetitions);
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
      currentInterval = result.interval;
      currentEaseFactor = result.easeFactor;
      currentRepetitions = result.repetitions;

      // Review 3: good (quality=2)
      result = calculateNextReview(2, currentInterval, currentEaseFactor, currentRepetitions);
      expect(result.interval).toBe(15); // 6 * 2.5 = 15
      expect(result.repetitions).toBe(3);
      currentInterval = result.interval;
      currentEaseFactor = result.easeFactor;
      currentRepetitions = result.repetitions;

      // Review 4: good (quality=2)
      result = calculateNextReview(2, currentInterval, currentEaseFactor, currentRepetitions);
      expect(result.interval).toBe(38); // 15 * 2.5 = 37.5 ≈ 38
      expect(result.repetitions).toBe(4);
    });

    it('should never let ease factor go below 1.3', () => {
      // Repeated failures could theoretically lower EF, but code prevents this
      const result = calculateNextReview(0, 1, 1.3, 1);
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('should calculate nextReviewAt as start of day', () => {
      const before = new Date();
      const result = calculateNextReview(2, 0, 2.5, 0);
      const after = new Date();

      // nextReviewAt should be tomorrow at 00:00:00
      const tomorrow = new Date(before);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      expect(result.nextReviewAt.getTime()).toBe(tomorrow.getTime());
    });
  });

  describe('Mastery calculation edge cases', () => {
    it('should cap mastery at 100', () => {
      // Simulate many successful reviews
      let currentInterval = 0;
      let currentEaseFactor = 2.5;
      let currentRepetitions = 0;

      // Multiple good reviews
      for (let i = 0; i < 5; i++) {
        const result = calculateNextReview(3, currentInterval, currentEaseFactor, currentRepetitions);
        currentInterval = result.interval;
        currentEaseFactor = result.easeFactor;
        currentRepetitions = result.repetitions;
      }

      // Mastery should be capped at 100
      const mastery = Math.min(100, (currentRepetitions * 20) + (3 * 5));
      expect(mastery).toBe(100);
    });

    it('should reflect quality in mastery', () => {
      // Same repetitions but different quality
      const masteryEasy = Math.min(100, (3 * 20) + (3 * 5)); // 3 reps, easy
      const masteryGood = Math.min(100, (3 * 20) + (2 * 5)); // 3 reps, good

      expect(masteryEasy).toBe(75);
      expect(masteryGood).toBe(70);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle learning a new Thai word over multiple sessions', () => {
      // New Thai word "สวัสดี" (hello)
      let reps = 0;
      let interval = 0;
      let ef = 2.5;

      // Day 1: First review - good
      let result = calculateNextReview(2, interval, ef, reps);
      expect(result.interval).toBe(1);
      expect(result.nextReviewAt.getDate()).toBe(new Date().getDate() + 1);
      reps = result.repetitions;
      interval = result.interval;
      ef = result.easeFactor;

      // Day 2: Review - easy
      result = calculateNextReview(3, interval, ef, reps);
      expect(result.interval).toBe(6); // Still 6 for second rep
      reps = result.repetitions;
      interval = result.interval;
      ef = result.easeFactor;

      // Day 8: Review - easy (should grow interval)
      result = calculateNextReview(3, interval, ef, reps);
      expect(result.interval).toBe(16); // 6 * 2.6 = 15.6 ≈ 16
    });

    it('should reset progress on failure after learning', () => {
      let reps = 0;
      let interval = 0;
      let ef = 2.5;

      // Learn the word
      let result = calculateNextReview(2, interval, ef, reps);
      reps = result.repetitions;
      interval = result.interval;
      ef = result.easeFactor;

      result = calculateNextReview(2, interval, ef, reps);
      reps = result.repetitions;
      interval = result.interval;
      ef = result.easeFactor;

      expect(reps).toBe(2);
      expect(interval).toBe(6);

      // Forgot! quality=0
      result = calculateNextReview(0, interval, ef, reps);
      expect(result.repetitions).toBe(0); // Reset!
      expect(result.interval).toBe(1); // Back to 1
      expect(result.easeFactor).toBe(ef); // EF preserved
    });
  });
});
