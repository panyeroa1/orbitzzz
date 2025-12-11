import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

interface UseTranslationPlaybackOptions {
  meetingId: string;
  targetLanguage: string; // e.g. "es", "fr"
  enabled: boolean;
}

interface TranscriptItem {
  id: string;
  original: string;
  translated?: string;
  timestamp: string;
  speaker?: string;
}

// Map language codes to Web Speech API voice language tags
const LANG_TO_VOICE: Record<string, string> = {
  en: "en-US",
  "en-US": "en-US",
  "en-GB": "en-GB",
  "en-AU": "en-AU",
  es: "es-ES",
  "es-ES": "es-ES",
  "es-MX": "es-MX",
  fr: "fr-FR",
  "fr-FR": "fr-FR",
  "fr-CA": "fr-CA",
  de: "de-DE",
  "de-DE": "de-DE",
  it: "it-IT",
  "it-IT": "it-IT",
  pt: "pt-BR",
  "pt-BR": "pt-BR",
  "pt-PT": "pt-PT",
  zh: "zh-CN",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  ja: "ja-JP",
  "ja-JP": "ja-JP",
  ko: "ko-KR",
  "ko-KR": "ko-KR",
  ru: "ru-RU",
  "ru-RU": "ru-RU",
  ar: "ar-SA",
  "ar-SA": "ar-SA",
  hi: "hi-IN",
  "hi-IN": "hi-IN",
  tl: "fil-PH",
  fil: "fil-PH",
  vi: "vi-VN",
  "vi-VN": "vi-VN",
  th: "th-TH",
  "th-TH": "th-TH",
  id: "id-ID",
  "id-ID": "id-ID",
  nl: "nl-NL",
  "nl-NL": "nl-NL",
  pl: "pl-PL",
  "pl-PL": "pl-PL",
  tr: "tr-TR",
  "tr-TR": "tr-TR",
  sv: "sv-SE",
  "sv-SE": "sv-SE",
  da: "da-DK",
  "da-DK": "da-DK",
  no: "no-NO",
  nb: "nb-NO",
  fi: "fi-FI",
  "fi-FI": "fi-FI",
  el: "el-GR",
  "el-GR": "el-GR",
  he: "he-IL",
  "he-IL": "he-IL",
  uk: "uk-UA",
  "uk-UA": "uk-UA",
  cs: "cs-CZ",
  "cs-CZ": "cs-CZ",
  hu: "hu-HU",
  "hu-HU": "hu-HU",
  ro: "ro-RO",
  "ro-RO": "ro-RO",
};

export function useTranslationPlayback({
  meetingId,
  targetLanguage,
  enabled,
}: UseTranslationPlaybackOptions) {
  const [history, setHistory] = useState<TranscriptItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">(
    "connecting"
  );
  const { toast } = useToast();

  const lastIndexRef = useRef<number>(-1);
  const speechQueueRef = useRef<{ text: string; id: string }[]>([]);
  const isSpeakingRef = useRef(false);

  // Gemini Live Audio TTS - speak text
  const speakText = useCallback(
    async (text: string, lang: string, onEnd: () => void) => {
      try {
        console.log("[TTS] Requesting audio for:", text.substring(0, 50));
        const response = await fetch("/api/tts/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceName: "Orus" }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[TTS] API error:", response.status, errorText);
          throw new Error("TTS failed");
        }

        const audioBlob = await response.blob();
        console.log("[TTS] Received audio blob, size:", audioBlob.size);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          console.log("[TTS] Audio playback ended");
          URL.revokeObjectURL(audioUrl);
          onEnd();
        };

        audio.onerror = (e) => {
          console.error("[TTS] Playback error:", e);
          URL.revokeObjectURL(audioUrl);
          onEnd();
        };

        console.log("[TTS] Starting playback");
        await audio.play();
      } catch (err) {
        console.error("[TTS] Error:", err);
        onEnd();
      }
    },
    []
  );

  // Play next in queue
  const playNext = useCallback(() => {
    if (speechQueueRef.current.length === 0) {
      isSpeakingRef.current = false;
      setIsPlaying(false);
      return;
    }

    isSpeakingRef.current = true;
    setIsPlaying(true);

    const item = speechQueueRef.current.shift();
    if (!item) return;

    // Update status to "Speaking..."
    setHistory((prev) =>
      prev.map((h) =>
        h.id === item.id
          ? {
              ...h,
              translated:
                h.translated?.replace("Translating...", "") || h.translated,
            }
          : h
      )
    );

    speakText(item.text, targetLanguage, () => {
      playNext();
    });
  }, [speakText, targetLanguage]);

  useEffect(() => {
    if (!enabled || !meetingId) return;

    console.log(`[Translator] Subscribing to meeting: ${meetingId}`);
    setStatus("connecting");

    // Track processed IDs to avoid duplicates
    const processedIds = new Set<string>();
    let lastProcessedText = ""; // Track last processed text to avoid duplicates

    const processTranscription = async (row: any) => {
      console.log("[Translation] Processing row:", row);

      const originalText = row.text_original?.trim();
      if (!originalText || originalText === lastProcessedText) {
        console.log("[Translation] Skipping - same text or empty");
        return; // Skip if same text
      }

      console.log("[Translation] New text detected:", originalText);
      lastProcessedText = originalText;
      processedIds.add(row.id);

      // Update or add to history
      const existingIndex = history.findIndex((item) => item.id === row.id);
      const newItem = {
        id: row.id,
        original: originalText,
        timestamp: row.created_at,
        speaker: row.speaker_label,
        translated: "Translating...",
      };

      if (existingIndex >= 0) {
        console.log("[Translation] Updating existing item");
        setHistory((prev) =>
          prev.map((item, idx) => (idx === existingIndex ? newItem : item))
        );
      } else {
        console.log("[Translation] Adding new item");
        setHistory((prev) => [newItem]);
      }

      try {
        // Call translation API (text-only, no audio)
        console.log("[Translation] Calling API with target:", targetLanguage);
        const res = await fetch("/api/translate/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalText,
            targetLanguage,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("[Translation] API error:", res.status, errorText);
          throw new Error("Translation failed");
        }

        const data = await res.json();
        const translatedText = data.translatedText || originalText;
        console.log("[Translation] Received translation:", translatedText);

        // Update history with translation
        if (existingIndex >= 0) {
          setHistory((prev) =>
            prev.map((item, idx) =>
              idx === existingIndex
                ? { ...item, translated: translatedText }
                : item
            )
          );
        } else {
          setHistory((prev) =>
            prev.map((item) =>
              item.id === row.id
                ? { ...item, translated: translatedText }
                : item
            )
          );
        }

        // Add to speech queue - WAIT for current audio to finish
        console.log("[Translation] Adding to speech queue");
        speechQueueRef.current.push({ text: translatedText, id: row.id });

        // Only start processing if not already speaking
        if (!isSpeakingRef.current) {
          console.log("[Translation] Starting playback");
          playNext();
        } else {
          console.log("[Translation] Queued - currently speaking");
        }
      } catch (err) {
        console.error("[Translation] Error:", err);
        if (existingIndex >= 0) {
          setHistory((prev) =>
            prev.map((item, idx) =>
              idx === existingIndex
                ? { ...item, translated: "Translation Failed" }
                : item
            )
          );
        } else {
          setHistory((prev) =>
            prev.map((item) =>
              item.id === row.id
                ? { ...item, translated: "Translation Failed" }
                : item
            )
          );
        }
      }
    };

    // Realtime subscription - listen for UPDATE on single row
    const channel = supabase
      .channel(`transcriptions:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transcriptions",
          filter: `meeting_id=eq.${meetingId}`,
        },
        async (payload) => {
          processTranscription(payload.new);
        }
      )
      .subscribe((status) => {
        console.log(`[Translator] Realtime status: ${status}`);
        if (status === "SUBSCRIBED") {
          setStatus("connected");
        } else if (status === "CHANNEL_ERROR") {
          setStatus("error");
          console.error("[Translator] Supabase channel error");
          toast({
            variant: "destructive",
            title: "Connection Error",
            description:
              "Failed to connect to translation service. Check database policies.",
          });
        }
      });

    // Polling fallback - fetch single row
    const pollTranscripts = async () => {
      try {
        const { data, error } = await supabase
          .from("transcriptions")
          .select("*")
          .eq("meeting_id", meetingId)
          .single();

        if (error) {
          if (error.code !== "PGRST116") {
            // Ignore "no rows" error
            console.error("[Translator] Polling error:", error);
          }
          return;
        }

        if (data && !processedIds.has(data.id)) {
          await processTranscription(data);
          setStatus("connected");
        }
      } catch (err) {
        console.error("[Translator] Polling exception:", err);
      }
    };

    const pollInterval = setInterval(pollTranscripts, 2000);
    pollTranscripts();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      // Cancel any ongoing speech
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [meetingId, enabled, targetLanguage, playNext]);

  return {
    history,
    status,
    isPlaying,
  };
}
