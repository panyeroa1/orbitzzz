"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: any) => any) | null;
  onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export interface TranscriptSegment {
  text: string;
  timestamp: string;
  isFinal: boolean;
  confidence?: number;
  language?: string;
}

interface UseWebSpeechOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface UseWebSpeechReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  segments: TranscriptSegment[];
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setLanguage: (lang: string) => void;
}

export function useWebSpeech(
  options: UseWebSpeechOptions = {}
): UseWebSpeechReturn {
  const {
    language = "en-US",
    continuous = true,
    interimResults = true,
    maxAlternatives = 1,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState(language);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (!SpeechRecognition) {
      setError(
        "Web Speech API is not supported in this browser. Please use Chrome or Edge."
      );
    }
  }, []);

  // Initialize recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = currentLanguage;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = maxAlternatives;

    recognition.onstart = () => {
      console.log("[WebSpeech] Recognition started");
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: Event) => {
      const speechEvent = event as SpeechRecognitionEvent;
      let interimText = "";
      let finalText = "";

      for (let i = speechEvent.resultIndex; i < speechEvent.results.length; i++) {
        const result = speechEvent.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          finalText += transcriptText + " ";
          
          // Add to segments
          const segment: TranscriptSegment = {
            text: transcriptText,
            timestamp: new Date().toISOString(),
            isFinal: true,
            confidence: result[0].confidence,
            language: currentLanguage,
          };

          setSegments((prev) => [...prev, segment]);
          setTranscript((prev) => prev + transcriptText + " ");
        } else {
          interimText += transcriptText;
        }
      }

      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: Event) => {
      const errorEvent = event as SpeechRecognitionErrorEvent;
      console.error("[WebSpeech] Error:", errorEvent.error);
      
      if (errorEvent.error === "no-speech") {
        setError("No speech detected. Please try again.");
      } else if (errorEvent.error === "audio-capture") {
        setError("No microphone found. Please check your device.");
      } else if (errorEvent.error === "not-allowed") {
        setError("Microphone permission denied. Please allow access.");
      } else {
        setError(`Recognition error: ${errorEvent.error}`);
      }
      
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      console.log("[WebSpeech] Recognition ended");
      
      // Auto-restart if still supposed to be listening
      if (isListeningRef.current && continuous) {
        try {
          recognition.start();
        } catch (err) {
          console.log("[WebSpeech] Could not restart:", err);
          setIsListening(false);
          isListeningRef.current = false;
        }
      } else {
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported, currentLanguage, continuous, interimResults, maxAlternatives]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return;

    try {
      recognitionRef.current.start();
      isListeningRef.current = true;
      setError(null);
    } catch (err) {
      console.error("[WebSpeech] Error starting recognition:", err);
      setError("Failed to start recognition. Please try again.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListeningRef.current) return;

    isListeningRef.current = false;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setSegments([]);
    setError(null);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    const wasListening = isListeningRef.current;
    
    if (wasListening) {
      stopListening();
    }
    
    setCurrentLanguage(lang);
    
    if (wasListening) {
      setTimeout(() => startListening(), 100);
    }
  }, [startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    segments,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setLanguage,
  };
}
