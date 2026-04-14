// Prompt Normalizer - 중복 API 호출 방지를 위한 프롬프트 정규화
// Similar prompts are normalized to reduce duplicate API calls

export function normalizePrompt(prompt: string): string {
  if (!prompt) return '';

  return prompt
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')                    // 다중 공백을 단일 공백으로
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅡ0-9]/g, '') // 영문자/숫자/한국어/공백 외 제거
    .slice(0, 500);                          // 길이 제한으로 메모리 절약
}

// 정확 일치 캐시 (24시간 TTL)
const exactCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

/**
 * 정규화된 프롬프트 키를 사용하여 캐시된 응답을 반환
 * @param prompt 원본 프롬프트
 * @returns 캐시된 응답 또는 null
 */
export function getCachedResponse(prompt: string): string | null {
  const key = normalizePrompt(prompt);
  const cached = exactCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.response;
  }

  // 만료된 캐시 제거
  if (cached) {
    exactCache.delete(key);
  }

  return null;
}

/**
 * 정규화된 프롬프트 키를 사용하여 응답을 캐시
 * @param prompt 원본 프롬프트
 * @param response API 응답
 */
export function setCachedResponse(prompt: string, response: string): void {
  const key = normalizePrompt(prompt);

  // 캐시 크기 제한 (메모리 절약)
  if (exactCache.size >= 500) {
    // 가장 오래된 항목 제거
    const oldestKey = exactCache.keys().next().value;
    if (oldestKey) {
      exactCache.delete(oldestKey);
    }
  }

  exactCache.set(key, { response, timestamp: Date.now() });
}

/**
 * 캐시 히트율 통계 반환 (디버깅용)
 */
export function getCacheStats(): { size: number; hitRate: number } {
  return {
    size: exactCache.size,
    hitRate: 0, // 실제로는 히트/미스 추적이 필요
  };
}

/**
 * 모든 캐시 초기화 (테스트용)
 */
export function clearCache(): void {
  exactCache.clear();
}
