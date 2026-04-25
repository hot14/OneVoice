import { pipeline, env } from "@huggingface/transformers";

// Configure transformers.js to use local cache and WebGPU if available
env.allowLocalModels = false;
env.useBrowserCache = true;

let embeddingPipeline: any = null;
let isLoading = false;

/**
 * Singleton service for on-device embeddings using EmbeddingGemma
 */
export async function getEmbeddingModel() {
  if (embeddingPipeline) return embeddingPipeline;
  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return embeddingPipeline;
  }

  isLoading = true;
  try {
    console.log("Loading EmbeddingGemma model (on-device)...");
    // Using Xenova/embedding-gemma as per requirements
    // This is a ~200MB model, will be cached in browser
    embeddingPipeline = await pipeline("feature-extraction", "Xenova/embedding-gemma", {
      device: "webgpu", // Try WebGPU first
    }).catch(async () => {
      console.warn("WebGPU not available, falling back to WASM/CPU");
      return await pipeline("feature-extraction", "Xenova/embedding-gemma");
    });
    console.log("EmbeddingGemma model loaded successfully.");
    return embeddingPipeline;
  } catch (error) {
    console.error("Failed to load on-device embedding model:", error);
    return null;
  } finally {
    isLoading = false;
  }
}

/**
 * Generates embeddings for a given text
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const model = await getEmbeddingModel();
  if (!model) return null;

  try {
    const output = await model(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return null;
  }
}

/**
 * Calculates cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
