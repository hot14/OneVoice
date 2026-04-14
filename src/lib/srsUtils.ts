export interface SRSData {
  mastery: number;
  interval: number;
  easeFactor: number;
  nextReviewAt: Date;
  lastReviewedAt: Date;
}

/**
 * SuperMemo-2 (SM-2) algorithm implementation
 * @param quality 0 (again), 1 (hard), 2 (good), 3 (easy)
 * @param currentInterval Current interval in days
 * @param currentEaseFactor Current ease factor (default 2.5)
 * @param currentRepetitions Current number of successful repetitions
 * @returns Updated interval, ease factor, and repetitions
 */
export function calculateNextReview(
  quality: number,
  currentInterval: number,
  currentEaseFactor: number,
  currentRepetitions: number
) {
  let nextInterval: number;
  let nextEaseFactor: number;
  let nextRepetitions: number;

  if (quality >= 2) { // Correct response
    if (currentRepetitions === 0) {
      nextInterval = 1;
    } else if (currentRepetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(currentInterval * currentEaseFactor);
    }
    nextRepetitions = currentRepetitions + 1;
    // Update ease factor: EF' = EF + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02))
    // We adjust the quality scale from 0-3 to SM-2's 0-5 scale if needed, 
    // but here we use a simplified adjustment.
    nextEaseFactor = currentEaseFactor + (0.1 - (3 - quality) * 0.1);
  } else { // Incorrect response
    nextRepetitions = 0;
    nextInterval = 1;
    nextEaseFactor = currentEaseFactor;
  }

  if (nextEaseFactor < 1.3) nextEaseFactor = 1.3;

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + nextInterval);
  nextReviewAt.setHours(0, 0, 0, 0); // Set to start of day

  return {
    interval: nextInterval,
    easeFactor: nextEaseFactor,
    repetitions: nextRepetitions,
    nextReviewAt,
  };
}
