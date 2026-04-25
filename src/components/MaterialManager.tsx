import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { FileText, Upload, Trash2, Loader2, CheckCircle2, AlertCircle, Share2, Network } from "lucide-react";
import { generateEmbedding } from "../lib/embeddingService";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";
import { graphService } from "../services/graphService";
import { GraphView } from "./GraphView";

interface Material {
  id: string;
  name: string;
  content: string;
  createdAt: any;
}

export function MaterialManager() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingGraphId, setProcessingGraphId] = useState<string | null>(null);
  const [viewingGraphId, setViewingGraphId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, "users", auth.currentUser.uid, "materials"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Material));
      setMaterials(list);
    } catch (err) {
      console.error("Failed to fetch materials", err);
      handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser.uid}/materials`);
      setError("Failed to load materials. Please check your permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setUploading(true);
    setError(null);

    try {
      const text = await file.text();
      
      // 1. Chunking (Simple paragraph-based for now)
      const chunks = text.split(/\n\s*\n/).filter(c => c.trim().length > 0);
      
      // 2. Store Material Metadata
      const materialRef = await addDoc(collection(db, "users", auth.currentUser.uid, "materials"), {
        name: file.name,
        content: text, // Store full text for graph processing later
        createdAt: serverTimestamp()
      });

      // 3. Generate Embeddings for chunks and store them
      const chunksToProcess = chunks.slice(0, 10); // Limit for demo performance
      
      for (let i = 0; i < chunksToProcess.length; i++) {
        const chunkText = chunksToProcess[i];
        const embedding = await generateEmbedding(chunkText);
        
        if (embedding) {
          await addDoc(collection(db, "users", auth.currentUser.uid, "materials", materialRef.id, "chunks"), {
            text: chunkText,
            embedding: embedding,
            index: i
          });
        }
      }

      await fetchMaterials();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${auth.currentUser.uid}/materials`);
      setError("Failed to upload and process material.");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateGraph = async (material: Material) => {
    setProcessingGraphId(material.id);
    try {
      await graphService.processMaterial(material.id, material.content);
      setViewingGraphId(material.id);
    } catch (err) {
      console.error("Graph processing failed", err);
      setError("Failed to generate knowledge graph.");
    } finally {
      setProcessingGraphId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "materials", id));
      setMaterials(prev => prev.filter(m => m.id !== id));
      if (viewingGraphId === id) setViewingGraphId(null);
    } catch (err) {
      console.error("Failed to delete material", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Study Materials</h2>
          <p className="text-sm text-gray-500">Enhanced with Knowledge Graph (Graphify Integration)</p>
        </div>
        
        <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100">
          <Upload className="w-4 h-4" />
          <span className="text-sm font-bold">Upload File</span>
          <input type="file" className="hidden" accept=".txt,.md" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>

      {(uploading || processingGraphId) && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          <div className="flex-1">
            <p className="text-sm font-bold text-indigo-900">
              {uploading ? "Uploading & Indexing..." : "Generating Knowledge Graph (Graphify)..."}
            </p>
            <p className="text-xs text-indigo-600">
              {uploading ? "Creating vector embeddings for search" : "Building relationship map to reduce token usage"}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid gap-4">
        {materials.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No materials uploaded yet</p>
          </div>
        ) : (
          materials.map(material => (
            <div key={material.id} className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{material.name}</h3>
                  <p className="text-xs text-gray-500">
                    Uploaded {material.createdAt?.toDate().toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleGenerateGraph(material)}
                    disabled={!!processingGraphId}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                    title="Generate Knowledge Graph"
                  >
                    <Network className={`w-5 h-5 ${processingGraphId === material.id ? 'animate-spin' : ''}`} />
                    <span className="text-xs font-bold hidden md:inline">Generate Graph</span>
                  </button>
                  
                  <button 
                    onClick={() => setViewingGraphId(viewingGraphId === material.id ? null : material.id)}
                    className={`p-2 rounded-lg transition-colors ${viewingGraphId === material.id ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'}`}
                    title="Toggle Graph View"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => handleDelete(material.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {viewingGraphId === material.id && (
                <div className="bg-white p-6 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <Network className="w-4 h-4 text-indigo-600" />
                      Knowledge Graph: {material.name}
                    </h4>
                    <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-2 py-1 rounded">Graphify Pipeline Active</span>
                  </div>
                  <GraphView materialId={material.id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
