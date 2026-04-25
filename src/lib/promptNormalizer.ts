/**
 * Normalizes prompts for consistent caching.
 */
export function normalizePrompt(prompt: string): string {
  if (!prompt) return "";
  
  return prompt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[^\w\s\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF]/g, ""); // Keep alphanumeric and Korean
}
