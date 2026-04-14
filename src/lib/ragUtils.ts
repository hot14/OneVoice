import { GoogleGenAI } from "@google/genai";
import { db, auth } from "../firebase";
import { doc, setDoc, getDoc, collection, writeBatch, getDocs, serverTimestamp, query, orderBy } from "firebase/firestore";
import { pipeline, env, FeatureExtractionPipeline } from '@huggingface/transformers';
import { debug, warn, error as loggerError } from './logger';

// Enable webGPU for mobile performance (WASM fallback is automatic)
env.useBrowserCache = true;
env.allowLocalModels = false;

export interface ApiSettings {
  provider: string; // 'gemini' | 'custom' | 'openai' | 'embedgemma'
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

// EmbeddingGemma model - optimized for on-device (200MB RAM with quantization)
// Falls back to API if WebGPU is unavailable
let embeddingModel: FeatureExtractionPipeline | null = null;
let modelLoadingPromise: Promise<FeatureExtractionPipeline> | null = null;

async function getEmbeddingModel(): Promise<FeatureExtractionPipeline | null> {
  // Already loaded
  if (embeddingModel) return embeddingModel;

  // Currently loading
  if (modelLoadingPromise) return modelLoadingPromise;

  // Check if WebGPU is available (required for mobile performance)
  // Note: WebGPU API is available in Chrome/Edge, Safari 16.4+, Firefox nightly
  if (typeof navigator !== 'undefined' && !(navigator as any).gpu) {
    debug("WebGPU not available - using API fallback for embeddings");
    return null;
  }

  modelLoadingPromise = (async () => {
    try {
      debug("Loading EmbeddingGemma model for on-device embeddings...");
      // Using EmbeddingGemma - 308M params, optimized for mobile (200MB RAM)
      // Supports 100+ languages including Korean, Japanese, Chinese
      const model = await pipeline('feature-extraction', 'Xenova/embedding-gemma', {
        device: 'webgpu',
        dtype: 'q8', // Quantized to 8-bit for memory efficiency
      });
      debug("EmbeddingGemma model loaded successfully");
      return model;
    } catch (error) {
      warn("Failed to load EmbeddingGemma, falling back to API:", error);
      modelLoadingPromise = null;
      return null;
    }
  })();

  return modelLoadingPromise;
}

export function chunkText(text: string, chunkSize = 3000, overlap = 500): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateEmbeddings(texts: string[], apiKey: string, embeddingApiSettings?: ApiSettings): Promise<number[][]> {
  // Determine provider priority:
  // 1. 'embedgemma' - on-device EmbeddingGemma (free, mobile-optimized)
  // 2. 'openai' or 'custom' - API based
  // 3. 'gemini' - Gemini API
  // 4. Auto-detect - try EmbeddingGemma first, fallback to OpenAI API

  const provider = embeddingApiSettings?.provider || 'auto';
  const customKey = embeddingApiSettings?.apiKey || apiKey;
  const baseUrl = embeddingApiSettings?.baseUrl || 'https://api.openai.com/v1';
  const embeddingModelName = embeddingApiSettings?.model || 'text-embedding-3-small';

  // Try on-device EmbeddingGemma first (free, mobile-optimized)
  if (provider === 'embedgemma' || provider === 'auto') {
    const model = await getEmbeddingModel();
    if (model) {
      const embeddings: number[][] = [];
      for (const text of texts) {
        const result = await model(text, { pooling: 'mean', normalize: true });
        // Result is a 2D array, extract the embedding vector
        const embedding = Array.from(result.data as unknown as number[]);
        embeddings.push(embedding);
      }
      return embeddings;
    }
  }

  // Fallback to API-based embedding
  const isCustom = provider === 'openai' || provider === 'custom';
  const ai = new GoogleGenAI({ apiKey });
  const embeddings: number[][] = [];

  // Process in smaller batches to avoid rate limits
  const concurrency = isCustom ? 5 : 3;
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const promises = batch.map(async (text) => {
      let retries = 3;
      let delay = 2000;
      while (retries > 0) {
        try {
          if (isCustom) {
            const endpoint = baseUrl.endsWith('/embeddings')
              ? baseUrl
              : `${baseUrl.replace(/\/$/, '')}/embeddings`;

            const res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customKey}`
              },
              body: JSON.stringify({
                model: embeddingModelName,
                input: text
              })
            });
            if (!res.ok) {
              const errText = await res.text();
              throw new Error(`Custom API Error: ${res.status} ${errText}`);
            }
            const data = await res.json();
            return data.data[0].embedding;
          } else {
            const result = await ai.models.embedContent({
              model: 'gemini-embedding-2-preview',
              contents: text,
            });
            return result.embeddings?.[0]?.values || [];
          }
        } catch (error: any) {
          if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Quota') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('Too Many Requests')) {
            retries--;
            if (retries === 0) throw error;
            warn(`Rate limit hit, retrying in ${delay}ms...`);
            await sleep(delay);
            delay *= 2;
          } else {
            throw error;
          }
        }
      }
      return [];
    });

    const batchEmbeddings = await Promise.all(promises);
    embeddings.push(...batchEmbeddings);

    if (i + concurrency < texts.length) {
      await sleep(isCustom ? 500 : 1500);
    }
  }
  return embeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
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

export async function generateChatResponse(prompt: string, apiKey: string, chatApiSettings?: ApiSettings, systemInstruction?: string, responseFormat?: "json" | "text", history?: { role: "user" | "model" | "tutor"; text: string }[]): Promise<string> {
  const isCustom = chatApiSettings?.provider === 'custom' || chatApiSettings?.provider === 'openai';
  const customKey = chatApiSettings?.apiKey || apiKey;
  const baseUrl = chatApiSettings?.baseUrl || 'https://api.openai.com/v1';
  // Default to gpt-4o-mini for cost efficiency ($0.15/1M input vs $2.50 for gpt-4o)
  const chatModel = chatApiSettings?.model || 'gpt-4o-mini';

  if (isCustom) {
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    if (history) {
      for (const msg of history) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text
        });
      }
    }
    messages.push({ role: 'user', content: prompt });

    const body: any = {
      model: chatModel,
      messages: messages
    };
    
    if (responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl 
      : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customKey}`
      },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      throw new Error(`Custom Chat API failed: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } else {
    const ai = new GoogleGenAI({ apiKey });
    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (responseFormat === "json") {
      config.responseMimeType = "application/json";
    }
    
    let contents: any[] = [];
    if (history) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: prompt }]
    });
    
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: config
    });
    return result.text || "";
  }
}

/**
 * 시맨틱 캐시를 활용한 Chat API 호출 래퍼
 * 중복/유사 프롬프트에 대해 API 호출 없이 캐시 응답 반환
 * @param prompt 프롬프트
 * @param apiKey API 키
 * @param chatApiSettings API 설정
 * @param systemInstruction 시스템 명령어
 * @param responseFormat 응답 형식
 * @param history 대화 히스토리
 * @returns API 응답 문자열
 */
export async function generateChatResponseCached(
  prompt: string,
  apiKey: string,
  chatApiSettings?: ApiSettings,
  systemInstruction?: string,
  responseFormat?: "json" | "text",
  history?: { role: "user" | "model" | "tutor"; text: string }[]
): Promise<{ response: string; cached: boolean }> {
  // Import here to avoid circular dependency
  const { getSemanticCachedResponse } = await import('./semanticCache');

  const { response, cached } = await getSemanticCachedResponse(
    prompt,
    () => generateChatResponse(prompt, apiKey, chatApiSettings, systemInstruction, responseFormat, history)
  );

  return { response, cached };
}

export async function processAndStoreMaterial(fileId: string, fileName: string, content: string, apiKey: string, chatApiSettings?: ApiSettings, embeddingApiSettings?: ApiSettings) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const uid = auth.currentUser.uid;
  
  // 1. Check if already processed
  const materialRef = doc(db, "users", uid, "materials", fileId);
  const materialSnap = await getDoc(materialRef);
  if (materialSnap.exists()) {
    return materialSnap.data();
  }

  // 2. Generate summary
  let summary = "No summary available.";
  const summaryPrompt = `Summarize the following document in 2-3 sentences. Focus on the main topics and key takeaways. Document:\n\n${content.substring(0, 10000)}`;

  try {
    const { response } = await generateChatResponseCached(summaryPrompt, apiKey, chatApiSettings);
    summary = response;
  } catch (error) {
    loggerError("Failed to generate summary:", error);
  }

  // 3. Chunk and Embed
  const chunks = chunkText(content);
  const embeddings = await generateEmbeddings(chunks, apiKey, embeddingApiSettings);

  // 4. Save to Firestore
  // Save material doc
  await setDoc(materialRef, {
    id: fileId,
    name: fileName,
    summary,
    createdAt: serverTimestamp()
  });

  // Save chunks in batches
  const chunksRef = collection(db, "users", uid, "materials", fileId, "chunks");
  let batch = writeBatch(db);
  let count = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunkDocRef = doc(chunksRef, `chunk_${i}`);
    batch.set(chunkDocRef, {
      text: chunks[i],
      embedding: embeddings[i],
      index: i
    });
    count++;

    if (count === 400) { // Firestore batch limit is 500
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }

  return { id: fileId, name: fileName, summary };
}

export async function retrieveRelevantChunks(queryText: string, materialIds: string[], apiKey: string, embeddingApiSettings?: ApiSettings, topK = 5) {
  if (!auth.currentUser || materialIds.length === 0) return [];
  const uid = auth.currentUser.uid;

  // Embed query - try on-device EmbeddingGemma first (free, mobile-optimized)
  const provider = embeddingApiSettings?.provider || 'auto';
  const customKey = embeddingApiSettings?.apiKey || apiKey;
  const baseUrl = embeddingApiSettings?.baseUrl || 'https://api.openai.com/v1';
  const embeddingModel = embeddingApiSettings?.model || 'text-embedding-3-small';

  let queryEmbedding: number[] | undefined;

  try {
    // Try EmbeddingGemma first (free, on-device)
    if (provider === 'embedgemma' || provider === 'auto') {
      const model = await getEmbeddingModel();
      if (model) {
        const result = await model(queryText, { pooling: 'mean', normalize: true });
        queryEmbedding = Array.from(result.data as unknown as number[]);
      }
    }

    // Fallback to API-based
    if (!queryEmbedding) {
      const isCustom = provider === 'openai' || provider === 'custom';
      if (isCustom) {
        const endpoint = baseUrl.endsWith('/embeddings')
          ? baseUrl
          : `${baseUrl.replace(/\/$/, '')}/embeddings`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customKey}`
          },
          body: JSON.stringify({
            model: embeddingModel,
            input: queryText
          })
        });
        if (res.ok) {
          const data = await res.json();
          queryEmbedding = data.data?.[0]?.embedding;
        }
      } else {
        const ai = new GoogleGenAI({ apiKey });
        const queryResult = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: queryText,
        });
        queryEmbedding = queryResult.embeddings?.[0]?.values;
      }
    }
  } catch (error) {
    loggerError("Failed to embed query:", error);
    return [];
  }

  if (!queryEmbedding) return [];

  // 2. Fetch all chunks for active materials
  const allChunks: { text: string, embedding: number[], materialId: string }[] = [];
  
  for (const materialId of materialIds) {
    const chunksRef = collection(db, "users", uid, "materials", materialId, "chunks");
    const q = query(chunksRef, orderBy("index"));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      const data = doc.data();
      allChunks.push({
        text: data.text,
        embedding: data.embedding,
        materialId
      });
    });
  }

  // 3. Calculate similarity and sort
  const scoredChunks = allChunks.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  scoredChunks.sort((a, b) => b.score - a.score);

  // 4. Return top K
  return scoredChunks.slice(0, topK);
}
