"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface TranscriptSegment {
  text: string;
  timestamp: string;
  isFinal: boolean;
  confidence?: number;
  language?: string;
}

interface UseCloudTranscriptionOptions {
  language?: string;
  continuous?: boolean;
}

interface UseCloudTranscriptionReturn {
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

export function useCloudTranscription(
  options: UseCloudTranscriptionOptions = {}
): UseCloudTranscriptionReturn {
  const {
    language = "en-US",
    continuous = true,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true); // Cloud API is always supported
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState(language);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    audioChunksRef.current = [];
  }, []);

  // Send audio to cloud API for transcription
  const sendAudioForTranscription = useCallback(async (audioBlob: Blob) => {
    try {
      setInterimTranscript("Processing...");
      
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("language", currentLanguage);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Transcription failed");
      }

      const data = await response.json();
      
      if (data.text && data.text.trim()) {
        const segment: TranscriptSegment = {
          text: data.text.trim(),
          timestamp: new Date(data.timestamp).toISOString(),
          isFinal: true,
          language: data.language,
        };

        setSegments((prev) => [...prev, segment]);
        setTranscript((prev) => prev + data.text.trim() + " ");
      }
      
      setInterimTranscript("");
    } catch (err: any) {
      console.error("[CloudTranscription] Error:", err);
      setError(`Transcription error: ${err.message}`);
      setInterimTranscript("");
    }
  }, [currentLanguage]);

  // Process audio chunks periodically
  const processAudioChunks = useCallback(() => {
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      audioChunksRef.current = [];
      
      // Only send if blob has meaningful data (> 1KB)
      if (audioBlob.size > 1000) {
        sendAudioForTranscription(audioBlob);
      }
    }
  }, [sendAudioForTranscription]);

  const startListening = useCallback(async () => {
    if (isListeningRef.current) return;

    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("[CloudTranscription] MediaRecorder error:", event.error);
        setError("Recording error. Please try again.");
        // Stop listening inline instead of calling stopListening
        isListeningRef.current = false;
        setIsListening(false);
        cleanup();
      };

      // Start recording
      mediaRecorder.start();
      isListeningRef.current = true;
      setIsListening(true);

      // Process audio chunks every 3 seconds for continuous transcription
      if (continuous) {
        intervalRef.current = setInterval(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            processAudioChunks();
            // Restart recording
            if (isListeningRef.current) {
              mediaRecorderRef.current.start();
            }
          }
        }, 3000);
      }

    } catch (err: any) {
      console.error("[CloudTranscription] Error starting:", err);
      setError("Failed to access microphone. Please check permissions.");
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [continuous, processAudioChunks, cleanup]);

  const stopListening = useCallback(() => {
    if (!isListeningRef.current) return;

    isListeningRef.current = false;
    setIsListening(false);

    // Stop interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Process any remaining audio chunks
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.addEventListener("stop", () => {
        processAudioChunks();
        cleanup();
      }, { once: true });
      
      mediaRecorderRef.current.stop();
    } else {
      processAudioChunks();
      cleanup();
    }
  }, [cleanup, processAudioChunks]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setSegments([]);
    setError(null);
  }, []);

  const setLanguageCallback = useCallback((lang: string) => {
    const wasListening = isListeningRef.current;
    
    if (wasListening) {
      stopListening();
    }
    
    setCurrentLanguage(lang);
    
    if (wasListening) {
      setTimeout(() => startListening(), 500);
    }
  }, [startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

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
    setLanguage: setLanguageCallback,
  };
}
