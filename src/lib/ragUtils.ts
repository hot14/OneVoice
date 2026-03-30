import { GoogleGenAI } from "@google/genai";
import { db, auth } from "../firebase";
import { doc, setDoc, getDoc, collection, writeBatch, getDocs, serverTimestamp, query, orderBy } from "firebase/firestore";

export interface ApiSettings {
  provider: string; // 'gemini' | 'custom'
  baseUrl?: string;
  apiKey?: string;
  model?: string;
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
  const isCustom = embeddingApiSettings?.provider === 'custom';
  const customKey = embeddingApiSettings?.apiKey || apiKey;
  const baseUrl = embeddingApiSettings?.baseUrl || 'https://api.openai.com/v1';
  const embeddingModel = embeddingApiSettings?.model || 'text-embedding-3-small';

  const ai = new GoogleGenAI({ apiKey });
  const embeddings: number[][] = [];
  
  // Process in smaller batches to avoid rate limits
  const concurrency = isCustom ? 5 : 3; // Custom APIs might handle higher concurrency
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
                model: embeddingModel,
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
            console.warn(`Rate limit hit, retrying in ${delay}ms...`);
            await sleep(delay);
            delay *= 2; // Exponential backoff
          } else {
            throw error;
          }
        }
      }
      return [];
    });
    
    const batchEmbeddings = await Promise.all(promises);
    embeddings.push(...batchEmbeddings);
    
    // Add a delay between batches to respect rate limits
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
  const isCustom = chatApiSettings?.provider === 'custom';
  const customKey = chatApiSettings?.apiKey || apiKey;
  const baseUrl = chatApiSettings?.baseUrl || 'https://api.openai.com/v1';
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
    summary = await generateChatResponse(summaryPrompt, apiKey, chatApiSettings);
  } catch (error) {
    console.error("Failed to generate summary:", error);
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

  // 1. Embed query
  const isCustom = embeddingApiSettings?.provider === 'custom';
  const customKey = embeddingApiSettings?.apiKey || apiKey;
  const baseUrl = embeddingApiSettings?.baseUrl || 'https://api.openai.com/v1';
  const embeddingModel = embeddingApiSettings?.model || 'text-embedding-3-small';

  let queryEmbedding: number[] | undefined;

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
  } catch (error) {
    console.error("Failed to embed query:", error);
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
