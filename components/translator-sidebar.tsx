"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Languages, Volume2, VolumeX, Play, Square } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { useSidebarVolume } from "@/hooks/use-sidebar-volume";
import { useGeminiLiveAudio } from "@/hooks/useGeminiLiveAudio";

interface TranslatorSidebarProps {
  onActiveChange?: (isActive: boolean) => void;
}

const TARGET_LANGUAGES = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "tl", label: "Tagalog" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://orbitz.eburon.ai";

export function TranslatorSidebar({ onActiveChange }: TranslatorSidebarProps) {
  const [isActive, setIsActive] = useState(false);
  const [targetLang, setTargetLang] = useState("es");
  const [originalText, setOriginalText] = useState("Waiting for broadcast...");
  const [translatedText, setTranslatedText] = useState("Waiting...");
  const [statusMessage, setStatusMessage] = useState("Not started");

  // Use Gemini Live Audio hook for TTS
  const { speak, stop: stopTTS, isSpeaking } = useGeminiLiveAudio();

  const channelRef = useRef<any>(null);
  const lastTextRef = useRef(""); // Track incoming text to prevent reprocessing
  const processedTextRef = useRef(""); // Track processed text to prevent loops

  const { isReduced, reduceVolume, restoreVolume } = useSidebarVolume({
    reducedVolume: 0.08,
  });

  // Process and play audio
  const processAndPlay = useCallback(
    async (text: string, lang: string) => {
      try {
        // First, translate
        setTranslatedText("🔄 Translating...");
        const translateRes = await fetch(`${API_BASE}/api/translate/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, targetLanguage: lang }),
        });

        if (!translateRes.ok)
          throw new Error(`Translation failed: ${translateRes.status}`);

        const { translatedText: translated } = await translateRes.json();
        setTranslatedText(translated);

        // Detect Speaker/Gender Segments
        const detectRes = await fetch("/api/detect-speaker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: translated }),
        });

        if (detectRes.ok) {
          const detectData = await detectRes.json();
          const segments = detectData.segments || [];

          console.log(`[Translator] Segments detected: ${segments.length}`);

          if (segments.length > 0) {
            // Queue segments sequentially
            for (const seg of segments) {
              if (seg.text && seg.voice) {
                console.log(
                  `[Translator] Queuing: "${seg.text.substring(0, 15)}..." (${seg.voice})`
                );
                speak(seg.text, lang, seg.voice);
              }
            }
          } else {
            // Fallback
            speak(translated, lang, "Orus");
          }
        } else {
          // Fallback
          speak(translated, lang, "Orus");
        }
      } catch (err: any) {
        console.error("Translator error:", err);
        setTranslatedText(`Error: ${err.message}`);
      }
    },
    [speak]
  );

  // Start listening
  const start = useCallback(() => {
    setStatusMessage("🔄 Connecting to Supabase...");

    // Reduce main volume
    reduceVolume();

    // Subscribe to eburon_tts_current table updates
    channelRef.current = supabase
      .channel("tts_current_translator")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "eburon_tts_current",
        },
        async (payload: any) => {
          const text = payload.new?.source_text;

          // Only process if text is new and different from what we last saw
          if (!text || text === lastTextRef.current) return;
          lastTextRef.current = text;

          setOriginalText(text);
          setTranslatedText("🔄 Processing...");

          await processAndPlay(text, targetLang);
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setStatusMessage("✅ Connected & Listening");
        } else if (status === "CHANNEL_ERROR") {
          setStatusMessage("❌ Connection Error");
        } else {
          setStatusMessage(`🔄 ${status}`);
        }
      });

    setIsActive(true);
    onActiveChange?.(true);
  }, [targetLang, processAndPlay, reduceVolume, onActiveChange]);

  // Stop listening
  const stop = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    stopTTS(); // Stop audio playback

    // Restore main volume
    restoreVolume();

    setIsActive(false);
    setStatusMessage("Stopped");
    setOriginalText("Stopped");
    setTranslatedText("Stopped");
    onActiveChange?.(false);
  }, [restoreVolume, onActiveChange, stopTTS]);

  // Test audio
  const testAudio = useCallback(async () => {
    const testText = "Hello! This is a test of the translation system.";
    setOriginalText(testText);
    await processAndPlay(testText, targetLang);
  }, [targetLang, processAndPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      stopTTS();
      restoreVolume();
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Configuration */}
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-white/60">
            Target Language
          </label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            disabled={isActive}
            title="Select target language"
            className="w-full rounded-apple border border-white/10 bg-dark-3/80 px-4 py-3 text-white transition-colors focus:border-[#00e0ff] focus:outline-none disabled:opacity-50"
          >
            {TARGET_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        {!isActive ? (
          <button
            onClick={start}
            className="flex flex-1 items-center justify-center gap-3 rounded-apple bg-gradient-to-r from-[#00e0ff] to-[#006dff] px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:opacity-90"
          >
            <Play size={20} />
            Start Translation
          </button>
        ) : (
          <button
            onClick={stop}
            className="flex flex-1 items-center justify-center gap-3 rounded-apple bg-red-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600"
          >
            <Square size={20} />
            Stop
          </button>
        )}

        <button
          onClick={testAudio}
          disabled={isSpeaking}
          className="rounded-apple border border-white/10 bg-dark-3/80 px-4 py-4 font-semibold text-white/70 transition-all hover:bg-dark-3 hover:text-white disabled:opacity-50"
          title="Test Audio"
        >
          <Volume2 size={20} />
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isActive ? "animate-pulse bg-green-500" : "bg-gray-500"
            )}
          />
          <span className="text-white/60">{statusMessage}</span>
        </div>

        {/* Volume indicator */}
        <div className="flex items-center gap-2 text-sm text-white/40">
          {isReduced ? (
            <>
              <VolumeX className="h-4 w-4" />
              <span>Volume: 8%</span>
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4" />
              <span>Volume: Normal</span>
            </>
          )}
        </div>
      </div>

      {/* Original Text */}
      <div className="rounded-apple border border-white/10 bg-dark-3/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold text-white/80">
            📝 Original Text
          </span>
        </div>
        <div className="min-h-[80px] rounded-lg border border-white/5 bg-black/30 p-3">
          <p className="text-sm leading-relaxed text-white/90">
            {originalText}
          </p>
        </div>
      </div>

      {/* Translated Text */}
      <div
        className={cn(
          "rounded-apple border bg-dark-3/50 p-4 transition-colors",
          isSpeaking ? "border-[#00e0ff] bg-[#00e0ff]/5" : "border-white/10"
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <Languages className="h-4 w-4 text-[#00e0ff]" />
          <span className="text-sm font-semibold text-white/80">
            🌐 Translated Text
          </span>
          {isSpeaking && (
            <div className="ml-auto flex items-center gap-1">
              <div className="h-3 w-1.5 animate-pulse rounded-full bg-[#00e0ff]" />
              <div className="h-4 w-1.5 animate-pulse rounded-full bg-[#00e0ff] delay-75" />
              <div className="h-2 w-1.5 animate-pulse rounded-full bg-[#00e0ff] delay-150" />
            </div>
          )}
        </div>
        <div className="min-h-[80px] rounded-lg border border-white/5 bg-black/30 p-3">
          <p className="text-sm leading-relaxed text-white/90">
            {translatedText}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1 text-center text-xs text-white/40">
        <p>Powered by Gemini Translation + Cartesia TTS</p>
        {isActive && (
          <p className="text-[#00e0ff]">
            Main volume reduced to prevent interference
          </p>
        )}
      </div>
    </div>
  );
}
