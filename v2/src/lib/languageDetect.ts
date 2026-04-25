const LANGUAGE_PATTERNS: Record<string, RegExp> = {
  ko: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/,
  jp: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/,
  cn: /[\u4E00-\u9FFF\u3400-\u4DBF]/,
  ar: /[\u0600-\u06FF]/,
  fr: /[àâäéèêëîïôùûüÿæœçÀÂÄÉÈÊËÎÏÔÙÛÜŸÆŒÇ]/,
  de: /[äöüßÄÖÜ]/,
  es: /[áéíóúñüÁÉÍÓÚÑÜ¿¡]/,
};

const SCRIPT_PRIORITY = ['ko', 'jp', 'cn', 'ar'];

export function detectLanguage(text: string, candidates: string[]): string {
  if (!text || candidates.length === 0) return candidates[0] ?? 'en';
  if (candidates.length === 1) return candidates[0];

  for (const lang of SCRIPT_PRIORITY) {
    if (!candidates.includes(lang)) continue;
    const pattern = LANGUAGE_PATTERNS[lang];
    if (pattern && pattern.test(text)) return lang;
  }

  for (const lang of candidates) {
    if (SCRIPT_PRIORITY.includes(lang)) continue;
    const pattern = LANGUAGE_PATTERNS[lang];
    if (pattern && pattern.test(text)) return lang;
  }

  return candidates[0];
}
