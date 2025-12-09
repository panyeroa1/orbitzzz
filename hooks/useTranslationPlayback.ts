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
  "en": "en-US", "en-US": "en-US", "en-GB": "en-GB", "en-AU": "en-AU",
  "es": "es-ES", "es-ES": "es-ES", "es-MX": "es-MX",
  "fr": "fr-FR", "fr-FR": "fr-FR", "fr-CA": "fr-CA",
  "de": "de-DE", "de-DE": "de-DE",
  "it": "it-IT", "it-IT": "it-IT",
  "pt": "pt-BR", "pt-BR": "pt-BR", "pt-PT": "pt-PT",
  "zh": "zh-CN", "zh-CN": "zh-CN", "zh-TW": "zh-TW",
  "ja": "ja-JP", "ja-JP": "ja-JP",
  "ko": "ko-KR", "ko-KR": "ko-KR",
  "ru": "ru-RU", "ru-RU": "ru-RU",
  "ar": "ar-SA", "ar-SA": "ar-SA",
  "hi": "hi-IN", "hi-IN": "hi-IN",
  "tl": "fil-PH", "fil": "fil-PH",
  "vi": "vi-VN", "vi-VN": "vi-VN",
  "th": "th-TH", "th-TH": "th-TH",
  "id": "id-ID", "id-ID": "id-ID",
  "nl": "nl-NL", "nl-NL": "nl-NL",
  "pl": "pl-PL", "pl-PL": "pl-PL",
  "tr": "tr-TR", "tr-TR": "tr-TR",
  "sv": "sv-SE", "sv-SE": "sv-SE",
  "da": "da-DK", "da-DK": "da-DK",
  "no": "no-NO", "nb": "nb-NO",
  "fi": "fi-FI", "fi-FI": "fi-FI",
  "el": "el-GR", "el-GR": "el-GR",
  "he": "he-IL", "he-IL": "he-IL",
  "uk": "uk-UA", "uk-UA": "uk-UA",
  "cs": "cs-CZ", "cs-CZ": "cs-CZ",
  "hu": "hu-HU", "hu-HU": "hu-HU",
  "ro": "ro-RO", "ro-RO": "ro-RO",
};

export function useTranslationPlayback({
  meetingId,
  targetLanguage,
  enabled
}: UseTranslationPlaybackOptions) {
  const [history, setHistory] = useState<TranscriptItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const { toast } = useToast();
  
  const lastIndexRef = useRef<number>(-1);
  const speechQueueRef = useRef<{ text: string; id: string }[]>([]);
  const isSpeakingRef = useRef(false);

  // Web Speech TTS - speak text
  const speakText = useCallback((text: string, lang: string, onEnd: () => void) => {
    if (!("speechSynthesis" in window)) {
      console.warn("[TTS] Web Speech API not supported");
      onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_TO_VOICE[lang] || lang || "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a voice for the language
    const voices = window.speechSynthesis.getVoices();
    const targetVoiceLang = LANG_TO_VOICE[lang] || lang;
    const matchingVoice = voices.find(v => v.lang.startsWith(targetVoiceLang.split("-")[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = onEnd;
    utterance.onerror = (e) => {
      console.error("[TTS] Speech error:", e);
      onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

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
    setHistory(prev => prev.map(h => 
      h.id === item.id ? { ...h, translated: h.translated?.replace("Translating...", "") || h.translated } : h
    ));

    speakText(item.text, targetLanguage, () => {
      playNext();
    });
  }, [speakText, targetLanguage]);

  useEffect(() => {
    if (!enabled || !meetingId) return;

    console.log(`[Translator] Subscribing to meeting: ${meetingId}`);
    setStatus("connecting");

    // Track processed IDs to avoid duplicates
    const processedIds = new Set<string>(history.map(h => h.id));

    // Function to process a new transcription row
    const processTranscription = async (row: any) => {
      if (processedIds.has(row.id)) return;
      processedIds.add(row.id);

      const chunkIndex = row.chunk_index;

      if (chunkIndex <= lastIndexRef.current) {
        return;
      }
      lastIndexRef.current = chunkIndex;

      const originalText = row.text_original;
      
      // Update History with placeholder
      const newItem: TranscriptItem = {
        id: row.id,
        original: originalText,
        timestamp: row.created_at,
        speaker: row.speaker_label,
        translated: "Translating..."
      };
      
      setHistory(prev => [...prev, newItem]);

      try {
        // Call translation API (text-only, no audio)
        const res = await fetch("/api/translate/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalText,
            targetLanguage
          })
        });
        
        if (!res.ok) throw new Error("Translation request failed");
        
        const data = await res.json();
        const translatedText = data.translatedText || originalText;

        // Update history with translated text
        setHistory(prev => prev.map(item => 
          item.id === row.id ? { ...item, translated: translatedText } : item
        ));

        // Queue for Web Speech TTS
        speechQueueRef.current.push({ text: translatedText, id: row.id });
        if (!isSpeakingRef.current) {
          playNext();
        }

      } catch (err) {
        console.error("Translation processing error:", err);
        setHistory(prev => prev.map(item => 
          item.id === row.id ? { ...item, translated: "Translation Failed" } : item
        ));
      }
    };

    // Realtime subscription
    const channel = supabase
      .channel(`transcriptions:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
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
            description: "Failed to connect to translation service. Check database policies.",
          });
        }
      });

    // Polling fallback
    const pollTranscripts = async () => {
      try {
        const { data, error } = await supabase
          .from("transcriptions")
          .select("*")
          .eq("meeting_id", meetingId)
          .order("chunk_index", { ascending: true })
          .limit(50);

        if (error) {
          console.error("[Translator] Polling error:", error);
          return;
        }

        if (data && data.length > 0) {
          for (const row of data) {
            if (!processedIds.has(row.id)) {
              await processTranscription(row);
            }
          }
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
    isPlaying
  };
}
