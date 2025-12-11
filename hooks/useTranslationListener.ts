import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useGeminiLiveAudio } from "./useGeminiLiveAudio";

interface TranslationListenerOptions {
  meetingId: string;
  targetLanguage: string;
  enabled: boolean;
}

interface UseTranslationListenerReturn {
  isActive: boolean;
  lastTranslation: string | null;
  error: string | null;
  transcriptionCount: number;
  isSpeaking: boolean;
  queueSize: number;
}

export function useTranslationListener({
  meetingId,
  targetLanguage,
  enabled,
}: TranslationListenerOptions): UseTranslationListenerReturn {
  const [isActive, setIsActive] = useState(false);
  const [lastTranslation, setLastTranslation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionCount, setTranscriptionCount] = useState(0);

  const lastProcessedTimeRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { speak, stop, isSpeaking, queueSize } = useGeminiLiveAudio();

  // Poll Supabase for new transcriptions
  const pollTranscriptions = useCallback(async () => {
    if (!enabled || !meetingId || !targetLanguage) return;

    try {
      // Query for new transcriptions
      let query = supabase
        .from("eburon_tts_current")
        .select("*")
        .order("updated_at", { ascending: true });

      // Filter by meeting_id if provided
      if (meetingId && meetingId !== "undefined") {
        query = query.eq("meeting_id", meetingId);
      }

      // Only get transcriptions after the last processed timestamp
      if (lastProcessedTimeRef.current !== null) {
        query = query.gt("updated_at", lastProcessedTimeRef.current);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("[Translation] Supabase error:", fetchError);
        setError(`Supabase error: ${fetchError.message}`);
        return;
      }

      if (!data || data.length === 0) {
        return; // No new transcriptions
      }

      console.log(`[Translation] Found ${data.length} new transcription(s)`);

      // Process each new transcription
      for (const transcription of data) {
        const { source_text, source_lang_code, updated_at } = transcription;

        // Skip if no text
        if (!source_text || !source_text.trim()) {
          lastProcessedTimeRef.current = updated_at;
          continue;
        }

        // Skip if target language is the same as source
        if (targetLanguage === source_lang_code || targetLanguage === "auto") {
          // Just speak the original text
          speak(source_text, source_lang_code || "en");
          setLastTranslation(source_text);
          setTranscriptionCount((c) => c + 1);
          lastProcessedTimeRef.current = updated_at;
          continue;
        }

        try {
          // Call Gemini translation API
          const response = await fetch("/api/translate/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: source_text,
              targetLanguage,
              sourceLanguage: source_lang_code || "auto",
            }),
          });

          if (!response.ok) {
            throw new Error(`Translation API error: ${response.statusText}`);
          }

          const { translatedText } = await response.json();

          console.log(
            `[Translation] Translated: "${translatedText.substring(0, 50)}..."`
          );

          // Add to TTS queue (will speak when ready)
          speak(translatedText, targetLanguage);
          setLastTranslation(translatedText);
          setTranscriptionCount((c) => c + 1);
          setError(null);
        } catch (err) {
          console.error("[Translation] Error translating:", err);
          setError(err instanceof Error ? err.message : String(err));
        }

        // Update last processed timestamp
        lastProcessedTimeRef.current = updated_at;
      }
    } catch (err) {
      console.error("[Translation] Polling error:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [enabled, meetingId, targetLanguage, speak]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (enabled && meetingId && targetLanguage) {
      setIsActive(true);
      setError(null);
      setTranscriptionCount(0);
      lastProcessedTimeRef.current = null;

      // Poll immediately, then every 5 seconds
      pollTranscriptions();
      pollingIntervalRef.current = setInterval(pollTranscriptions, 5000);

      console.log(
        `[Translation] Started polling for meeting ${meetingId}, target: ${targetLanguage}`
      );
    } else {
      setIsActive(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      stop(); // Stop TTS
      console.log("[Translation] Stopped polling");
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      stop();
    };
  }, [enabled, meetingId, targetLanguage, pollTranscriptions, stop]);

  return {
    isActive,
    lastTranslation,
    error,
    transcriptionCount,
    isSpeaking,
    queueSize,
  };
}
