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
          const row = payload.new;
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
             // Fetch Translation and Audio
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

             // Queue Audio
             audioQueueRef.current.push(audioUrl);
             if (!isPlayingRef.current) {
                 playNext();
             }
             
             // Since API returns Audio, we don't get the text translation back in the body easily if it's a WAV blob.
             // Ideally we might want both. But current API returns raw audio. 
             // We can infer "Translated" state or update with "(Audio Playing)" 
             // Or update the API to return JSON { text, audioBase64 }.
             // For now, based on current API, we just indicate audio is ready.
             
             setHistory(prev => prev.map(item => 
                 item.id === row.id ? { ...item, translated: "Playing Audio..." } : item
             ));

          } catch (err) {
             console.error("Translation processing error:", err);
             setHistory(prev => prev.map(item => 
                 item.id === row.id ? { ...item, translated: "Translation Failed" } : item
             ));
          }
        }
      )
      .subscribe((status) => {
          if (status === "SUBSCRIBED") {
              setStatus("connected");
          } else if (status === "CHANNEL_ERROR") {
              setStatus("error");
          }
      });

    return () => {
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
