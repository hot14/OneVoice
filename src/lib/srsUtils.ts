/**
 * SM-2 Spaced Repetition Algorithm
 * 
 * quality: 0 (Again), 1 (Hard), 2 (Good), 3 (Easy)
 */
export function calculateNextReview(
  quality: number,
  prevInterval: number,
  prevEaseFactor: number,
  prevRepetitions: number
) {
  let interval: number;
  let easeFactor: number;
  let repetitions: number;

  if (quality >= 2) { // Correct response
    if (prevRepetitions === 0) {
      interval = 1;
    } else if (prevRepetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(prevInterval * prevEaseFactor);
    }
    repetitions = prevRepetitions + 1;
    easeFactor = prevEaseFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
  } else { // Incorrect response
    repetitions = 0;
    interval = 1;
    easeFactor = prevEaseFactor;
  }

  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return {
    interval,
    easeFactor,
    repetitions,
    nextReviewAt
  };
}
