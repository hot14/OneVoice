/// <reference types="vite/client" />
import { useState, useEffect, useRef } from "react";
import { GoogleGenAI, Modality, LiveServerMessage, Type } from "@google/genai";
import { Mic, MicOff, X, Volume2, Loader2 } from "lucide-react";
import { AudioRecorder, AudioPlayer } from "../lib/audioUtils";
import { useLanguage } from "../contexts/LanguageContext";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";
import { retrieveRelevantChunks, generateChatResponse } from "../lib/ragUtils";

interface TutorSessionProps {
  onClose: () => void;
  onLessonComplete?: (lessonData: any) => void;
  topic?: string;
}

export function TutorSession({
  onClose,
  onLessonComplete,
  topic,
}: TutorSessionProps) {
  const { t, sourceLanguage } = useLanguage();
  const language = sourceLanguage;
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<
    { role: "user" | "tutor"; text: string }[]
  >([]);
  const transcriptRef = useRef<{ role: "user" | "tutor"; text: string }[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  const sessionRef = useRef<any>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Fetch user profile on mount
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setUserProfile(snap.data());
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };
    fetchProfile();

    return () => {
      stopSession();
    };
  }, []);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setSessionStartTime(Date.now());

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      playerRef.current = new AudioPlayer();

      const userLang =
        (userProfile?.nativeLanguage || language) === "ko"
          ? "Korean"
          : "English";
      const userLevel = userProfile?.level || 1;
      const userGoals = userProfile?.learningGoals || "None specified";
      let currentMaterial = "None provided";
      let materialIds: string[] = [];
      if (userProfile?.currentMaterial) {
        try {
          const parsed = JSON.parse(userProfile.currentMaterial);
          if (Array.isArray(parsed) && parsed.length > 0) {
            materialIds = parsed.map((m: any) => m.id);
            currentMaterial = parsed.map((m: any) => `--- Document: ${m.name} ---\nSummary: ${m.content}`).join('\n\n');
          } else {
            currentMaterial = userProfile.currentMaterial;
          }
        } catch (e) {
          currentMaterial = userProfile.currentMaterial;
        }
      }
      const specificTopic = topic
        ? `\nTODAY'S SPECIFIC LESSON TOPIC: "${topic}"\nYou MUST focus the entire lesson primarily on this topic.`
        : "";

      const systemInstruction = `You are 'English Tutor', a native English speaker from New York City. You are teaching English to a student who speaks ${userLang}.
You have studied ${userLang} extensively and speak it very well, so you will use ${userLang} to explain concepts, grammar, and meanings.
The user's current English level is ${userLevel}.
User's specific learning goals/requests: "${userGoals}".
User's provided study material:
"""
${currentMaterial}
"""${specificTopic}

CRITICAL PERSONA AND PRONUNCIATION RULE (STRICTLY ENFORCED):
1. You are a native English speaker from New York City. You speak with a natural, confident New York accent, perfect intonation, and natural English rhythm.
2. When you speak ${userLang}, you speak it as a fluent foreigner. It is completely fine and expected if your ${userLang} sounds like a New Yorker speaking it, but your English MUST sound 100% native New Yorker.
3. NEVER use ${userLang} pronunciation habits when speaking English.

REAL-TIME PRONUNCIATION COACHING (MANDATORY):
- You MUST listen to the user's spoken English in real-time.
- Provide IMMEDIATE and SPECIFIC feedback on their pronunciation.
- Focus on:
  a) INTONATION: Correct the overall sentence melody, incorporating New York rhythm.
  b) SOUNDS: English has specific phonemes. Correct specific sounds, especially those difficult for ${userLang} speakers.
- Use ${userLang} to explain how to position the tongue or mouth to achieve the correct sound.
- Be proactive. If you hear a mistake, INTERRUPT gently and ask them to repeat it correctly.

TEACHING METHODOLOGY (PROACTIVE & SYSTEMATIC):
Do NOT passively ask "What do you want to learn today?". Instead, LEAD the lesson based on a systematic curriculum for their level.
- If the user provided study material, you MUST use it as the basis for the lesson. Read it, explain it, and practice it with the user.
- If no material is provided, start with basic greetings, common phrases, basic grammar, or simple verbs for beginners.
- Remember their specific learning goals and incorporate them into the lesson.
- Start the session by warmly greeting the user in English and ${userLang}, briefly stating what you will teach today, and immediately starting the first exercise.
- Listen to their pronunciation carefully. Provide gentle, constructive feedback in ${userLang}.
- If their pronunciation is wrong, correct them by repeating the word clearly in English with exaggerated, clear native New Yorker sounds.
- Explicitly point out grammar rules and pronunciation nuances when correcting, especially focusing on L1 interference from ${userLang}.`;

      const liveApiProvider = userProfile?.liveApiProvider || "gemini";

      if (liveApiProvider === "gemini") {
        const sessionPromise = ai.live.connect({
          model: "gemini-3.1-flash-live-preview",
          callbacks: {
            onopen: () => {
              setIsConnecting(false);
              setIsRecording(true);

              recorderRef.current = new AudioRecorder((base64Data) => {
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({
                    audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
                  });
                });
              });
              recorderRef.current.start();
            },
            onmessage: async (message: LiveServerMessage) => {
              const base64Audio =
                message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio && playerRef.current) {
                playerRef.current.playBase64Pcm(base64Audio);
              }

              if (message.serverContent?.interrupted && playerRef.current) {
                playerRef.current.stop();
                playerRef.current = new AudioPlayer(); // Reset player
              }

              // Handle transcription
              // Model output transcription
              const modelTranscription =
                message.serverContent?.modelTurn?.parts?.find((p) => p.text)
                  ?.text ||
                (message.serverContent as any)?.outputTranscription?.parts?.find(
                  (p: any) => p.text,
                )?.text ||
                (message.serverContent as any)?.outputTranscription?.text;
              if (modelTranscription) {
                setTranscript((prev) => {
                  const last = prev[prev.length - 1];
                  let newTranscript;
                  if (last && last.role === "tutor") {
                    newTranscript = [
                      ...prev.slice(0, -1),
                      { ...last, text: last.text + modelTranscription },
                    ];
                  } else {
                    newTranscript = [
                      ...prev,
                      { role: "tutor" as const, text: modelTranscription },
                    ];
                  }
                  transcriptRef.current = newTranscript;
                  return newTranscript;
                });
              }

              // User input transcription
              const userTranscription =
                (message.serverContent as any)?.inputTranscription?.parts?.find(
                  (p: any) => p.text,
                )?.text ||
                (message.serverContent as any)?.inputTranscription?.text ||
                (message.serverContent as any)?.interrupted?.parts?.find(
                  (p: any) => p.text,
                )?.text;
              if (userTranscription) {
                setTranscript((prev) => {
                  const last = prev[prev.length - 1];
                  let newTranscript;
                  if (last && last.role === "user") {
                    newTranscript = [
                      ...prev.slice(0, -1),
                      { ...last, text: last.text + userTranscription },
                    ];
                  } else {
                    newTranscript = [
                      ...prev,
                      { role: "user" as const, text: userTranscription },
                    ];
                  }
                  transcriptRef.current = newTranscript;
                  return newTranscript;
                });
              }

              if (message.toolCall) {
                const functionCalls = message.toolCall.functionCalls;
                if (functionCalls) {
                  const responses = await Promise.all(functionCalls.map(async (call) => {
                    if (call.name === "getRelevantMaterialContext") {
                      const query = (call.args as any).query;
                      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
                      if (apiKey && materialIds.length > 0) {
                        try {
                          const apiSettings = {
                            provider: userProfile?.embeddingApiProvider || userProfile?.apiProvider || "gemini",
                            baseUrl: userProfile?.embeddingApiBaseUrl || userProfile?.customApiBaseUrl || "",
                            apiKey: userProfile?.embeddingApiKey || userProfile?.customApiKey || "",
                            model: userProfile?.embeddingApiModel || userProfile?.customApiEmbeddingModel || ""
                          };
                          const chunks = await retrieveRelevantChunks(query, materialIds, apiKey, apiSettings, 3);
                          return {
                            id: call.id,
                            name: call.name,
                            response: { result: chunks.map(c => c.text).join('\n\n---\n\n') }
                          };
                        } catch (e) {
                          return { id: call.id, name: call.name, response: { error: "Failed to retrieve context" } };
                        }
                      }
                      return { id: call.id, name: call.name, response: { error: "No materials available or API key missing" } };
                    }
                    return { id: call.id, name: call.name, response: { error: "Unknown function" } };
                  }));
                  
                  sessionPromise.then(session => {
                    session.sendToolResponse({ functionResponses: responses });
                  });
                }
              }
            },
            onerror: (err) => {
              console.error("Live API Error:", err);
              setError(t("tutor.error"));
              stopSession();
            },
            onclose: () => {
              stopSession();
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
            },
            systemInstruction: systemInstruction,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            tools: [{ functionDeclarations: [{
              name: "getRelevantMaterialContext",
              description: "Retrieves relevant chunks of text from the user's uploaded study materials based on a search query. Use this when the user asks a question about their documents or when you need more context from the materials.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  query: {
                    type: Type.STRING,
                    description: "The search query to find relevant information in the documents."
                  }
                },
                required: ["query"]
              }
            }]}]
          },
        });

        sessionRef.current = sessionPromise;
      } else if (liveApiProvider === "openai") {
        const pc = new RTCPeerConnection();
        const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
        pc.addTrack(ms.getTracks()[0]);

        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioRef.current = audioEl;
        pc.ontrack = e => {
          audioEl.srcObject = e.streams[0];
        };

        sessionRef.current = {
          close: () => {
            pc.close();
            ms.getTracks().forEach(track => track.stop());
          }
        };

        const dc = pc.createDataChannel("oai-events");
        dc.addEventListener("message", (e) => {
          const msg = JSON.parse(e.data);
          if (msg.type === "response.audio_transcript.delta") {
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              let newTranscript;
              if (last && last.role === "tutor") {
                newTranscript = [...prev.slice(0, -1), { ...last, text: last.text + msg.delta }];
              } else {
                newTranscript = [...prev, { role: "tutor" as const, text: msg.delta }];
              }
              transcriptRef.current = newTranscript;
              return newTranscript;
            });
          }
          if (msg.type === "conversation.item.input_audio_transcription.completed") {
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              let newTranscript;
              if (last && last.role === "user") {
                newTranscript = [...prev.slice(0, -1), { ...last, text: last.text + msg.transcript }];
              } else {
                newTranscript = [...prev, { role: "user" as const, text: msg.transcript }];
              }
              transcriptRef.current = newTranscript;
              return newTranscript;
            });
          }
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const baseUrl = userProfile?.liveApiBaseUrl || "https://api.openai.com/v1/realtime";
        const model = userProfile?.liveApiModel || "gpt-4o-realtime-preview-2024-12-17";
        const apiKey = userProfile?.liveApiKey || "";

        const response = await fetch(`${baseUrl}?model=${model}`, {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/sdp"
          }
        });

        if (!response.ok) {
          throw new Error(`OpenAI WebRTC Error: ${response.statusText}`);
        }

        const answer = { type: "answer" as RTCSdpType, sdp: await response.text() };
        await pc.setRemoteDescription(answer);

        dc.addEventListener("open", () => {
          dc.send(JSON.stringify({
            type: "session.update",
            session: {
              instructions: systemInstruction,
              voice: userProfile?.liveApiVoice || "alloy",
              input_audio_transcription: { model: "whisper-1" }
            }
          }));
          dc.send(JSON.stringify({
            type: "response.create",
            response: {
              instructions: "Start the session by warmly greeting the user."
            }
          }));
        });

        setIsConnecting(false);
        setIsRecording(true);
      } else if (liveApiProvider === "custom_turn_based") {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          throw new Error("Speech Recognition is not supported in this browser.");
        }
        
        const recognition = new SpeechRecognition();
        recognition.lang = "th-TH";
        recognition.continuous = false;
        recognition.interimResults = false;

        let isSessionActive = true;

        sessionRef.current = {
          close: () => {
            isSessionActive = false;
            recognition.stop();
            window.speechSynthesis.cancel();
          }
        };

        recognition.onresult = async (event: any) => {
          if (!isSessionActive) return;
          const userText = event.results[0][0].transcript;
          
          setTranscript((prev) => {
            const newTranscript = [...prev, { role: "user" as const, text: userText }];
            transcriptRef.current = newTranscript;
            return newTranscript;
          });
          
          try {
            const baseUrl = userProfile?.liveApiBaseUrl || "https://api.openai.com/v1/chat/completions";
            const apiKey = userProfile?.liveApiKey || "";
            const model = userProfile?.liveApiModel || "gpt-4o";

            const res = await fetch(baseUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: model,
                messages: [
                  { role: "system", content: systemInstruction },
                  ...transcriptRef.current.map(t => ({ role: t.role === "tutor" ? "assistant" : "user", content: t.text }))
                ]
              })
            });

            if (!res.ok) throw new Error("Chat API failed");
            const data = await res.json();
            const tutorText = data.choices[0].message.content;
            
            setTranscript((prev) => {
              const newTranscript = [...prev, { role: "tutor" as const, text: tutorText }];
              transcriptRef.current = newTranscript;
              return newTranscript;
            });

            const utterance = new SpeechSynthesisUtterance(tutorText);
            utterance.lang = "th-TH";
            utterance.onend = () => {
              if (isSessionActive) recognition.start();
            };
            window.speechSynthesis.speak(utterance);
          } catch (err) {
            console.error(err);
            setError("Failed to get response from custom API.");
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech' && isSessionActive) {
            console.error("Speech recognition error", event.error);
          }
        };

        const initialGreeting = "Hello! How can I help you today?";
        setTranscript((prev) => {
          const newTranscript = [...prev, { role: "tutor" as const, text: initialGreeting }];
          transcriptRef.current = newTranscript;
          return newTranscript;
        });
        const utterance = new SpeechSynthesisUtterance(initialGreeting);
        utterance.lang = "th-TH";
        utterance.onend = () => {
          if (isSessionActive) recognition.start();
        };
        window.speechSynthesis.speak(utterance);

        setIsConnecting(false);
        setIsRecording(true);
      }
    } catch (err) {
      console.error("Failed to start session:", err);
      setError("Failed to start the tutor session.");
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current = null;
    }
    if (sessionRef.current) {
      if (sessionRef.current.then) {
        sessionRef.current
          .then((session: any) => session.close())
          .catch(console.error);
      } else if (sessionRef.current.close) {
        sessionRef.current.close();
      }
      sessionRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    setIsRecording(false);
    setIsConnecting(false);

    // Save lesson history if we have some transcript
    if (transcriptRef.current.length > 0) {
      saveLessonHistory(transcriptRef.current);
      transcriptRef.current = []; // Reset after saving
    }
  };

  const saveLessonHistory = async (
    finalTranscript: { role: "user" | "tutor"; text: string }[],
  ) => {
    try {
      if (!auth.currentUser) return;

      const lessonId = Date.now().toString();
      const lessonRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "lessons",
        lessonId,
      );
      const userRef = doc(db, "users", auth.currentUser.uid);

      const userLang =
        (userProfile?.nativeLanguage || language) === "ko"
          ? "Korean (한국어)"
          : "English";

      // Generate summary and feedback using configured Chat API
      const chatApiSettings = {
        provider: userProfile?.chatApiProvider || "gemini",
        baseUrl: userProfile?.chatApiBaseUrl || "",
        apiKey: userProfile?.chatApiKey || "",
        model: userProfile?.chatApiModel || ""
      };
      const apiKey = process.env.GEMINI_API_KEY || "";
      
      const prompt = `Analyze the following transcript of an English language tutoring session.

CRITICAL LANGUAGE INSTRUCTION:
The user's preferred language is ${userLang}. 
You MUST write the content for "topic", "summary", "feedback", "learningTips", "levelReasoning", and the "meaning" of expressions ENTIRELY in ${userLang}. 
If ${userLang} is Korean, your output must be in natural-sounding Korean. Do NOT output these fields in English.

You must also evaluate the user's overall English proficiency level based on this session, using the following 1-10 scale:
1: Absolute Beginner (Greetings, basic words)
2: Beginner (Simple sentences, survival English)
3: Upper Beginner (Short daily conversations)
4: Pre-Intermediate (Past/future, basic conjunctions)
5: Intermediate (Sustained conversations on familiar topics)
6: Upper Intermediate (Express opinions, understand natural speed)
7: Pre-Advanced (Abstract topics, media comprehension)
8: Advanced (Fluent in social/professional settings)
9: Upper Advanced (Idioms, nuances, complex vocabulary)
10: Master (Near-native)

Provide a JSON response with the following keys:
- "topic": A short, descriptive title for the lesson (MUST be in ${userLang}).
- "summary": A brief summary of what was discussed and practiced (MUST be in ${userLang}).
- "feedback": Constructive feedback for the student (MUST be in ${userLang}).
- "learningTips": Actionable tips for the user to improve based on this session (MUST be in ${userLang}).
- "expGained": An object with 4 keys: "vocabulary", "grammar", "pronunciation", "listening". Assign an EXP (Experience Points) value from 10 to 50 for each skill based on their effort and performance in this session.
- "acquiredExpressions": An array of objects representing 5-10 key Thai expressions, words, or example sentences the user successfully practiced, learned, or should review today. Each object should have "thai" (the Thai word/phrase), "meaning" (the meaning, MUST be in ${userLang}), "exampleSentence" (a helpful example sentence in Thai), and "exampleMeaning" (the meaning of the example sentence in ${userLang}).
- "diagnosedLevel": A number from 1 to 10 representing their current level based on the rubric above.
- "levelReasoning": A brief explanation of why you assigned this level (MUST be in ${userLang}).

Transcript:
${finalTranscript.map((t) => `${t.role === "tutor" ? "Tutor" : "Student"}: ${t.text}`).join("\n")}
`;

      let topic = "Live Conversation";
      let summary = "";
      let feedback = "";
      let expGained = {
        vocabulary: 10,
        grammar: 10,
        pronunciation: 10,
        listening: 10,
      };
      let acquiredExpressions: any[] = [];
      let learningTips = "";
      let diagnosedLevel = userProfile?.level || 1;
      let levelReasoning = "";

      try {
        const systemInstruction = `You are an expert language tutor evaluator. You MUST write all your analysis, feedback, and summaries in ${userLang}. Never use English unless the requested language is English.`;
        const responseText = await generateChatResponse(prompt, apiKey, chatApiSettings, systemInstruction, "json");
        const result = JSON.parse(responseText || "{}");
        topic = result.topic || topic;
        summary = result.summary || "";
        feedback = result.feedback || "";
        expGained = result.expGained || expGained;
        acquiredExpressions = result.acquiredExpressions || [];
        learningTips = result.learningTips || "";
        diagnosedLevel = result.diagnosedLevel || diagnosedLevel;
        levelReasoning = result.levelReasoning || "";
      } catch (genErr) {
        console.error("Failed to generate summary:", genErr);
      }

      const durationSeconds = sessionStartTime
        ? Math.floor((Date.now() - sessionStartTime) / 1000)
        : 0;

      const lessonData = {
        id: lessonId,
        topic: topic,
        durationSeconds: durationSeconds,
        transcript: finalTranscript,
        summary: summary,
        feedback: feedback,
        learningTips: learningTips,
        expGained: expGained,
        acquiredExpressions: acquiredExpressions,
        diagnosedLevel: diagnosedLevel,
        levelReasoning: levelReasoning,
        completedAt: serverTimestamp(),
      };

      await setDoc(lessonRef, lessonData);

      // Save acquired expressions to vocabulary
      if (acquiredExpressions && acquiredExpressions.length > 0) {
        for (const expr of acquiredExpressions) {
          if (expr.thai && expr.meaning) {
            const vocabId =
              Date.now().toString() + Math.random().toString(36).substring(7);
            const vocabRef = doc(
              db,
              "users",
              auth.currentUser.uid,
              "vocabulary",
              vocabId,
            );
            await setDoc(vocabRef, {
              id: vocabId,
              thai: expr.thai,
              meaning: expr.meaning,
              exampleSentence: expr.exampleSentence || "",
              exampleMeaning: expr.exampleMeaning || "",
              pronunciation: "", // Can be added later or generated
              mastery: 0,
              notes: topic
                ? `Learned from lesson: ${topic}`
                : "Learned from Live Session",
              createdAt: serverTimestamp(),
            });
          }
        }
      }

      // Update User Profile Skills (EXP) and Level
      const currentSkills = userProfile?.skills || {
        vocabulary: 0,
        grammar: 0,
        pronunciation: 0,
        listening: 0,
      };
      const newSkills = {
        vocabulary:
          (currentSkills.vocabulary || 0) + (expGained.vocabulary || 0),
        grammar: (currentSkills.grammar || 0) + (expGained.grammar || 0),
        pronunciation:
          (currentSkills.pronunciation || 0) + (expGained.pronunciation || 0),
        listening: (currentSkills.listening || 0) + (expGained.listening || 0),
      };

      // Only upgrade level if diagnosed level is higher, or if they are just starting out
      const newLevel = Math.max(userProfile?.level || 1, diagnosedLevel);

      const updateData: any = {
        skills: {
          vocabulary: (currentSkills.vocabulary || 0) + (expGained.vocabulary || 0),
          grammar: (currentSkills.grammar || 0) + (expGained.grammar || 0),
          pronunciation: (currentSkills.pronunciation || 0) + (expGained.pronunciation || 0),
          listening: (currentSkills.listening || 0) + (expGained.listening || 0),
          speaking: currentSkills.speaking || 0,
          reading: currentSkills.reading || 0,
          writing: currentSkills.writing || 0,
        },
        level: newLevel,
      };
      if (learningTips) updateData.learningTips = learningTips;

      // Update roadmap progress if a topic was provided and matched
      if (topic && userProfile?.roadmap?.steps) {
        const updatedSteps = userProfile.roadmap.steps.map((step: any) => {
          if (step.title === topic) {
            return { ...step, completed: true };
          }
          return step;
        });
        updateData.roadmap = {
          ...userProfile.roadmap,
          steps: updatedSteps,
        };
      }

      await setDoc(userRef, {
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || 'Learner',
        email: auth.currentUser.email || '',
        photoURL: auth.currentUser.photoURL || '',
        ...updateData
      }, { merge: true });

      // Notify parent component to show report card
      if (onLessonComplete) {
        onLessonComplete({ ...lessonData, completedAt: new Date() }); // Pass a mock date for immediate UI display
      }
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${auth.currentUser?.uid}/lessons`,
      );
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopSession();
    } else {
      startSession();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm z-50 flex items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-full sm:h-[85vh]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-xl">
              🇺🇸
            </div>
            <div>
              <h2 className="font-bold text-gray-900">English Tutor</h2>
              <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {t("tutor.aiTutor")}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSession();
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
          {error ? (
            <div className="text-red-500 text-center mb-4 p-4 bg-red-50 rounded-xl">
              {error}
            </div>
          ) : (
            <>
              <div
                className={`w-48 h-48 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${isRecording ? "bg-indigo-100 scale-110 shadow-[0_0_40px_rgba(99,102,241,0.4)]" : "bg-gray-100"}`}
              >
                {isConnecting ? (
                  <Loader2 className="w-16 h-16 text-indigo-400 animate-spin" />
                ) : isRecording ? (
                  <Volume2 className="w-20 h-20 text-indigo-600 animate-pulse" />
                ) : (
                  <MicOff className="w-16 h-16 text-gray-400" />
                )}
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isConnecting
                  ? t("tutor.connecting")
                  : isRecording
                    ? t("tutor.listening")
                    : t("tutor.ready")}
              </h3>
              {topic && (
                <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-indigo-100">
                  {topic}
                </div>
              )}
              <p className="text-gray-500 text-center max-w-xs mb-8">
                {isRecording ? t("tutor.descRec") : t("tutor.descWait")}
              </p>
            </>
          )}

          <button
            onClick={toggleRecording}
            disabled={isConnecting}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600"
                : "bg-indigo-600 hover:bg-indigo-700"
            } ${isConnecting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isRecording ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
