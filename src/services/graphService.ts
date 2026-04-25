import { GoogleGenAI, Type } from "@google/genai";
import { collection, addDoc, getDocs, deleteDoc, query, where, writeBatch, doc } from "firebase/firestore";
import { db, auth } from "../firebase";

interface GraphNode {
  id?: string;
  label: string;
  type: "concept" | "entity" | "function" | "module" | "term";
  description?: string;
  confidence: number;
}

interface GraphEdge {
  id?: string;
  source: string; // node label or id
  target: string; // node label or id
  type: string;
  confidence: number;
}

/**
 * Service to manage Knowledge Graph extraction and storage.
 * Inspired by Graphify's Dual Path Extraction.
 */
export class GraphService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  /**
   * Generates a knowledge graph for a specific material.
   */
  async processMaterial(materialId: string, content: string) {
    if (!auth.currentUser) throw new Error("User not authenticated");

    const userId = auth.currentUser.uid;
    const materialPath = `users/${userId}/materials/${materialId}`;

    // 1. Clear existing graph items
    await this.clearGraph(materialId);

    // 2. Path A: Structural Extraction (Regex-based simple patterns)
    const structuralNodes = this.extractStructural(content);

    // 3. Path B: Semantic Extraction (Gemini-based)
    const semanticData = await this.extractSemantic(content);

    // 4. Merge and Store
    const nodes = [...structuralNodes, ...semanticData.nodes];
    const edges = semanticData.edges;

    // Use batch for efficiency
    const batch = writeBatch(db);
    
    // Track nodes by label to connect edges correctly
    const labelToId: Record<string, string> = {};

    for (const node of nodes) {
      const nodeRef = doc(collection(db, materialPath, "nodes"));
      batch.set(nodeRef, node);
      labelToId[node.label.toLowerCase()] = nodeRef.id;
    }

    for (const edge of edges) {
      const sourceId = labelToId[edge.source.toLowerCase()];
      const targetId = labelToId[edge.target.toLowerCase()];
      
      if (sourceId && targetId) {
        const edgeRef = doc(collection(db, materialPath, "edges"));
        batch.set(edgeRef, {
          ...edge,
          source: sourceId,
          target: targetId
        });
      }
    }

    await batch.commit();
  }

  private extractStructural(content: string): GraphNode[] {
    const nodes: GraphNode[] = [];
    // Example: find "concept: [Name]" or "term: [Name]" patterns
    const conceptRegex = /(?:concept|term|defined as):\s*([A-Z][a-zA-Z\s]{2,30})/g;
    let match;
    while ((match = conceptRegex.exec(content)) !== null) {
      nodes.push({
        label: match[1].trim(),
        type: "concept",
        confidence: 1.0,
        description: "Source code/text structural definition"
      });
    }
    return nodes;
  }

  private async extractSemantic(content: string): Promise<{ nodes: GraphNode[], edges: GraphEdge[] }> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        systemInstruction: "You are a Knowledge Graph extraction engine. Extract key entities and their relationships from the provided text.",
        contents: [{ role: "user", parts: [{ text: `Analyze the following text and return a knowledge graph in JSON format. 
          Focus on identifying terms, concepts, and how they relate.
          Text: \"${content.slice(0, 5000)}\"` }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["concept", "entity", "function", "module", "term"] },
                    description: { type: Type.STRING },
                    confidence: { type: Type.NUMBER }
                  },
                  required: ["label", "type", "confidence"]
                }
              },
              edges: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING, description: "Label of the source node" },
                    target: { type: Type.STRING, description: "Label of the target node" },
                    type: { type: Type.STRING, description: "Type of relationship, e.g., 'defines', 'depends on', 'related to'" },
                    confidence: { type: Type.NUMBER }
                  },
                  required: ["source", "target", "type", "confidence"]
                }
              }
            },
            required: ["nodes", "edges"]
          }
        }
      });

      const data = JSON.parse(response.text || '{"nodes":[], "edges":[]}');
      return data;
    } catch (error) {
      console.error("Semantic extraction failed:", error);
      return { nodes: [], edges: [] };
    }
  }

  private async clearGraph(materialId: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const nodesRef = collection(db, "users", userId, "materials", materialId, "nodes");
    const edgesRef = collection(db, "users", userId, "materials", materialId, "edges");

    const [nodesSnap, edgesSnap] = await Promise.all([
      getDocs(nodesRef),
      getDocs(edgesRef)
    ]);

    const batch = writeBatch(db);
    nodesSnap.forEach(d => batch.delete(d.ref));
    edgesSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  async getGraph(materialId: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) return { nodes: [], links: [] };

    const nodesRef = collection(db, "users", userId, "materials", materialId, "nodes");
    const edgesRef = collection(db, "users", userId, "materials", materialId, "edges");

    const [nodesSnap, edgesSnap] = await Promise.all([
      getDocs(nodesRef),
      getDocs(edgesRef)
    ]);

    const nodes = nodesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const links = edgesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return { nodes, links };
  }
}

export const graphService = new GraphService();
