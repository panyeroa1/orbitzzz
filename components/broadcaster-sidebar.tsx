"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Radio, Mic, Monitor, Globe } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

interface BroadcasterSidebarProps {
  onActiveChange?: (isActive: boolean) => void;
}

const ALL_LANGUAGES = [
  { code: "", label: "✨ Auto-detect (System Default)" },
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "fr-FR", label: "French (France)" },
  { code: "de-DE", label: "German (Germany)" },
  { code: "it-IT", label: "Italian (Italy)" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "zh-CN", label: "Chinese, Mandarin (Simplified)" },
  { code: "ja-JP", label: "Japanese (Japan)" },
  { code: "ko-KR", label: "Korean (South Korea)" },
  { code: "tl-PH", label: "Tagalog (Philippines)" },
];

function getClientId(): string {
  if (typeof window === "undefined") return "";
  
  const key = "eburon_anon_client_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID?.() || `client-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function BroadcasterSidebar({ onActiveChange }: BroadcasterSidebarProps) {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const [sourceLang, setSourceLang] = useState("");
  const [audioSource, setAudioSource] = useState<"mic" | "screen">("mic");
  const [statusMessage, setStatusMessage] = useState("Idle");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(null);
  const recognitionRef = useRef<any>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio visualizer
  const startVisualizer = useCallback(async (stream?: MediaStream) => {
    try {
      const audioStream = stream || await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sourceNode = audioContext.createMediaStreamSource(audioStream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      sourceNode.connect(analyzer);

      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyzer.getByteFrequencyData(dataArray);

        ctx.fillStyle = "#0b0f18";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i] / 2;
          const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
          gradient.addColorStop(0, "#00e0ff");
          gradient.addColorStop(1, "#006dff");
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      };

      draw();
    } catch (err) {
      console.error("Visualizer error:", err);
    }
  }, []);

  const stopVisualizer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, []);

  // Web Speech API
  const startTranscription = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = sourceLang || navigator.language || "en-US";

    let fullTranscript = "";

    recognition.onstart = () => {
      setStatusMessage("Listening...");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          fullTranscript += (fullTranscript ? " " : "") + res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      setTranscript((fullTranscript + (interim ? " " + interim : "")).trim());
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e.error);
      if (e.error === "not-allowed") {
        setIsActive(false);
        setStatusMessage("Microphone access denied");
      }
    };

    recognition.onend = () => {
      if (isActive && recognitionRef.current) {
        try {
          recognition.start();
        } catch (err) {
          console.error("Restart error:", err);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [sourceLang, isActive]);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Supabase auto-save every 5 seconds
  const startAutoSave = useCallback(() => {
    if (saveIntervalRef.current) return;

    saveIntervalRef.current = setInterval(async () => {
      const text = transcript.trim();
      if (text && text !== lastSaved) {
        try {
          const clientId = getClientId();
          const nowIso = new Date().toISOString();
          const langCode = sourceLang || "auto";

          // Check if row exists
          const { data: existing } = await supabase
            .from("eburon_tts_current")
            .select("id")
            .eq("client_id", clientId)
            .limit(1);

          if (existing && existing.length > 0) {
            await supabase
              .from("eburon_tts_current")
              .update({
                source_text: text,
                source_lang_code: langCode,
                updated_at: nowIso,
              })
              .eq("client_id", clientId);
          } else {
            await supabase.from("eburon_tts_current").insert({
              client_id: clientId,
              source_text: text,
              source_lang_code: langCode,
              updated_at: nowIso,
            });
          }

          setLastSaved(text);
          setStatusMessage(`Saved ${new Date().toLocaleTimeString()}`);
        } catch (err) {
          console.error("Save error:", err);
        }
      }
    }, 5000);
  }, [transcript, lastSaved, sourceLang]);

  const stopAutoSave = useCallback(() => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
  }, []);

  // Toggle broadcaster
  const toggleBroadcaster = useCallback(async () => {
    if (isActive) {
      // Stop
      stopTranscription();
      stopVisualizer();
      stopAutoSave();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsActive(false);
      setStatusMessage("Stopped");
      onActiveChange?.(false);
    } else {
      // Start
      setTranscript("");
      setLastSaved("");
      
      if (audioSource === "screen") {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
          streamRef.current = stream;
          startVisualizer(stream);
        } catch (err) {
          setStatusMessage("Screen share cancelled");
          return;
        }
      } else {
        startVisualizer();
      }
      
      startTranscription();
      setIsActive(true);
      onActiveChange?.(true);
    }
  }, [isActive, audioSource, stopTranscription, stopVisualizer, stopAutoSave, startVisualizer, startTranscription, onActiveChange]);

  // Start auto-save when transcript changes and is active
  useEffect(() => {
    if (isActive && transcript) {
      startAutoSave();
    }
    return () => stopAutoSave();
  }, [isActive, transcript, startAutoSave, stopAutoSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
      stopVisualizer();
      stopAutoSave();
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Configuration */}
      <div className="space-y-4">
        <div>
          <label className="text-sm text-white/60 block mb-2">Input Language</label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            disabled={isActive}
            title="Select input language"
            className="w-full bg-dark-3/80 border border-white/10 rounded-apple px-4 py-3 text-white
              focus:outline-none focus:border-[#00e0ff] transition-colors disabled:opacity-50"
          >
            {ALL_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-white/60 block mb-2">Audio Source</label>
          <div className="flex gap-3">
            <button
              onClick={() => setAudioSource("mic")}
              disabled={isActive}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-apple border transition-all",
                audioSource === "mic"
                  ? "bg-[#00e0ff]/10 border-[#00e0ff] text-[#00e0ff]"
                  : "bg-dark-3/50 border-white/10 text-white/60 hover:border-white/20"
              )}
            >
              <Mic className="w-4 h-4" />
              <span>Microphone</span>
            </button>
            <button
              onClick={() => setAudioSource("screen")}
              disabled={isActive}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-apple border transition-all",
                audioSource === "screen"
                  ? "bg-[#00e0ff]/10 border-[#00e0ff] text-[#00e0ff]"
                  : "bg-dark-3/50 border-white/10 text-white/60 hover:border-white/20"
              )}
            >
              <Monitor className="w-4 h-4" />
              <span>Screen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleBroadcaster}
        className={cn(
          "w-full px-6 py-4 rounded-apple font-semibold text-lg transition-all flex items-center justify-center gap-3 shadow-lg",
          isActive
            ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
            : "bg-gradient-to-r from-[#00e0ff] to-[#006dff] hover:opacity-90 text-white shadow-blue-500/20"
        )}
      >
        <Radio size={24} className={isActive ? "animate-pulse" : ""} />
        {isActive ? "Stop Broadcasting" : "Start Broadcasting"}
      </button>

      {/* Status */}
      <div className="flex items-center gap-2 text-sm">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isActive ? "bg-green-500 animate-pulse" : "bg-gray-500"
        )} />
        <span className="text-white/60">{statusMessage}</span>
      </div>

      {/* Audio Visualizer */}
      <div className={cn(
        "bg-dark-3/50 rounded-apple p-4 border border-white/10 transition-opacity",
        isActive ? "opacity-100" : "opacity-50"
      )}>
        <canvas
          ref={canvasRef}
          width={500}
          height={60}
          className="w-full h-16 rounded-lg"
        />
      </div>

      {/* Live Transcript */}
      <div className="bg-dark-3/50 rounded-apple p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isActive ? "bg-green-500 animate-pulse" : "bg-gray-500"
          )} />
          <span className="text-sm font-semibold text-white/80">Live Transcript</span>
          <Globe className="w-4 h-4 text-white/40 ml-auto" />
        </div>
        <div className="min-h-[120px] max-h-[200px] overflow-y-auto bg-black/30 rounded-lg p-3 border border-white/5">
          <p className={cn(
            "text-white/90 text-sm leading-relaxed",
            transcript && "animate-pulse"
          )}>
            {transcript || "Listening..."}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-white/40 text-center">
        Auto-saving to Supabase every 5 seconds
      </div>
    </div>
  );
}
