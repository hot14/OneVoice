import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Mic,
  ArrowDownUp,
  Globe,
  Loader2,
  TriangleAlert,
  Save,
  MessageSquare,
  X,
  Headphones,
  Bluetooth,
  ChevronDown,
  Contact2,
  Settings2,
  Languages,
  AudioWaveform,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  GoogleGenAI,
  Modality,
  LiveServerMessage,
} from "@google/genai";
import { AudioRecorder, AudioPlayer } from "../lib/audioUtils";
import { detectLanguage } from "../lib/languageDetect";
import { getMicErrorDetails } from "../lib/micUtils";
import {
  ScriptLine,
  saveHistoryItem,
  generateSummary,
  HistoryItem,
} from "../services/historyService";
import { motion, AnimatePresence } from "framer-motion";

const guessLanguage = (text: string, lang1: string, lang2: string): string => {
  return detectLanguage(text, [lang1, lang2]);
};

const LANGUAGES = [
  { code: "ko", name: "한국어" },
  { code: "en", name: "English" },
  { code: "jp", name: "日本語" },
  { code: "cn", name: "简体中文" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
];

const getLanguageName = (code: string) => {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : code;
};

export default function Translate() {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [bottomLang, setBottomLang] = useState("ko");
  const [topLang, setTopLang] = useState("en");
  const [bottomText, setBottomText] = useState("");
  const [topText, setTopText] = useState("");
  const [isBottomActive, setIsBottomActive] = useState(false);
  const [isTopActive, setIsTopActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEarphoneMode, setIsEarphoneMode] = useState(false);
  const [isPairingMode, setIsPairingMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [myUid] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const sessionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastPanRef = useRef<number>(0);
  const activeTurnBufferRef = useRef<string>("");
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const MAX_RECONNECT = 3;

  const [script, setScript] = useState<ScriptLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [script, bottomText, topText]);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const swapLanguages = () => {
    const temp = bottomLang;
    setBottomLang(topLang);
    setTopLang(temp);
    setBottomText("");
    setTopText("");
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setBottomText("");
      setTopText("");
      setScript([]);
      activeTurnBufferRef.current = "";

      const apiKey = process.env.GEMINI_API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });
      playerRef.current = new AudioPlayer();

      const systemInstruction = `당신은 'OneVoice'라는 세계 최고 수준의 AI 동시통역사입니다. Seleskovitch의 '의미 이론(Théorie du Sens)'과 Chernov의 '확률-예측 모델'을 기반으로 ${getLanguageName(bottomLang)}와 ${getLanguageName(topLang)} 사이를 실시간으로 통역합니다.

[핵심 철학: 탈언어화(Déverbalisation)]
- 원어의 표현 형식을 버리고 '의미'만 추출하여 목표 언어로 재표현합니다.
- 단어 대 단어 번역이 아닌 '의미 덩어리(Sense Group)' 단위로 처리합니다.
- 문맥과 의미적 잉여성(Semantic Redundancy)을 활용해 불완전한 발화를 예측하세요.

[분절 과학 — EVS(Ear-Voice Span) 기반]
최적 분절 창: 발화 시작 후 3.5~5.5초 이내에 해당 의미 단위를 출력해야 합니다.

1순위 분절 트리거 (즉시 분절):
- 한국어: 담화구조표지(그러나, 그런데, 따라서, 그러므로, 한편, 즉, 예를 들어), 종결어미(-습니다, -합니다, -예요, -이에요, -죠, -네요)
- 영어: 접속사(however, therefore, meanwhile, furthermore, in addition, for example, in fact, but, so)

2순위 분절 트리거: 운율적 휴지(pause) + 절 경계

분절 금지 규칙:
- 한국어 보조용언 앞(싶다, 내다, 간다, 하다)에서는 절대 분절하지 마세요
- 관형격조사 '의' 뒤 명사구 내부에서는 분절하지 마세요
- 영어 동사구 중간(전치사구 포함)에서는 분절하지 마세요

[발화 속도 적응]
- 빠른 화자(영어: 4토큰/초 이상, 한국어: 2.5토큰/초 이상): 더 짧은 단위로 분절
- 느린 화자: 의미 완결성을 위해 더 긴 단위로 묶어서 처리

[운영 규칙]
1. 동시 모드: 의미가 명확해지는 즉시 번역 시작
2. 자동 언어 감지: 발화된 언어가 ${getLanguageName(bottomLang)}인지 ${getLanguageName(topLang)}인지 자동 판별
3. 출력 형식: 모든 의미 단위에 대해 반드시 다음 형식으로 출력:
[ORIGINAL]: {원문}
[TRANSLATED]: {번역문}

4. 메타 발언 금지: 통역만 제공하고 설명이나 주석은 절대 추가하지 마세요
5. 누적 문맥 유지: 이전 발화의 주제(Theme)를 기억하여 대명사 지시체를 정확히 유지하세요`;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: async () => {
            setIsRecording(true);
            setIsConnecting(false);
            try {
              recorderRef.current = new AudioRecorder((base64) => {
                const session = sessionRef.current;
                if (session && session.readyState === WebSocket.OPEN) {
                  session.sendRealtimeInput({
                    audio: {
                      data: base64,
                      mimeType: "audio/pcm;rate=16000",
                    },
                  });
                }
              });
              await recorderRef.current.start();
            } catch (err: any) {
              console.error("Error starting recorder:", err);
              const details = getMicErrorDetails(err);
              setError(details.message);
              stopSession();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              playerRef.current?.playBase64Pcm(base64Audio, isEarphoneMode ? lastPanRef.current : 0);
            }

            const currentTurnText = message.serverContent?.modelTurn?.parts?.find(p => p.text)?.text;
            if (currentTurnText) {
              activeTurnBufferRef.current += currentTurnText;
              
              const modelText = activeTurnBufferRef.current;
              const originalMatch = modelText.match(/\[ORIGINAL\]:(.*?)(?=\[TRANSLATED\]|$)/s);
              const translatedMatch = modelText.match(/\[TRANSLATED\]:(.*)/s);

              const originalText = originalMatch ? originalMatch[1].trim() : "";
              const translatedText = translatedMatch ? translatedMatch[1].trim() : "";

              if (originalText || translatedText) {
                const detectionText = originalText || translatedText;
                const originalLang = guessLanguage(detectionText, bottomLang, topLang);
                const isUser = originalLang === bottomLang;
                
                lastPanRef.current = isUser ? -1 : 1;

                if (isUser) {
                   if (originalText) setBottomText(originalText);
                   if (translatedText) setTopText(translatedText);
                   setIsBottomActive(true);
                   setIsTopActive(false);
                } else {
                   if (originalText) setTopText(originalText);
                   if (translatedText) setBottomText(translatedText);
                   setIsTopActive(true);
                   setIsBottomActive(false);
                }

                // If turn is complete or we have a full pair, add to script then clear buffer for next chunk
                // Multimodal Live sometimes sends partial text.
              }
            }

            if (message.serverContent?.turnComplete) {
              const fullText = activeTurnBufferRef.current;
              const originalMatch = fullText.match(/\[ORIGINAL\]:(.*?)(?=\[TRANSLATED\]|$)/s);
              const translatedMatch = fullText.match(/\[TRANSLATED\]:(.*)/s);

              const originalText = originalMatch ? originalMatch[1].trim() : "";
              const translatedText = translatedMatch ? translatedMatch[1].trim() : "";

              if (originalText && translatedText) {
                const originalLang = guessLanguage(originalText, bottomLang, topLang);
                const isUser = originalLang === bottomLang;
                
                setScript(prev => [...prev, {
                  id: Math.random().toString(36).substring(7),
                  speaker: isUser ? 'user' : 'other',
                  speakerLabel: getLanguageName(originalLang),
                  originalText: originalText,
                  translatedText: translatedText,
                  isUser: isUser,
                  timestamp: Date.now()
                }]);
              }
              activeTurnBufferRef.current = "";
            }
          },
          onclose: () => {
            setIsRecording(false);
            setIsConnecting(false);
          },
          onerror: (err) => {
            console.error("Live session error:", err);
            // Clean up failed session resources before retrying
            try { recorderRef.current?.stop(); } catch {}
            recorderRef.current = null;
            try { sessionRef.current?.close(); } catch {}
            sessionRef.current = null;

            if (reconnectAttemptsRef.current < MAX_RECONNECT) {
              reconnectAttemptsRef.current += 1;
              const delay = Math.pow(2, reconnectAttemptsRef.current - 1) * 1000;
              reconnectTimerRef.current = window.setTimeout(() => {
                reconnectTimerRef.current = null;
                startSession();
              }, delay);
            } else {
              reconnectAttemptsRef.current = 0;
              setError(`연결 오류: ${MAX_RECONNECT}회 재시도 후 실패했습니다.`);
              stopSession();
            }
          },
        },
        config: {
          responseModalities: [Modality.TEXT, Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          systemInstruction: systemInstruction,
          outputAudioTranscription: {},
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Failed to connect to Gemini Live:", err);
      setError("통역 엔진을 초기화하지 못했습니다.");
      setIsConnecting(false);
      setIsRecording(false);
    }
  };

  const stopSession = () => {
    reconnectAttemptsRef.current = 0;
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setIsRecording(false);
    setIsConnecting(false);

    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current = null;
    }

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.warn("Error closing session:", e);
      }
      sessionRef.current = null;
    }
    
    setIsTopActive(false);
    setIsBottomActive(false);
    setBottomText("");
    setTopText("");
    activeTurnBufferRef.current = "";
  };

  const handleSaveSession = async () => {
    if (script.length === 0) return;
    setIsSaving(true);
    try {
      const summary = await generateSummary(script);
      const now = new Date();
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        title: `${getLanguageName(bottomLang)} ↔ ${getLanguageName(topLang)} 통역 세션`,
        langs: `${getLanguageName(bottomLang)} ↔ ${getLanguageName(topLang)}`,
        date: now.toLocaleDateString(),
        duration: "실시간 세션",
        participants: "대면 대화",
        type: "translate",
        summary,
        script,
      };
      saveHistoryItem(newItem);
      showToast("세션이 저장되었습니다.");
      setScript([]);
    } catch (e) {
      showToast("세션 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const [showBottomMenu, setShowBottomMenu] = useState(false);
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setHeaderTarget(document.getElementById("translate-header-controls"));
    
    const handleFullscreenChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isFullscreen: boolean }>;
      setIsFullscreen(customEvent.detail.isFullscreen);
    };

    window.addEventListener('fullscreen-change', handleFullscreenChange);
    return () => window.removeEventListener('fullscreen-change', handleFullscreenChange);
  }, []);

  return (
    <div className={`flex-1 flex flex-col w-full h-full bg-[#FAFAFA] overflow-hidden relative font-sans ${isFullscreen ? '' : 'pb-[72px] md:pb-0'}`}>
      {/* --- 상단 글로벌 헤더 (통역 전용) 포탈 --- */}
      {headerTarget && createPortal(
        <div className="flex items-center gap-1.5 md:gap-3">
          {/* 상단(상대방) 언어 설정 */}
          <div className="relative">
            <button 
              onClick={() => setShowTopMenu(!showTopMenu)}
              className="flex items-center gap-1 md:gap-2 px-2.5 py-1.5 md:px-3 bg-gray-50 border border-gray-200 rounded-full text-[10px] md:text-xs font-bold text-gray-700 shadow-sm transition-transform active:scale-95"
            >
              <span className="text-gray-400">상대:</span>
              <span className="font-extrabold text-primary">{getLanguageName(topLang)}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            <AnimatePresence>
              {showTopMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 top-full mt-2 w-32 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  {LANGUAGES.map(l => (
                    <button 
                      key={l.code}
                      onClick={() => { setTopLang(l.code); setShowTopMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-50 transition-colors ${topLang === l.code ? 'text-primary bg-primary/5' : 'text-gray-600'}`}
                    >
                      {l.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={swapLanguages} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowDownUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>

          {/* 하단(나) 언어 설정 */}
          <div className="relative">
            <button 
              onClick={() => setShowBottomMenu(!showBottomMenu)}
              className="flex items-center gap-1 md:gap-2 px-2.5 py-1.5 md:px-3 bg-gray-50 border border-gray-200 rounded-full text-[10px] md:text-xs font-bold text-gray-700 shadow-sm transition-transform active:scale-95"
            >
              <span className="text-gray-400">나:</span>
              <span className="font-extrabold text-primary">{getLanguageName(bottomLang)}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            <AnimatePresence>
              {showBottomMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 md:left-0 top-full mt-2 w-32 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  {LANGUAGES.map(l => (
                    <button 
                      key={l.code}
                      onClick={() => { setBottomLang(l.code); setShowBottomMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-50 transition-colors ${bottomLang === l.code ? 'text-primary bg-primary/5' : 'text-gray-600'}`}
                    >
                      {l.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>,
        headerTarget
      )}

      {/* --- 상단 영역 (상대방 시점) --- */}
      <section className="flex-1 relative overflow-hidden rotate-180 p-4 pb-2">
        <div className="h-full w-full bg-white rounded-[40px] shadow-sm border border-gray-100 flex flex-col overflow-hidden transition-all duration-500">
           {/* 정보 바 (상단) */}
           <div className="px-6 py-4 flex items-center justify-between bg-gray-50/30">
              <span className="text-[10px] uppercase tracking-tighter font-black text-gray-300">Partner View</span>
           </div>

           {/* 채팅 영역 (상단) */}
           <div className="flex-1 overflow-y-auto p-6 flex flex-col-reverse space-y-reverse space-y-6">
              <AnimatePresence>
                {script.slice().reverse().map((line) => (
                  <motion.div
                    key={`top-${line.id}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${line.speaker === 'other' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-[28px] px-6 py-5 ${line.speaker === 'other' ? 'bg-primary/5 text-primary' : 'bg-gray-100 text-gray-700'}`}>
                      <p className="text-[40px] font-black leading-[1.1] tracking-tight">{line.translatedText}</p>
                      <p className="text-sm mt-3 opacity-40 font-medium border-t border-current/10 pt-2">{line.originalText}</p>
                    </div>
                  </motion.div>
                ))}
                {isTopActive && topText && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                    <div className="bg-primary/10 rounded-[28px] px-6 py-5 animate-pulse max-w-[85%]">
                      <p className="text-primary font-black text-[40px] leading-[1.1] tracking-tight">{topText}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </section>

      {/* --- 중앙 컨트롤 바 --- */}
      <div className="h-0 relative z-[100] flex items-center justify-center">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white/90 backdrop-blur-2xl rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-white/50">
           {/* 이어폰 모드 토글 */}
           <button
             onClick={() => setIsEarphoneMode(!isEarphoneMode)}
             className={`p-2.5 rounded-full transition-all ${isEarphoneMode ? 'bg-primary text-white shadow-inner' : 'bg-gray-100/80 text-gray-400 hover:bg-gray-200'}`}
             title="이어폰 모드 (L/R 분리)"
           >
             <Headphones className="w-4 h-4" />
           </button>

           <div className="relative">
              {isRecording && (
                <div className="absolute -inset-3 bg-primary/20 rounded-full animate-ping"></div>
              )}
              <button
                onClick={isRecording ? stopSession : startSession}
                disabled={isConnecting}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-primary text-white hover:scale-105'}`}
              >
                {isConnecting ? <Loader2 className="w-6 h-6 animate-spin" /> : isRecording ? <X className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>
           </div>

           {/* 페어링 모드 (Bluetooth 시뮬레이션) */}
           <button
             onClick={() => {
               setIsPairingMode(!isPairingMode);
               if (!isPairingMode) {
                 setIsScanning(true);
                 setTimeout(() => setIsScanning(false), 2000);
               }
             }}
             className={`p-2.5 rounded-full transition-all ${isPairingMode ? 'bg-blue-500 text-white shadow-inner' : 'bg-gray-100/80 text-gray-400 hover:bg-gray-200'}`}
             title="블루투스 페어링 모드"
           >
             <Bluetooth className="w-4 h-4" />
           </button>
        </div>

        {/* 페어링 팝업 시뮬레이션 */}
        <AnimatePresence>
          {isPairingMode && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute top-20 w-64 bg-white border border-gray-100 p-5 rounded-[28px] shadow-2xl flex flex-col items-center text-center gap-3"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center relative">
                <Bluetooth className={`w-6 h-6 ${isScanning ? 'animate-pulse' : ''}`} />
                {isScanning && (
                  <div className="absolute inset-0 border-2 border-blue-500 rounded-xl animate-ping opacity-25"></div>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-800 text-sm">
                  {isScanning ? '기기 검색 중' : '기기 발견'}
                </h3>
                <p className="text-[10px] text-gray-500 leading-tight">
                  {isScanning ? '가장 가까운 사용자를 찾는 중...' : '암호화된 세션을 시작할 수 있습니다.'}
                </p>
              </div>
              {!isScanning && (
                <div className="w-full">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-[8px]">
                      UID
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-gray-700">USER_XYZ_789</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="w-full p-2 bg-gray-50 rounded-lg border border-dashed border-gray-200 font-mono text-[9px] font-bold text-gray-400">
                MY: {myUid}
              </div>
              <button 
                onClick={() => setIsPairingMode(false)}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-bold hover:bg-black transition-colors"
                disabled={isScanning}
              >
                {isScanning ? '검색 중...' : '블루투스 페어링'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- 하단 영역 (나의 시점) --- */}
      <section className="flex-1 relative overflow-hidden p-4 pt-2">
        <div className="h-full w-full bg-white rounded-[40px] shadow-sm border border-gray-100 flex flex-col overflow-hidden transition-all duration-500">
           {/* 정보 바 (하단) */}
           <div className="px-6 py-4 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-3">
                 {script.length > 0 && (
                   <button onClick={handleSaveSession} className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full">세션 저장</button>
                 )}
                 <span className="text-[10px] uppercase tracking-tighter font-black text-gray-300">My View</span>
              </div>
           </div>

           {/* 채팅 영역 (하단) */}
           <div 
             ref={chatScrollRef}
             className="flex-1 overflow-y-auto p-6 space-y-6"
           >
              <AnimatePresence>
                {script.length === 0 && !isRecording && !isConnecting && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20 transform translate-y-[-20px]">
                    <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mb-6">
                      <AudioWaveform className="w-10 h-10" />
                    </div>
                    <p className="font-bold text-lg max-w-[220px]">대화하려면 마이크를 누르세요.<br/><span className="text-sm font-medium">OneVoice가 실시간으로 통역합니다.</span></p>
                  </div>
                )}
                {script.map((line) => (
                  <motion.div
                    key={`bot-${line.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${line.isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-[28px] px-6 py-5 ${line.isUser ? 'bg-primary/5 text-primary' : 'bg-gray-100 text-gray-700'}`}>
                      <p className="text-[40px] font-black leading-[1.1] tracking-tight">{line.translatedText}</p>
                      <p className="text-sm mt-3 opacity-40 font-medium border-t border-current/10 pt-2">{line.originalText}</p>
                    </div>
                  </motion.div>
                ))}
                {isBottomActive && bottomText && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                    <div className="bg-primary/10 rounded-[28px] px-6 py-5 animate-pulse max-w-[85%]">
                      <p className="text-primary font-black text-[40px] leading-[1.1] tracking-tight">{bottomText}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </section>

      {/* 하단 에러 알림 */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[200] bg-red-500 text-white px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <TriangleAlert className="w-4 h-4" />
          {error}
        </div>
      )}
      {toast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold">
          {toast}
        </div>
      )}
    </div>
  );
}
