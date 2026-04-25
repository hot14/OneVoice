import { useState, useRef, useCallback, useEffect } from 'react';

// Type definitions for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeech(
  language: string,
  onTranscriptComplete: (transcript: string) => void
) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const onCompleteRef = useRef(onTranscriptComplete);

  useEffect(() => {
    onCompleteRef.current = onTranscriptComplete;
  }, [onTranscriptComplete]);

  // Initialize Speech Recognition once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const localeMap: Record<string, string> = { en: 'en-US', ko: 'ko-KR', ja: 'ja-JP' };
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = localeMap[language] || language;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const displayTranscript = finalTranscript || interimTranscript;
        setTranscript(displayTranscript);

        if (finalTranscript) {
          onCompleteRef.current(finalTranscript.trim());
          setIsListening(false);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn("Speech Recognition API is not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle language changes
  useEffect(() => {
    if (recognitionRef.current) {
      // Map standard short language codes to standard locales if needed
      const localeMap: Record<string, string> = {
        'en': 'en-US',
        'ko': 'ko-KR',
        'ja': 'ja-JP'
      };
      recognitionRef.current.lang = localeMap[language] || language;
    }
  }, [language]);

  const startListening = useCallback(() => {
    try {
      setTranscript('');
      setIsListening(true);
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (e) {
      console.error("Failed to stop speech recognition:", e);
    }
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  };
}

// Text to Speech Helper
export const speakText = (text: string, lang: string) => {
  if (!window.speechSynthesis) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'ko': 'ko-KR',
    'ja': 'ja-JP'
  };
  utterance.lang = localeMap[lang] || lang;
  
  // You can customize voice, pitch, and rate here if needed
  utterance.rate = 1.0;
  
  window.speechSynthesis.speak(utterance);
};
