import { GoogleGenAI } from "@google/genai";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { ApiSettings } from "../types";
import { semanticCache } from "./semanticCache";
import { generateEmbedding, cosineSimilarity } from "./embeddingService";

/**
 * Generates a chat response using the configured provider.
 */
export async function generateChatResponse(
  prompt: string,
  defaultApiKey: string,
  settings?: ApiSettings,
  systemInstruction?: string,
  responseFormat?: "text" | "json"
): Promise<string> {
  const provider = settings?.provider || "gemini";
  const apiKey = settings?.apiKey || defaultApiKey;

  if (provider === "gemini") {
    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: settings?.model || "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemInstruction ? { 
          role: "system", 
          parts: [{ text: systemInstruction }] 
        } : undefined
      }
    });
    let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (responseFormat === "json") {
      // Basic JSON extraction if model returns markdown
      text = text.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
    }
    return text;
  } else if (provider === "openai" || provider === "custom") {
    const baseUrl = settings?.baseUrl || "https://api.openai.com/v1";
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: settings?.model || "gpt-4o-mini",
        messages: [
          ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
          { role: "user", content: prompt }
        ],
        response_format: responseFormat === "json" ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      throw new Error(`API failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Cached version of generateChatResponse
 */
export async function generateChatResponseCached(
  prompt: string,
  defaultApiKey: string,
  settings?: ApiSettings,
  systemInstruction?: string,
  responseFormat?: "text" | "json"
): Promise<{ response: string; cached: boolean }> {
  // Check cache first
  const cachedResponse = semanticCache.get<string>(prompt);
  if (cachedResponse) {
    return { response: cachedResponse, cached: true };
  }

  const response = await generateChatResponse(prompt, defaultApiKey, settings, systemInstruction, responseFormat);
  
  // Store in cache
  semanticCache.set(prompt, response);
  
  return {
    response,
    cached: false
  };
}

/**
 * Retrieves relevant chunks from materials using on-device embeddings.
 */
export async function retrieveRelevantChunks(
  query: string,
  materialIds: string[],
  defaultApiKey: string,
  settings: ApiSettings,
  topK: number = 3
): Promise<any[]> {
  console.log(`Retrieving chunks for: ${query} in materials: ${materialIds}`);
  
  // 1. Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    console.warn("Falling back to keyword search (embedding failed)");
    return [];
  }

  if (!auth.currentUser) return [];

  const allChunks: any[] = [];

  // 2. Fetch chunks from all specified materials
  for (const materialId of materialIds) {
    try {
      const chunksRef = collection(db, "users", auth.currentUser.uid, "materials", materialId, "chunks");
      const snap = await getDocs(chunksRef);
      snap.forEach(d => {
        const data = d.data();
        if (data.embedding) {
          const similarity = cosineSimilarity(queryEmbedding, data.embedding);
          allChunks.push({
            text: data.text,
            similarity,
            materialId
          });
        }
      });
    } catch (err) {
      console.error(`Failed to fetch chunks for material ${materialId}:`, err);
    }
  }

  // 3. Sort by similarity and return top K
  return allChunks
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Retrieves context using its Knowledge Graph neighborhood.
 * This is more token-efficient than raw text retrieval.
 */
export async function retrieveGraphContext(
  materialId: string,
  query: string,
  topK: number = 5
): Promise<string> {
  const userId = auth.currentUser?.uid;
  if (!userId) return "";

  // 1. Find nodes matching query keywords or description
  const nodesRef = collection(db, "users", userId, "materials", materialId, "nodes");
  const snap = await getDocs(nodesRef);
  
  const matches: any[] = [];
  snap.forEach(d => {
    const data = d.data();
    if (data.label.toLowerCase().includes(query.toLowerCase()) || 
        data.description?.toLowerCase().includes(query.toLowerCase())) {
          matches.push({ id: d.id, ...data });
    }
  });

  if (matches.length === 0) return "";

  // 2. Fetch related edges to build a "local map"
  const edgesRef = collection(db, "users", userId, "materials", materialId, "edges");
  const edgesSnap = await getDocs(edgesRef);
  const allEdges: any[] = [];
  edgesSnap.forEach(d => allEdges.push({ id: d.id, ...d.data() }));

  // Build context string from the localized graph
  let context = "Knowledge Graph Summary:\n";
  matches.slice(0, topK).forEach(node => {
     context += `- ${node.label} (${node.type}): ${node.description || "No description"}\n`;
     // Find outgoing relationships
     const relations = allEdges.filter(e => e.source === node.id);
     relations.forEach(rel => {
       const target = snap.docs.find(d => d.id === rel.target)?.data();
       if (target) {
         context += `  * ${rel.type} -> ${target.label} (${target.type})\n`;
       }
     });
  });

  return context;
}
