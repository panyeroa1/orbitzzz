import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

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

export function useTranslationPlayback({
  meetingId,
  targetLanguage,
  enabled
}: UseTranslationPlaybackOptions) {
  const [history, setHistory] = useState<TranscriptItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  
  const lastIndexRef = useRef<number>(-1);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  
  // Clean up Blob URLs to avoid memory leaks
  const activeUrlsRef = useRef<string[]>([]);

  // Play next in queue
  const playNext = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
    const audioUrl = audioQueueRef.current.shift();
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.onended = () => {
      // release URL
      URL.revokeObjectURL(audioUrl);
      playNext();
    };
    audio.onerror = (e) => {
      console.error("Audio playback error", e);
      URL.revokeObjectURL(audioUrl);
      playNext();
    };

    audio.play().catch(e => {
       console.error("Audio play failed", e);
       playNext();
    });
  };

  useEffect(() => {
    if (!enabled || !meetingId) return;

    console.log(`[Translator] Subscribing to meeting: ${meetingId}`);
    setStatus("connecting");

    // Track processed IDs to avoid duplicates
    const processedIds = new Set<string>(history.map(h => h.id));

    // Function to process a new transcription row
    const processTranscription = async (row: any) => {
      if (processedIds.has(row.id)) return; // Skip duplicates
      processedIds.add(row.id);

      const chunkIndex = row.chunk_index;

      // Deduplication / Ordering check
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
        // Fetch Translation and Audio from Gemini Live Audio TTS
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalText,
            targetLanguage
          })
        });
        
        if (!res.ok) throw new Error("Translation request failed");
        
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        activeUrlsRef.current.push(audioUrl);

        // Queue Audio for playback
        audioQueueRef.current.push(audioUrl);
        if (!isPlayingRef.current) {
          playNext();
        }
        
        // Update with status
        setHistory(prev => prev.map(item => 
          item.id === row.id ? { ...item, translated: "Playing Audio..." } : item
        ));

      } catch (err) {
        console.error("Translation processing error:", err);
        setHistory(prev => prev.map(item => 
          item.id === row.id ? { ...item, translated: "Translation Failed" } : item
        ));
      }
    };

    // Realtime subscription (works if enabled in Supabase dashboard)
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
        }
      });

    // Polling fallback (in case Realtime isn't enabled)
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
          // Process any new transcriptions
          for (const row of data) {
            if (!processedIds.has(row.id)) {
              await processTranscription(row);
            }
          }
          
          // Set connected status if we have data
          setStatus("connected");
        }
      } catch (err) {
        console.error("[Translator] Polling exception:", err);
      }
    };

    // Poll every 2 seconds as fallback
    const pollInterval = setInterval(pollTranscripts, 2000);
    // Initial poll
    pollTranscripts();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      // cleanup blobs
      activeUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      activeUrlsRef.current = [];
    };

  }, [meetingId, enabled, targetLanguage]);

  return {
    history,
    status,
    isPlaying
  };
}
