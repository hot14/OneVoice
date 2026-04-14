// Semantic Cache - 의미적으로 유사한 쿼리에 대한 API 응답 캐싱
// EmbeddingGemma를 활용하여 시맨틱 유사도 기반 캐시 히트
// Cosine similarity threshold: 0.92 (0.85-0.95 recommended)

import { pipeline, FeatureExtractionPipeline } from '@huggingface/transformers';
import { getCachedResponse, setCachedResponse, normalizePrompt } from './promptNormalizer';
import { debug, warn } from './logger';

// 시맨틱 캐시 설정
const SEMANTIC_THRESHOLD = 0.92;          // Cosine similarity threshold
const MAX_SEMANTIC_CACHE_SIZE = 100;     // 캐시 크기 제한 (메모리 절약)
const SEMANTIC_CACHE_TTL_MS = 60 * 60 * 1000; // 1시간 TTL

interface SemanticCacheItem {
  embedding: number[];
  response: string;
  prompt: string;
  timestamp: number;
}

// 시맨틱 캐시 저장소
const semanticCache: SemanticCacheItem[] = [];

// EmbeddingGemma 모델 인스턴스 (Singleton)
let embedder: FeatureExtractionPipeline | null = null;
let modelLoadingPromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * EmbeddingGemma 모델을 얻음 (Singleton 패턴)
 * WebGPU 가용성 자동 체크
 */
async function getEmbedder(): Promise<FeatureExtractionPipeline | null> {
  // 이미 로드됨
  if (embedder) return embedder;

  // 현재 로딩 중
  if (modelLoadingPromise) return modelLoadingPromise;

  // WebGPU 가용성 체크
  if (typeof navigator !== 'undefined' && !(navigator as any).gpu) {
    debug("WebGPU not available - semantic cache disabled");
    return null;
  }

  modelLoadingPromise = (async () => {
    try {
      debug("Loading EmbeddingGemma for semantic cache...");
      const model = await pipeline('feature-extraction', 'Xenova/embedding-gemma', {
        device: 'webgpu',
        dtype: 'q8',
      });
      debug("EmbeddingGemma loaded for semantic cache");
      return model;
    } catch (error) {
      warn("Failed to load EmbeddingGemma for semantic cache:", error);
      modelLoadingPromise = null;
      return null;
    }
  })();

  return modelLoadingPromise;
}

/**
 * Cosine similarity 계산
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 프롬프트의 임베딩 벡터를 생성
 */
async function getPromptEmbedding(prompt: string): Promise<number[] | null> {
  const model = await getEmbedder();
  if (!model) return null;

  try {
    const normalizedPrompt = normalizePrompt(prompt);
    const result = await model(normalizedPrompt, { pooling: 'mean', normalize: true });
    return Array.from(result.data as unknown as number[]);
  } catch (error) {
    warn("Failed to generate embedding for semantic cache:", error);
    return null;
  }
}

/**
 * 시맨틱 캐시에서 유사한 응답 검색
 */
async function findSimilarResponse(
  prompt: string
): Promise<{ response: string; similarity: number } | null> {
  const promptEmbedding = await getPromptEmbedding(prompt);
  if (!promptEmbedding) return null;

  const now = Date.now();

  // 캐시에서 유사한 항목 검색
  for (let i = semanticCache.length - 1; i >= 0; i--) {
    const item = semanticCache[i];

    // TTL 만료된 항목 제거
    if (now - item.timestamp > SEMANTIC_CACHE_TTL_MS) {
      semanticCache.splice(i, 1);
      continue;
    }

    const similarity = cosineSimilarity(promptEmbedding, item.embedding);

    if (similarity >= SEMANTIC_THRESHOLD) {
      debug(`Semantic cache hit: ${similarity.toFixed(3)} similarity`);
      // 사용된 항목을 최신으로 이동
      item.timestamp = now;
      semanticCache.splice(i, 1);
      semanticCache.push(item);
      return { response: item.response, similarity };
    }
  }

  return null;
}

/**
 * 시맨틱 캐시에 응답 저장
 */
async function storeInSemanticCache(prompt: string, response: string): Promise<void> {
  const promptEmbedding = await getPromptEmbedding(prompt);
  if (!promptEmbedding) return;

  // 캐시 크기 제한
  if (semanticCache.length >= MAX_SEMANTIC_CACHE_SIZE) {
    semanticCache.shift(); // 가장 오래된 항목 제거
  }

  semanticCache.push({
    embedding: promptEmbedding,
    response,
    prompt: normalizePrompt(prompt),
    timestamp: Date.now(),
  });
}

/**
 * 시맨틱 캐시를 활용한 API 호출 래퍼
 * @param prompt 원본 프롬프트
 * @param apiCall 실제 API 호출 함수
 * @returns { response: string, cached: boolean }
 */
export async function getSemanticCachedResponse(
  prompt: string,
  apiCall: () => Promise<string>
): Promise<{ response: string; cached: boolean }> {
  const normalizedPrompt = normalizePrompt(prompt);

  // 1단계: 정확 일치 캐시 확인
  const exactCachedResponse = getCachedResponse(normalizedPrompt);
  if (exactCachedResponse) {
    debug("Exact cache hit");
    return { response: exactCachedResponse, cached: true };
  }

  // 2단계: 시맨틱 캐시 확인
  try {
    const semanticMatch = await findSimilarResponse(prompt);
    if (semanticMatch) {
      // 정확 캐시에도 저장 (향후 정확 일치 히트율 향상)
      setCachedResponse(normalizedPrompt, semanticMatch.response);
      return { response: semanticMatch.response, cached: true };
    }
  } catch (error) {
    warn("Semantic cache lookup failed:", error);
  }

  // 3단계: Fresh API call
  const freshResponse = await apiCall();

  // 두 캐시에 모두 저장
  setCachedResponse(normalizedPrompt, freshResponse);

  try {
    await storeInSemanticCache(prompt, freshResponse);
  } catch (error) {
    warn("Failed to store in semantic cache:", error);
  }

  return { response: freshResponse, cached: false };
}

/**
 * 시맨틱 캐시 통계 (디버깅용)
 */
export function getSemanticCacheStats(): {
  size: number;
  threshold: number;
  ttlMinutes: number;
} {
  return {
    size: semanticCache.length,
    threshold: SEMANTIC_THRESHOLD,
    ttlMinutes: SEMANTIC_CACHE_TTL_MS / 60000,
  };
}

/**
 * 모든 시맨틱 캐시 초기화 (테스트용)
 */
export function clearSemanticCache(): void {
  semanticCache.length = 0;
}
