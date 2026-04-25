/**
 * Proficiency Rubric for Language Learning
 * Standardizes the evaluation of user level from 1 to 10.
 */

export interface LevelDefinition {
  level: number;
  title: string;
  description: string;
  milestones: string[];
}

export const PROFICIENCY_RUBRIC: Record<number, LevelDefinition> = {
  1: {
    level: 1,
    title: "Absolute Beginner",
    description: "Can understand and use very basic everyday expressions and simple phrases.",
    milestones: ["Greetings", "Basic self-introduction", "Numbers 1-100"]
  },
  2: {
    level: 2,
    title: "Beginner",
    description: "Can understand sentences and frequently used expressions related to areas of most immediate relevance.",
    milestones: ["Family information", "Local geography", "Employment basics"]
  },
  3: {
    level: 3,
    title: "Upper Beginner",
    description: "Can communicate in simple and routine tasks requiring a simple and direct exchange of information.",
    milestones: ["Daily routines", "Shopping", "Basic past tense"]
  },
  4: {
    level: 4,
    title: "Pre-Intermediate",
    description: "Can deal with most situations likely to arise while travelling in an area where the language is spoken.",
    milestones: ["Travel situations", "Future plans", "Expressing opinions simply"]
  },
  5: {
    level: 5,
    title: "Intermediate",
    description: "Can produce simple connected text on topics which are familiar or of personal interest.",
    milestones: ["Describing experiences", "Dreams and ambitions", "Briefly giving reasons"]
  },
  6: {
    level: 6,
    title: "Upper Intermediate",
    description: "Can understand the main ideas of complex text on both concrete and abstract topics.",
    milestones: ["Technical discussions in field of specialization", "Spontaneous interaction", "Clear, detailed text"]
  },
  7: {
    level: 7,
    title: "Pre-Advanced",
    description: "Can express ideas fluently and spontaneously without much obvious searching for expressions.",
    milestones: ["Flexible use of language", "Social/professional purposes", "Complex subjects"]
  },
  8: {
    level: 8,
    title: "Advanced",
    description: "Can understand a wide range of demanding, longer texts, and recognize implicit meaning.",
    milestones: ["Nuanced expression", "Implicit meaning recognition", "Well-structured text"]
  },
  9: {
    level: 9,
    title: "Upper Advanced",
    description: "Can express him/herself spontaneously, very fluently and precisely, differentiating finer shades of meaning.",
    milestones: ["Idiomatic expressions", "Colloquialisms", "Near-native precision"]
  },
  10: {
    level: 10,
    title: "Master",
    description: "Can understand with ease virtually everything heard or read.",
    milestones: ["Summarizing information from different sources", "Reconstructing arguments", "Spontaneous, fluent, precise expression"]
  }
};

/**
 * Calculates the new level based on current level and diagnosed level from a session.
 * Uses a weighted average to prevent sudden jumps.
 */
export function calculateNewLevel(currentLevel: number, diagnosedLevel: number): number {
  if (currentLevel === 0) return diagnosedLevel;
  
  // Weighted average: 80% current, 20% new session
  const newLevel = (currentLevel * 0.8) + (diagnosedLevel * 0.2);
  
  // Round to 1 decimal place
  return Math.round(newLevel * 10) / 10;
}

/**
 * Gets the title for a given level
 */
export function getLevelTitle(level: number): string {
  const roundedLevel = Math.floor(level);
  return PROFICIENCY_RUBRIC[roundedLevel]?.title || "Unknown";
}
