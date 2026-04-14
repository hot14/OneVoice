// Shared Embedding Model Singleton
// Unified management for EmbeddingGemma across all modules
// Dynamic import for lazy loading with WebGPU fallback

import { debug, warn } from './logger';

// Dynamic import type for transformers.js
type EmbeddingPipeline = Awaited<ReturnType<typeof import('@huggingface/transformers').pipeline>>;

// Singleton instance
let embedder: EmbeddingPipeline | null = null;
let modelLoadingPromise: Promise<EmbeddingPipeline | null> | null = null;
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 3;

/**
 * Check if WebGPU is available
 */
function isWebGPUAvailable(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Check for WebGPU in various browsers
  const gpu = (navigator as any).gpu;
  if (gpu) return true;
  
  // Safari WebGPU detection
  if (typeof navigator !== 'undefined' && 'webkitGetGPUInfo' in navigator) {
    return true;
  }
  
  return false;
}

/**
 * Get or create the EmbeddingGemma singleton
 * WebGPU is automatically detected - falls back gracefully if unavailable
 */
export async function getEmbedder(): Promise<EmbeddingPipeline | null> {
  // Already loaded successfully
  if (embedder) return embedder;

  // Currently loading
  if (modelLoadingPromise) return modelLoadingPromise;

  // Check WebGPU availability
  if (!isWebGPUAvailable()) {
    warn("WebGPU not available - embedding features disabled");
    return null;
  }

  // Prevent infinite retry loops
  if (loadAttempts >= MAX_LOAD_ATTEMPTS) {
    warn("Max embedding model load attempts reached");
    return null;
  }

  loadAttempts++;
  debug(`Loading EmbeddingGemma (attempt ${loadAttempts}/${MAX_LOAD_ATTEMPTS})...`);

  modelLoadingPromise = (async () => {
    try {
      // Dynamic import - only load when needed
      const { pipeline, env } = await import('@huggingface/transformers');
      
      // Enable browser cache for model weights
      env.useBrowserCache = true;
      env.allowLocalModels = false;

      const model = await pipeline(
        'feature-extraction', 
        'Xenova/embedding-gemma',
        {
          device: 'webgpu',
          dtype: 'q8', // Quantized to 8-bit for memory efficiency
        }
      ) as EmbeddingPipeline;
      
      debug("EmbeddingGemma loaded successfully");
      embedder = model;
      loadAttempts = 0; // Reset on success
      return model;
    } catch (error) {
      warn("Failed to load EmbeddingGemma:", error);
      modelLoadingPromise = null;
      loadAttempts--;
      
      // If this was the last attempt, don't retry
      if (loadAttempts >= MAX_LOAD_ATTEMPTS) {
        warn("Embedding model permanently unavailable");
        return null;
      }
      
      return null;
    }
  })();

  return modelLoadingPromise;
}

/**
 * Check if embedder is ready
 */
export function isEmbedderReady(): boolean {
  return embedder !== null;
}

/**
 * Reset embedder (for testing or recovery)
 */
export function resetEmbedder(): void {
  embedder = null;
  modelLoadingPromise = null;
  loadAttempts = 0;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const model = await getEmbedder();
  if (!model) return null;

  try {
    const result = await (model as any)(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data as unknown as number[]);
  } catch (error) {
    warn("Failed to generate embedding:", error);
    return null;
  }
}

/**
 * Generate embeddings for multiple texts (batch processing)
 */
export async function generateEmbeddings(
  texts: string[], 
  onProgress?: (progress: number) => void
): Promise<number[][]> {
  const model = await getEmbedder();
  if (!model) return [];

  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i++) {
    try {
      const result = await (model as any)(texts[i], { pooling: 'mean', normalize: true });
      embeddings.push(Array.from(result.data as unknown as number[]));
      onProgress?.((i + 1) / texts.length);
    } catch (error) {
      warn(`Failed to embed text ${i}:`, error);
      embeddings.push([]);
    }
  }
  
  return embeddings;
}