import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  where,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";
import { error as loggerError } from "../lib/logger";
import { generateChatResponse } from "../lib/ragUtils";
import {
  Mic,
  LogOut,
  History,
  Settings,
  Languages,
  X,
  Info,
  Search,
  BarChart,
} from "lucide-react";
import { useLanguage, languageNames } from "../contexts/LanguageContext";
import { LanguageSwitch } from "./LanguageSwitch";

interface DashboardProps {
  onStartInterpretation: () => void;
}

const getEnglishNobleTitle = (level: number, lang: string) => {
  if (level >= 100)
    return lang === "ko"
      ? "마스터 (Master)"
      : "Master";
  if (level >= 75)
    return lang === "ko" ? "전문가 (Expert)" : "Expert";
  if (level >= 50)
    return lang === "ko" ? "중급자 (Intermediate)" : "Intermediate";
  if (level >= 25)
    return lang === "ko" ? "초급자 (Beginner)" : "Beginner";
  if (level >= 10) return lang === "ko" ? "입문자 (Novice)" : "Novice";
  return lang === "ko" ? "학습자 (Learner)" : "Learner";
};

export function InterpretationDashboard({
  onStartInterpretation,
}: DashboardProps) {
  const { t, sourceLanguage, targetLanguage, setSourceLanguage, setTargetLanguage, uiLanguage, setUiLanguage } = useLanguage();
  const language = sourceLanguage;
  const setLanguage = setSourceLanguage;
  const [showSettings, setShowSettings] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  // Security: Admin check using domain or custom claim (not hardcoded email)
  // Production should use Firebase Custom Claims: admin.auth().setCustomUserClaims(uid, { admin: true })
  const isAdmin = auth.currentUser?.email?.endsWith("@gagatrack.com") || userProfile?.isAdmin === true;

  useEffect(() => {
    if (isAdmin) {
      const usersRef = collection(db, "users");
      const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
        const users: any[] = [];
        snapshot.forEach((doc) => users.push({ id: doc.id, ...doc.data() }));
        setAllUsers(users);
      });
      return () => unsubscribeUsers();
    }
  }, [isAdmin]);
  
  const filteredConversations = conversations.filter(conv => 
    conv.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.keyPoints?.some((kp: string) => kp.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // API settings - defaults set to "embedgemma" for free on-device embeddings (mobile-optimized, 200MB RAM)
  // Users can change these in settings
  const [chatApiProvider, setChatApiProvider] = useState("openai");
  const [chatApiBaseUrl, setChatApiBaseUrl] = useState("");
  const [chatApiKey, setChatApiKey] = useState("");
  const [chatApiModel, setChatApiModel] = useState("");

  const [embeddingApiProvider, setEmbeddingApiProvider] = useState("embedgemma");
  const [embeddingApiBaseUrl, setEmbeddingApiBaseUrl] = useState("");
  const [embeddingApiKey, setEmbeddingApiKey] = useState("");
  const [embeddingApiModel, setEmbeddingApiModel] = useState("");

  const [liveApiProvider, setLiveApiProvider] = useState("gemini");
  const [liveApiBaseUrl, setLiveApiBaseUrl] = useState("");
  const [liveApiKey, setLiveApiKey] = useState("");
  const [liveApiModel, setLiveApiModel] = useState("");
  const [liveApiVoice, setLiveApiVoice] = useState("");

  // Security: API keys stored in localStorage only (not in Firestore for security)
  // Read API keys from localStorage, fallback to user profile for migration
  useEffect(() => {
    const storedChatApiKey = localStorage.getItem('api_key_chat');
    const storedEmbeddingApiKey = localStorage.getItem('api_key_embedding');
    const storedLiveApiKey = localStorage.getItem('api_key_live');

    if (storedChatApiKey) setChatApiKey(storedChatApiKey);
    if (storedEmbeddingApiKey) setEmbeddingApiKey(storedEmbeddingApiKey);
    if (storedLiveApiKey) setLiveApiKey(storedLiveApiKey);
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribeUser = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile(data);

          // Only load non-sensitive settings from Firestore
          setChatApiProvider(data.chatApiProvider || data.apiProvider || "gemini");
          setChatApiBaseUrl(data.chatApiBaseUrl || data.customApiBaseUrl || "");
          // API keys are read from localStorage for security
          setChatApiKey(localStorage.getItem('api_key_chat') || "");
          setChatApiModel(data.chatApiModel || data.customApiModel || "");

          setEmbeddingApiProvider(data.embeddingApiProvider || data.apiProvider || "gemini");
          setEmbeddingApiBaseUrl(data.embeddingApiBaseUrl || data.customApiBaseUrl || "");
          // API keys are read from localStorage for security
          setEmbeddingApiKey(localStorage.getItem('api_key_embedding') || "");
          setEmbeddingApiModel(data.embeddingApiModel || data.customApiEmbeddingModel || "");

          setLiveApiProvider(data.liveApiProvider || "gemini");
          setLiveApiBaseUrl(data.liveApiBaseUrl || "");
          // API keys are read from localStorage for security
          setLiveApiKey(localStorage.getItem('api_key_live') || "");
          setLiveApiModel(data.liveApiModel || "");
          setLiveApiVoice(data.liveApiVoice || "");

          // Migration: Ensure basic fields exist
          if (
            !data.uid ||
            !data.displayName ||
            !data.email
          ) {
            setDoc(
              userRef,
              {
                uid: data.uid || auth.currentUser.uid,
                displayName: data.displayName || auth.currentUser.displayName || 'Learner',
                email: data.email || auth.currentUser.email || '',
                photoURL: data.photoURL || auth.currentUser.photoURL || '',
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            ).catch((err) => loggerError("Migration failed:", err?.message));
          }
        } else {
          // Initialize new user profile
          setDoc(userRef, {
            uid: auth.currentUser.uid,
            displayName: auth.currentUser.displayName || 'Learner',
            email: auth.currentUser.email || '',
            photoURL: auth.currentUser.photoURL || '',
            createdAt: serverTimestamp(),
          }, { merge: true }).catch((err) => loggerError("Initialization failed:", err?.message));
        }
      },
      (err) => {
        handleFirestoreError(
          err,
          OperationType.GET,
          `users/${auth.currentUser?.uid}`,
        );
      },
    );

    const convRef = collection(db, "users", auth.currentUser.uid, "conversations");
    const qConv = query(convRef, orderBy("createdAt", "desc"), limit(5));
    const unsubscribeConv = onSnapshot(
      qConv,
      (snapshot) => {
        const convs: any[] = [];
        snapshot.forEach((doc) => convs.push({ id: doc.id, ...doc.data() }));
        setConversations(convs);
      },
      (err) => {
        handleFirestoreError(
          err,
          OperationType.LIST,
          `users/${auth.currentUser?.uid}/conversations`,
        );
      },
    );

    return () => {
      unsubscribeUser();
      unsubscribeConv();
    };
  }, []);



  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    // Security: API keys stored in localStorage only (not in Firestore)
    // Save API keys to localStorage
    if (chatApiKey) localStorage.setItem('api_key_chat', chatApiKey);
    else localStorage.removeItem('api_key_chat');
    if (embeddingApiKey) localStorage.setItem('api_key_embedding', embeddingApiKey);
    else localStorage.removeItem('api_key_embedding');
    if (liveApiKey) localStorage.setItem('api_key_live', liveApiKey);
    else localStorage.removeItem('api_key_live');

    // Only non-sensitive settings stored in Firestore
    const settingsToSave = {
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName || 'Learner',
      email: auth.currentUser.email || '',
      photoURL: auth.currentUser.photoURL || '',
      chatApiProvider,
      chatApiBaseUrl,
      chatApiModel,
      embeddingApiProvider,
      embeddingApiBaseUrl,
      embeddingApiModel,
      liveApiProvider,
      liveApiBaseUrl,
      liveApiModel,
      liveApiVoice
    };

    if (import.meta.env.DEV) {
      console.log("Saving settings (API keys redacted):", { ...settingsToSave, chatApiKey: "***", embeddingApiKey: "***", liveApiKey: "***" });
    }
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(
        userRef,
        settingsToSave,
        { merge: true },
      );
      setShowSettings(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${auth.currentUser.uid}`,
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-xl shrink-0">
              🗣️
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 truncate">
                {t("app.title")}
              </h1>
            </div>
          </div>
        <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            <button
              onClick={onStartInterpretation}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-bold shadow-md transition-all hover:scale-[1.02]"
            >
              <Mic className="w-5 h-5" />
              {t("interpreter.start")}
            </button>
            <LanguageSwitch />
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
              {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <BarChart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Conversations</p>
              <p className="text-2xl font-bold text-gray-900">{conversations.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Usage (Monthly)</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(userProfile?.usageDuration || 0)}s / 3600s</p>
              </div>
            </div>
            <button 
              onClick={() => alert("Subscription features are coming soon!")}
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700 transition-colors"
            >
              Upgrade
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Admin: User Management</h3>
            <div className="space-y-2">
              {allUsers.map(user => (
                <div key={user.id} className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <span>{user.email}</span>
                  <span className="font-mono">{Math.round(user.usageDuration || 0)}s</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Conversations Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              {t("dash.recentConversations")}
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          {filteredConversations.length === 0 ? (
            <p className="text-sm text-gray-500 italic">{t("dash.noConversations")}</p>
          ) : (
            <div className="space-y-4">
              {filteredConversations.map((conv) => (
                <div key={conv.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-indigo-300 transition-all" onClick={() => setSelectedConversation(conv)}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900">{conv.summary}</h4>
                    <span className="text-xs text-gray-500 font-mono">
                      {conv.createdAt?.toDate().toLocaleDateString(uiLanguage === 'ko' ? 'ko-KR' : 'en-US')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 mb-2">{conv.keyPoints?.join(", ") || ""}</p>
                  <div className="flex items-center gap-2">
                    {conv.speakers?.map((speaker: string, i: number) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                        {speaker}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedConversation && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold">{selectedConversation.summary}</h2>
                <button onClick={() => setSelectedConversation(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Speakers</h3>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {selectedConversation.speakers?.map((speaker: string, i: number) => <li key={i}>{speaker}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Key Points</h3>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {selectedConversation.keyPoints?.map((kp: string, i: number) => <li key={i}>{kp}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Transcript</h3>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg text-gray-800">{selectedConversation.transcript}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Action Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onStartInterpretation}
            className="flex flex-col items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
          >
            <Mic className="w-8 h-8" />
            {t("interpreter.start")}
          </button>
        </div>
      </main>
      {showSettings && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center sm:p-4">
          <div className="bg-white sm:rounded-2xl shadow-xl w-full h-full sm:h-auto sm:max-h-[85vh] max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{t("dash.settings")}</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={handleSaveSettings}
              className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "ko" ? "UI 언어 (UI Language)" : "UI Language"}
                </label>
                <select
                  value={uiLanguage}
                  onChange={(e) => setUiLanguage(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {Object.entries(languageNames).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  {language === "ko" ? "문서 분석 AI 설정 (RAG)" : "Document Analysis AI Settings (RAG)"}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {language === "ko" 
                    ? "문서 요약 및 청킹에 사용할 AI 모델을 설정합니다."
                    : "Configure the AI model used for document summarization and chunking."}
                </p>

                <div className="space-y-6">
                  {/* Chat Model Settings */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800 border-b pb-1">
                      {language === "ko" ? "분석 모델 (요약용)" : "Analysis Model (Summarization)"}
                    </h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {language === "ko" ? "AI 제공자" : "AI Provider"}
                      </label>
                      <select
                        value={chatApiProvider}
                        onChange={(e) => setChatApiProvider(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                      >
                        <option value="gemini">Google Gemini (Default)</option>
                        <option value="custom">Custom (OpenAI Compatible)</option>
                      </select>
                    </div>

                    {chatApiProvider === "custom" && (
                      <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Base URL</label>
                          <input
                            type="text"
                            value={chatApiBaseUrl}
                            onChange={(e) => setChatApiBaseUrl(e.target.value)}
                            placeholder="https://api.openai.com/v1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                          <input
                            type="password"
                            value={chatApiKey}
                            onChange={(e) => setChatApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Model Name</label>
                          <input
                            type="text"
                            value={chatApiModel}
                            onChange={(e) => setChatApiModel(e.target.value)}
                            placeholder="gpt-4o-mini, glm-4-flash, etc."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Embedding Model Settings */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800 border-b pb-1">
                      {language === "ko" ? "임베딩 모델 (벡터화용)" : "Embedding Model (Vectorization)"}
                    </h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {language === "ko" ? "AI 제공자" : "AI Provider"}
                      </label>
                      <select
                        value={embeddingApiProvider}
                        onChange={(e) => setEmbeddingApiProvider(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                      >
                        <option value="gemini">Google Gemini (Default)</option>
                        <option value="custom">Custom (OpenAI Compatible)</option>
                      </select>
                    </div>

                    {embeddingApiProvider === "custom" && (
                      <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Base URL</label>
                          <input
                            type="text"
                            value={embeddingApiBaseUrl}
                            onChange={(e) => setEmbeddingApiBaseUrl(e.target.value)}
                            placeholder="https://api.openai.com/v1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                          <input
                            type="password"
                            value={embeddingApiKey}
                            onChange={(e) => setEmbeddingApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Model Name</label>
                          <input
                            type="text"
                            value={embeddingApiModel}
                            onChange={(e) => setEmbeddingApiModel(e.target.value)}
                            placeholder="text-embedding-3-small"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Live API Settings */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800 border-b pb-1">
                      {language === "ko" ? "실시간 음성 대화 설정 (Live API)" : "Real-time Voice Settings (Live API)"}
                    </h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {language === "ko" ? "AI 제공자" : "AI Provider"}
                      </label>
                      <select
                        value={liveApiProvider}
                        onChange={(e) => setLiveApiProvider(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                      >
                        <option value="gemini">Google Gemini Live (Default)</option>
                        <option value="openai">OpenAI Realtime API (WebRTC)</option>
                        <option value="custom_turn_based">Custom (Turn-based Voice)</option>
                      </select>
                    </div>

                    {(liveApiProvider === "openai" || liveApiProvider === "custom_turn_based") && (
                      <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {liveApiProvider === "openai" ? "Base URL (WebRTC Endpoint)" : "Base URL (Chat Completions API)"}
                          </label>
                          <input
                            type="text"
                            value={liveApiBaseUrl}
                            onChange={(e) => setLiveApiBaseUrl(e.target.value)}
                            placeholder={liveApiProvider === "openai" ? "https://api.openai.com/v1/realtime" : "https://api.custom.com/v1/chat/completions"}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                          <input
                            type="password"
                            value={liveApiKey}
                            onChange={(e) => setLiveApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Model Name</label>
                          <input
                            type="text"
                            value={liveApiModel}
                            onChange={(e) => setLiveApiModel(e.target.value)}
                            placeholder="gpt-4o-realtime-preview-2024-12-17"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Voice</label>
                          <select
                            value={liveApiVoice}
                            onChange={(e) => setLiveApiVoice(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                          >
                            <option value="">Default (Alloy)</option>
                            <option value="alloy">Alloy</option>
                            <option value="ash">Ash</option>
                            <option value="coral">Coral</option>
                            <option value="echo">Echo</option>
                            <option value="fable">Fable</option>
                            <option value="onyx">Onyx</option>
                            <option value="nova">Nova</option>
                            <option value="sage">Sage</option>
                            <option value="shimmer">Shimmer</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors mt-4"
              >
                {t("dash.saveSettings")}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
