/// <reference types="vite/client" />
import { useState, useEffect, useRef } from "react";
import { GoogleGenAI, Modality, LiveServerMessage, ThinkingLevel } from "@google/genai";
import { Mic, X, Volume2, Loader2, VolumeX } from "lucide-react";
import { AudioRecorder, AudioPlayer } from "../lib/audioUtils";
import { useLanguage, Language, languageNames } from "../contexts/LanguageContext";
import { auth, db } from "../firebase";
import { doc, collection, setDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { maskPII } from "../lib/piiFilter";
import { generateChatResponseCached } from "../lib/ragUtils";

// Note: Module-level conversationSummaryCache is now handled by semanticCache in ragUtils
// Keeping this for backward compatibility with existing sessions
const conversationSummaryCache = new Map<string, { summary: string; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Reconnection settings for Live API
const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 8000;

// Circuit breaker for reconnection
const CIRCUIT_BREAKER_THRESHOLD = 5;
let consecutiveFailures = 0;

interface InterpreterSessionProps {
  onClose: () => void;
}

export function InterpreterSession({
  onClose,
}: InterpreterSessionProps) {
  const { t, sourceLanguage, targetLanguage, uiLanguage } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInterrupted, setIsInterrupted] = useState(false); // Barge-in feedback
  const [error, setError] = useState<string | null>(null);
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const voiceFeedbackRef = useRef(true);
  const startTimeRef = useRef<number | null>(null);
  const durationRef = useRef<number>(0);

  // Reconnection state
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualStopRef = useRef(false);

  // Buffer queue for UI updates (using RAF)
  const sourceBufferRef = useRef<string[]>([]);
  const targetBufferRef = useRef<string[]>([]);
  const bufferTimerRef = useRef<number | null>(null);

  useEffect(() => {
    voiceFeedbackRef.current = voiceFeedbackEnabled;
  }, [voiceFeedbackEnabled]);
  
  const sourceTranscriptRef = useRef<string>("");
  const targetTranscriptRef = useRef<string>("");
  const sourceTranscriptDivRef = useRef<HTMLDivElement>(null);
  const targetTranscriptDivRef = useRef<HTMLDivElement>(null);

  const processBufferRAF = () => {
    if (sourceBufferRef.current.length > 0) {
      const text = sourceBufferRef.current.shift()!;
      sourceTranscriptRef.current += text;
      if (sourceTranscriptDivRef.current) {
        sourceTranscriptDivRef.current.textContent = sourceTranscriptRef.current;
        sourceTranscriptDivRef.current.scrollTop = sourceTranscriptDivRef.current.scrollHeight;
      }
    }
    if (targetBufferRef.current.length > 0) {
      const text = targetBufferRef.current.shift()!;
      targetTranscriptRef.current += text;
      if (targetTranscriptDivRef.current) {
        targetTranscriptDivRef.current.textContent = targetTranscriptRef.current;
        targetTranscriptDivRef.current.scrollTop = targetTranscriptDivRef.current.scrollHeight;
      }
    }
    // Continue processing if there are more items
    if (sourceBufferRef.current.length > 0 || targetBufferRef.current.length > 0) {
      bufferTimerRef.current = requestAnimationFrame(processBufferRAF);
    }
  };

  useEffect(() => {
    // Use requestAnimationFrame for smoother buffer processing
    bufferTimerRef.current = requestAnimationFrame(processBufferRAF);
    return () => {
      if (bufferTimerRef.current) {
        cancelAnimationFrame(bufferTimerRef.current);
      }
    };
  }, []);

  const sessionRef = useRef<any>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    return () => {
      isManualStopRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      stopSession();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      stopSession();
      startSession();
    }
  }, [sourceLanguage, targetLanguage]);

  /**
   * Attempt to reconnect with exponential backoff and circuit breaker
   */
  const attemptReconnect = () => {
    // Don't reconnect if manually stopped
    if (isManualStopRef.current) return;

    // Circuit breaker: prevent infinite retries
    if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      setError("Connection issues detected. Please refresh the page to try again.");
      setIsConnecting(false);
      console.warn(`Circuit breaker triggered after ${consecutiveFailures} consecutive failures`);
      return;
    }

    // Don't exceed max attempts
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      consecutiveFailures++;
      setError("Connection lost after multiple attempts. Please check your network and try again.");
      setIsConnecting(false);
      return;
    }

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_DELAY_MS
    );

    reconnectAttemptsRef.current++;
    setError(`Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      startSession();
    }, delay);
  };

  const getLanguageName = (lang: Language) => {
    return languageNames[lang].replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '').trim();
  };

  const startSession = async () => {
    // Reset manual stop flag and reconnection state for new session
    isManualStopRef.current = false;
    reconnectAttemptsRef.current = 0;

    try {
      setIsConnecting(true);
      setError(null);

      // Request microphone permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        throw new Error("Microphone permission denied. Please allow microphone access to use the interpreter.");
      }

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
      playerRef.current = new AudioPlayer();

      const speed = parseInt(localStorage.getItem('translationSpeed') || '3');
      // Increase temperature slightly for stability in fast modes
      const temperature = [0.7, 0.5, 0.4, 0.3, 0.25][speed - 1];
      const speedLabel = ["Precise", "Balanced", "Fast", "Very Fast", "Ultra-fast"][speed - 1];

      const systemInstruction = `당신은 세계 최고 수준의 '무중단 동시통역사'입니다. 사용자가 말하는 언어를 자동으로 감지하여, ${languageNames[sourceLanguage]} 또는 ${languageNames[targetLanguage]} 중 상대방의 언어로 실시간 음성 번역을 제공해야 합니다.

[Conversational Rules - ${speedLabel} 모드]
1. [가장 중요한 규칙]: 사용자가 문장을 끝마칠 때까지 기다리지 마십시오. 문장의 완성도보다 속도와 실시간성을 우선시하십시오.
2. 오디오 스트림에서 ${speed <= 2 ? '의미 단위가 파악되는 즉시' : '최소한의 단어만 파악되어도'}, 즉시 상대방의 언어로 번역하여 오디오를 출력하기 시작하십시오 (${speedLabel} 정책).
3. 사용자가 계속 말을 이어가고 있더라도, 당신은 입력된 앞부분에 대한 번역 음성을 동시에 병렬로 스트리밍하여 출력해야 합니다.
4. 원어 화자의 감정, 톤, 억양, 피치를 분석하고 번역된 음성에도 동일한 감정과 시급성을 반영하십시오.
5. 사용자가 더듬거나 추임새를 넣더라도 이를 무시하고 핵심 의미만 추출하여 매끄럽게 번역하십시오.
6. 번역이 불확실할 경우, 문맥을 빠르게 파악하여 가장 자연스러운 표현을 선택하십시오.

[Guardrails]
1. 질문에 대답하거나 AI로서 대화를 나누지 마십시오. 당신의 유일한 임무는 들리는 음성을 타겟 언어로 '번역'하는 것뿐입니다.
2. 환각(Hallucination)을 금지합니다. 들리지 않은 내용을 임의로 지어내어 번역하지 마십시오.`;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: async () => {
            // Reset circuit breaker on successful connection
            consecutiveFailures = 0;
            reconnectAttemptsRef.current = 0;
            
            setIsRecording(true);
            sourceTranscriptRef.current = "";
            targetTranscriptRef.current = "";
            if (sourceTranscriptDivRef.current) sourceTranscriptDivRef.current.textContent = "";
            if (targetTranscriptDivRef.current) targetTranscriptDivRef.current.textContent = "";
            startTimeRef.current = Date.now();

            try {
              recorderRef.current = new AudioRecorder((base64Data) => {
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({
                    audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
                  });
                });
              });
              await recorderRef.current.start();
              setIsConnecting(false);
            } catch (err) {
              console.error("Error starting audio recorder:", err);
              setError("Failed to start audio recorder: " + (err instanceof Error ? err.message : String(err)));
              stopSession();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle interruption
            if (message.serverContent?.interrupted && playerRef.current) {
              const start = performance.now();
              playerRef.current.flush();
              setIsInterrupted(true);
              setTimeout(() => setIsInterrupted(false), 500); // Visual feedback duration
              console.log(`Barge-in response time: ${performance.now() - start}ms`);
            }

            const base64Audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && playerRef.current && voiceFeedbackRef.current) {
              playerRef.current.playBase64Pcm(base64Audio);
            }

            // Handle transcriptions
            if (message.serverContent?.inputTranscription) {
              sourceBufferRef.current.push(maskPII(message.serverContent!.inputTranscription!.text) + " ");
            }
            if (message.serverContent?.outputTranscription) {
              targetBufferRef.current.push(maskPII(message.serverContent!.outputTranscription!.text) + " ");
            }
          },
          onerror: (err) => {
            // Don't attempt reconnect if manually stopped
            if (isManualStopRef.current) return;

            // Attempt reconnection with exponential backoff
            attemptReconnect();
          },
          onclose: () => {
            // Don't attempt reconnect if manually stopped or already reconnecting
            if (isManualStopRef.current || reconnectAttemptsRef.current > 0) return;
            attemptReconnect();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          systemInstruction: systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });

      sessionRef.current = sessionPromise;
    } catch (err) {
      console.error("Failed to start session:", err);
      setError(err instanceof Error ? err.message : "Failed to start the interpreter session.");
      setIsConnecting(false);
    }
  };

  const saveConversation = async () => {
    if (!auth.currentUser || !sourceTranscriptRef.current && !targetTranscriptRef.current) return;

    // Create cache key from transcript (first 100 chars of each)
    const sourceText = sourceTranscriptRef.current.trim();
    const targetText = targetTranscriptRef.current.trim();
    const cacheKey = `${sourceText.slice(0, 100)}_${targetText.slice(0, 100)}`;

    // Check cache to avoid duplicate API calls
    const cached = conversationSummaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log("Using cached conversation summary");
      // Still save to Firestore but skip API call
      try {
        const convRef = doc(collection(db, "users", auth.currentUser.uid, "conversations"));
        await setDoc(convRef, {
          summary: cached.summary,
          keyPoints: [],
          speakers: [],
          sourceTranscript: sourceText,
          targetTranscript: targetText,
          createdAt: serverTimestamp()
        });
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
          usageCount: increment(1),
          usageDuration: increment(durationRef.current)
        });
        durationRef.current = 0;
      } catch (err) {
        console.error("Failed to save cached conversation:", err);
      }
      return;
    }

    try {
      const prompt = `Analyze the following conversation transcript.
      1. Provide a concise summary of the conversation in ${getLanguageName(uiLanguage)}.
      2. Extract 3-5 key points in ${getLanguageName(uiLanguage)}.
      3. Identify the speakers based on the transcript (e.g., Speaker 1, Speaker 2).

      Transcript:
      Source: ${sourceTranscriptRef.current}
      Target: ${targetTranscriptRef.current}

      Return the response as a JSON object with the following structure:
      {
        "summary": "...",
        "keyPoints": ["...", "..."],
        "speakers": ["...", "..."]
      }
      `;

      // Use semantic cache wrapper for API call
      const { response: responseText, cached } = await generateChatResponseCached(
        prompt,
        import.meta.env.VITE_GEMINI_API_KEY || '',
        undefined,
        undefined,
        "json"
      );

      console.log(cached ? "Using cached conversation summary" : "Fresh API call for summary");

      const data = JSON.parse(responseText || "{}");

      // Store in cache for future duplicate calls
      if (data.summary) {
        conversationSummaryCache.set(cacheKey, { summary: data.summary, timestamp: Date.now() });
      }

      // Save to Firestore
      const convRef = doc(collection(db, "users", auth.currentUser.uid, "conversations"));
      await setDoc(convRef, {
        ...data,
        sourceTranscript: sourceTranscriptRef.current,
        targetTranscript: targetTranscriptRef.current,
        createdAt: serverTimestamp()
      });
      
      // Increment usageCount and add duration
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        usageCount: increment(1),
        usageDuration: increment(durationRef.current)
      });
      
      durationRef.current = 0; // Reset duration
    } catch (err) {
      console.error("Failed to save conversation:", err);
    }
  };

  const stopSession = () => {
    // Mark as manual stop to prevent reconnection attempts
    isManualStopRef.current = true;

    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;

    if (startTimeRef.current) {
      durationRef.current += (Date.now() - startTimeRef.current) / 1000;
      startTimeRef.current = null;
    }

    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current
        .then((session: any) => session.close())
        .catch(() => {}); // Ignore close errors
      sessionRef.current = null;
    }
    setIsRecording(false);
    setIsConnecting(false);

    // Save conversation if there is transcript
    if (sourceTranscriptRef.current || targetTranscriptRef.current) {
      saveConversation();
    }
  };

  return (
    <div className={`fixed inset-0 bg-[#E4E3E0] z-50 flex flex-col transition-colors duration-200 ${isInterrupted ? 'ring-4 ring-red-500' : ''}`}>
      {/* Header */}
      <div className="p-3 border-b border-[#141414] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border border-[#141414] flex items-center justify-center text-sm">
            🗣️
          </div>
          <div>
            <h2 className="font-serif italic text-xs uppercase tracking-wider">{t("app.title")}</h2>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[#141414]/50 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? "bg-green-500" : "bg-gray-400"}`}></span>
              {isRecording ? "Live" : "Ready"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
          className={`p-1.5 border border-[#141414] ${voiceFeedbackEnabled ? "bg-white text-[#141414]" : "bg-[#141414] text-white"}`}
        >
          {voiceFeedbackEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
        <button
          onClick={() => {
            stopSession();
            onClose();
          }}
          className="p-1.5 border border-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Split Screen Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Source Language Side */}
        <div className="flex-1 p-4 flex flex-col bg-white border-b border-[#141414] overflow-hidden">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#141414]/50 mb-2">{getLanguageName(sourceLanguage)}</h3>
          <div ref={sourceTranscriptDivRef} className="flex-1 overflow-y-auto font-serif text-lg sm:text-xl text-[#141414] leading-snug">
            Waiting for input...
          </div>
        </div>

        {/* Target Language Side */}
        <div className="flex-1 p-4 flex flex-col bg-[#141414] text-white overflow-hidden">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-white/50 mb-2">{getLanguageName(targetLanguage)}</h3>
          <div ref={targetTranscriptDivRef} className="flex-1 overflow-y-auto font-serif text-lg sm:text-xl leading-snug">
            Interpretation will appear here...
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="p-4 border-t border-[#141414] bg-white flex justify-center shrink-0">
        {error ? (
          <div className="text-[#141414] text-center p-3 border border-red-500 bg-red-100 w-full">
            <p className="font-bold font-mono uppercase text-xs">Error</p>
            <p className="font-mono text-[10px]">{error}</p>
          </div>
        ) : (
          <button
            onClick={isRecording ? stopSession : startSession}
            className={`w-full max-w-sm py-3 border-2 border-[#141414] font-mono font-bold text-base uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(20,20,20,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] ${isRecording ? "bg-white text-[#141414]" : "bg-[#141414] text-white"}`}
          >
            {isConnecting ? "Connecting..." : isRecording ? "Stop" : "Start"}
          </button>
        )}
      </div>
    </div>
  );
}
