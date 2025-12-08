"use client";

/**
 * TTS Queue Hook
 * 
 * React hook for managing Text-to-Speech with a queue to prevent overlapping audio.
 * 
 * CRITICAL: Never call TTS directly - always enqueue and respect isSpeaking.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { setAudioOutput } from "@/config/audio";

interface TTSQueueItem {
  id: string;
  text: string;
  language: string;
}

interface UseTTSQueueOptions {
  /** Language for TTS */
  language?: string;
  /** Session ID for tracking */
  sessionId?: string;
  /** Audio output device ID */
  outputDeviceId?: string;
  /** Callback when audio starts playing */
  onStart?: (item: TTSQueueItem) => void;
  /** Callback when audio finishes playing */
  onComplete?: (item: TTSQueueItem) => void;
  /** Callback on error */
  onError?: (error: Error, item: TTSQueueItem) => void;
}

interface UseTTSQueueReturn {
  /** Enqueue text for TTS - respects isSpeaking guard */
  enqueue: (text: string) => void;
  /** Stop current audio and clear queue */
  stop: () => void;
  /** Clear queue without stopping current audio */
  clearQueue: () => void;
  /** Whether TTS is currently playing */
  isSpeaking: boolean;
  /** Current queue length */
  queueLength: number;
  /** Current item being spoken */
  currentItem: TTSQueueItem | null;
  /** Any error that occurred */
  error: string | null;
}

export function useTTSQueue(options: UseTTSQueueOptions = {}): UseTTSQueueReturn {
  const {
    language = "en",
    sessionId = "default",
    outputDeviceId,
    onStart,
    onComplete,
    onError,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [currentItem, setCurrentItem] = useState<TTSQueueItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queueRef = useRef<TTSQueueItem[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);

  // Generate unique ID
  const generateId = useCallback(() => {
    return `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Process next item in queue
  const processNext = useCallback(async () => {
    // Guard: Do not start if already speaking
    if (isSpeakingRef.current) {
      return;
    }

    // Nothing to process
    if (queueRef.current.length === 0) {
      return;
    }

    // Get next item
    const item = queueRef.current.shift()!;
    setQueueLength(queueRef.current.length);

    // Set speaking state
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setCurrentItem(item);
    setError(null);

    try {
      onStart?.(item);

      // Call TTS API
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: item.text,
          language: item.language,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set output device if specified
      if (outputDeviceId) {
        await setAudioOutput(audio, outputDeviceId);
      }

      // Wait for audio to finish
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error("Audio playback failed"));
        };
        audio.play().catch(reject);
      });

      // Audio finished
      onComplete?.(item);

    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj.message);
      onError?.(errorObj, item);
    } finally {
      // Reset speaking state
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setCurrentItem(null);
      audioRef.current = null;

      // Process next in queue
      processNext();
    }
  }, [sessionId, outputDeviceId, onStart, onComplete, onError]);

  // Enqueue text for TTS
  const enqueue = useCallback((text: string) => {
    if (!text.trim()) {
      return;
    }

    const item: TTSQueueItem = {
      id: generateId(),
      text: text.trim(),
      language,
    };

    queueRef.current.push(item);
    setQueueLength(queueRef.current.length);

    // Try to start processing
    processNext();
  }, [language, generateId, processNext]);

  // Stop current audio and clear queue
  const stop = useCallback(() => {
    // Clear queue
    queueRef.current = [];
    setQueueLength(0);

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Reset state
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setCurrentItem(null);
  }, []);

  // Clear queue without stopping current audio
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setQueueLength(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return {
    enqueue,
    stop,
    clearQueue,
    isSpeaking,
    queueLength,
    currentItem,
    error,
  };
}
