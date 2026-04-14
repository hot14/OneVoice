// Shared Embedding Model Singleton
// Unified management for EmbeddingGemma across all modules
// Dynamic import for lazy loading with multi-tier fallback: WebGPU → WASM → API

import { debug, warn } from './logger';

// Dynamic import type for transformers.js
type EmbeddingPipeline = Awaited<ReturnType<typeof import('@huggingface/transformers').pipeline>>;

// Runtime type for device backend
type DeviceBackend = 'webgpu' | 'wasm' | 'api';

// Singleton instance
let embedder: EmbeddingPipeline | null = null;
let modelLoadingPromise: Promise<EmbeddingPipeline | null> | null = null;
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 3;

// Current backend tracking
let currentBackend: DeviceBackend = 'api';

/**
 * Check if WebGPU is available with comprehensive browser detection
 * Handles Chrome, Edge, Firefox, Safari, and mobile browsers
 */
function isWebGPUAvailable(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  // Chrome/Edge: navigator.gpu
  const gpu = (navigator as any).gpu;
  if (gpu) {
    // Check for WebGPU specifically in Chrome
    const webgpu = gpu.get ? true : false;
    return webgpu;
  }
  
  // Safari: webkitGetGPUInfo (older API) or document.createElement('canvas').getContext('webgpu')
  if ('webkitGetGPUInfo' in navigator) {
    return true;
  }
  
  // Firefox: WebGPU behind flag, detected via canvas
  try {
    const canvas = document.createElement('canvas');
    if (canvas.getContext && (canvas.getContext('webgpu') !== null)) {
      return true;
    }
  } catch {
    // Ignore detection errors
  }
  
  return false;
}

/**
 * Check if WebAssembly (WASM) backend is available
 * WASM is supported in all modern browsers
 */
function isWASMAvailable(): boolean {
  try {
    return typeof WebAssembly === 'object' && 
           typeof WebAssembly.instantiate === 'function' &&
           typeof SharedArrayBuffer !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Determine optimal backend based on device capabilities
 * Returns the best available backend
 */
export function getOptimalBackend(): DeviceBackend {
  // Tier 1: WebGPU (fastest, on-device)
  if (isWebGPUAvailable()) {
    return 'webgpu';
  }
  
  // Tier 2: WebAssembly (good balance of speed and compatibility)
  if (isWASMAvailable()) {
    return 'wasm';
  }
  
  // Tier 3: API fallback (cloud-based)
  return 'api';
}

/**
 * Get device info for debugging
 */
export function getDeviceInfo(): { backend: DeviceBackend; webgpu: boolean; wasm: boolean } {
  return {
    backend: currentBackend,
    webgpu: isWebGPUAvailable(),
    wasm: isWASMAvailable(),
  };
}

/**
 * Get or create the EmbeddingGemma singleton
 * Multi-tier fallback: WebGPU → WASM → API
 */
export async function getEmbedder(): Promise<EmbeddingPipeline | null> {
  // Already loaded successfully
  if (embedder) return embedder;

  // Currently loading
  if (modelLoadingPromise) return modelLoadingPromise;

  // Prevent infinite retry loops
  if (loadAttempts >= MAX_LOAD_ATTEMPTS) {
    warn("Max embedding model load attempts reached");
    return null;
  }

  loadAttempts++;
  
  // Determine optimal backend
  const optimalBackend = getOptimalBackend();
  currentBackend = optimalBackend;
  
  debug(`Loading EmbeddingGemma (attempt ${loadAttempts}/${MAX_LOAD_ATTEMPTS}) using ${optimalBackend} backend...`);

  modelLoadingPromise = (async () => {
    try {
      // Dynamic import - only load when needed
      const { pipeline, env } = await import('@huggingface/transformers');
      
      // Enable browser cache for model weights
      env.useBrowserCache = true;
      env.allowLocalModels = false;

      // Configure device based on optimal backend with proper typing
      const modelOptions = optimalBackend === 'webgpu' 
        ? { device: 'webgpu' as const, dtype: 'q8' as const }
        : optimalBackend === 'wasm'
          ? { device: 'wasm' as const, dtype: 'q8' as const }
          : { device: 'cpu' as const, dtype: 'q8' as const };

      const model = await pipeline(
        'feature-extraction', 
        'Xenova/embedding-gemma',
        modelOptions
      ) as EmbeddingPipeline;
      
      debug(`EmbeddingGemma loaded successfully on ${optimalBackend}`);
      embedder = model;
      loadAttempts = 0; // Reset on success
      currentBackend = optimalBackend;
      return model;
    } catch (error) {
      warn(`Failed to load EmbeddingGemma with ${optimalBackend}:`, error);
      modelLoadingPromise = null;
      loadAttempts--;
      
      // Multi-tier fallback: try WASM if WebGPU failed
      if (optimalBackend === 'webgpu' && loadAttempts < MAX_LOAD_ATTEMPTS) {
        warn("WebGPU failed, attempting WASM fallback...");
        currentBackend = 'wasm';
        // Trigger a new loading attempt with WASM
        loadAttempts++; // Counteract the decrement
        return getEmbedder();
      }
      
      // If this was the last attempt, don't retry
      if (loadAttempts >= MAX_LOAD_ATTEMPTS) {
        warn("Embedding model permanently unavailable - using API fallback");
        currentBackend = 'api';
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