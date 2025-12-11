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

  const { isReduced, reduceVolume, restoreVolume } = useSidebarVolume({ reducedVolume: 0.08 });

  // Process and play audio
  const processAndPlay = useCallback(async (text: string, lang: string) => {
    try {
      // First, translate
      setTranslatedText("🔄 Translating...");
      const translateRes = await fetch(`${API_BASE}/api/translate/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage: lang }),
      });

      if (!translateRes.ok) throw new Error(`Translation failed: ${translateRes.status}`);

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
                    console.log(`[Translator] Queuing: "${seg.text.substring(0, 15)}..." (${seg.voice})`);
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
  }, [speak]);

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
          <label className="text-sm text-white/60 block mb-2">Target Language</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            disabled={isActive}
            title="Select target language"
            className="w-full bg-dark-3/80 border border-white/10 rounded-apple px-4 py-3 text-white
              focus:outline-none focus:border-[#00e0ff] transition-colors disabled:opacity-50"
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
            className="flex-1 px-6 py-4 rounded-apple font-semibold text-lg transition-all 
              flex items-center justify-center gap-3 shadow-lg
              bg-gradient-to-r from-[#00e0ff] to-[#006dff] hover:opacity-90 text-white shadow-blue-500/20"
          >
            <Play size={20} />
            Start Translation
          </button>
        ) : (
          <button
            onClick={stop}
            className="flex-1 px-6 py-4 rounded-apple font-semibold text-lg transition-all 
              flex items-center justify-center gap-3 shadow-lg
              bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
          >
            <Square size={20} />
            Stop
          </button>
        )}
        
        <button
          onClick={testAudio}
          disabled={isSpeaking}
          className="px-4 py-4 rounded-apple font-semibold transition-all
            bg-dark-3/80 border border-white/10 text-white/70 hover:bg-dark-3 hover:text-white
            disabled:opacity-50"
          title="Test Audio"
        >
          <Volume2 size={20} />
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isActive ? "bg-green-500 animate-pulse" : "bg-gray-500"
          )} />
          <span className="text-white/60">{statusMessage}</span>
        </div>
        
        {/* Volume indicator */}
        <div className="flex items-center gap-2 text-sm text-white/40">
          {isReduced ? (
            <>
              <VolumeX className="w-4 h-4" />
              <span>Volume: 8%</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              <span>Volume: Normal</span>
            </>
          )}
        </div>
      </div>

      {/* Original Text */}
      <div className="bg-dark-3/50 rounded-apple p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-white/80">📝 Original Text</span>
        </div>
        <div className="min-h-[80px] bg-black/30 rounded-lg p-3 border border-white/5">
          <p className="text-white/90 text-sm leading-relaxed">
            {originalText}
          </p>
        </div>
      </div>

      {/* Translated Text */}
      <div className={cn(
        "bg-dark-3/50 rounded-apple p-4 border transition-colors",
        isSpeaking ? "border-[#00e0ff] bg-[#00e0ff]/5" : "border-white/10"
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Languages className="w-4 h-4 text-[#00e0ff]" />
          <span className="text-sm font-semibold text-white/80">🌐 Translated Text</span>
          {isSpeaking && (
            <div className="ml-auto flex items-center gap-1">
              <div className="w-1.5 h-3 bg-[#00e0ff] rounded-full animate-pulse" />
              <div className="w-1.5 h-4 bg-[#00e0ff] rounded-full animate-pulse delay-75" />
              <div className="w-1.5 h-2 bg-[#00e0ff] rounded-full animate-pulse delay-150" />
            </div>
          )}
        </div>
        <div className="min-h-[80px] bg-black/30 rounded-lg p-3 border border-white/5">
          <p className="text-white/90 text-sm leading-relaxed">
            {translatedText}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-white/40 text-center space-y-1">
        <p>Powered by Gemini Translation + Cartesia TTS</p>
        {isActive && (
          <p className="text-[#00e0ff]">Main volume reduced to prevent interference</p>
        )}
      </div>

    </div>
  );
}
