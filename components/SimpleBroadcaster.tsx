"use client";

import { useState, useRef, useEffect } from "react";
import { Radio } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

interface SimpleBroadcasterProps {
  meetingId?: string;
  className?: string;
}

export function SimpleBroadcaster({ meetingId, className }: SimpleBroadcasterProps) {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastSaved, setLastSaved] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(null);
  const recognitionRef = useRef<any>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Anonymous client ID
  const getClientId = () => {
    const key = "eburon_anon_client_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID?.() || `client-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return id;
  };

  // Audio visualizer
  const startVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sourceNode = audioContext.createMediaStreamSource(stream);
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
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2;
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
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  // Web Speech API
  const startTranscription = () => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    let fullTranscript = "";

    recognition.onstart = () => {
      console.log("Transcription started");
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
      }
    };

    recognition.onend = () => {
      if (isActive) {
        try {
          recognition.start();
        } catch (err) {
          console.error("Restart error:", err);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopTranscription = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  // Supabase auto-save every 5 seconds
  const startAutoSave = () => {
    if (saveIntervalRef.current) return;

    saveIntervalRef.current = setInterval(async () => {
      const text = transcript.trim();
      if (text && text !== lastSaved) {
        try {
          const { error } = await supabase.from("eburon_tts_current").insert({
            client_id: getClientId(),
            source_text: text,
            source_lang_code: navigator.language || "en-US",
            meeting_id: meetingId || null,
            updated_at: new Date().toISOString(),
          });

          if (error) throw error;
          setLastSaved(text);
          console.log("Saved to Supabase");
        } catch (err) {
          console.error("Save error:", err);
        }
      }
    }, 5000);
  };

  const stopAutoSave = () => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
  };

  // Toggle broadcaster
  const toggleBroadcaster = () => {
    if (isActive) {
      // Stop
      stopTranscription();
      stopVisualizer();
      stopAutoSave();
      setIsActive(false);
    } else {
      // Start
      setTranscript("");
      setLastSaved("");
      startVisualizer();
      startTranscription();
      startAutoSave();
      setIsActive(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
      stopVisualizer();
      stopAutoSave();
    };
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toggle Button */}
      <button
        onClick={toggleBroadcaster}
        className={cn(
          "w-full px-6 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 shadow-lg",
          isActive
            ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 animate-pulse"
            : "bg-gradient-to-r from-[#00e0ff] to-[#006dff] hover:opacity-90 text-white shadow-blue-500/20"
        )}
      >
        <Radio size={24} className={isActive ? "animate-pulse" : ""} />
        {isActive ? "Stop Broadcasting" : "Start Broadcasting"}
      </button>

      {/* Audio Visualizer */}
      {isActive && (
        <div className="bg-dark-3/50 rounded-xl p-4 border border-white/10 backdrop-blur-xl">
          <canvas
            ref={canvasRef}
            width={600}
            height={80}
            className="w-full h-20 rounded-lg"
          />
        </div>
      )}

      {/* Live Transcript */}
      {isActive && (
        <div className="bg-dark-3/50 rounded-xl p-4 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold text-white/80">Live Transcript</span>
          </div>
          <div className="min-h-[100px] max-h-[200px] overflow-y-auto bg-black/30 rounded-lg p-3 border border-white/5">
            <p className={cn(
              "text-white/90 text-sm leading-relaxed",
              transcript && "animate-pulse"
            )}>
              {transcript || "Listening..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
