"use client";

import { useState, useRef, useEffect } from "react";
import { Radio } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

interface SimpleBroadcasterProps {
  meetingId?: string;
  className?: string;
}

export function SimpleBroadcaster({
  meetingId,
  className,
}: SimpleBroadcasterProps) {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [segmentedText, setSegmentedText] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(null);
  const recognitionRef = useRef<any>(null);
  const segmentIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSegmentedTextRef = useRef<string>("");
  const chunkCounterRef = useRef<number>(0); // Global chunk counter

  // Anonymous client ID
  const getClientId = () => {
    const key = "eburon_anon_client_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id =
        crypto.randomUUID?.() ||
        `client-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return id;
  };

  // Audio visualizer
  const startVisualizer = async () => {
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Media Devices API not supported");
        return;
      }

      async function ensureMicPermission() {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("Media Devices API not supported");
            return;
          }
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          console.error("Mic permission blocked:", e);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
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
          const gradient = ctx.createLinearGradient(
            0,
            canvas.height - barHeight,
            0,
            canvas.height
          );
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
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Don't set lang to allow auto-detection by the browser's speech recognition service
    // recognition.lang is left undefined for automatic language detection

    let fullTranscript = "";

    recognition.onstart = () => {
      console.log("Transcription started (auto-detect mode)");
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

  // Segment text with Gemini every 10 seconds
  const startSegmentation = () => {
    if (segmentIntervalRef.current) return;

    segmentIntervalRef.current = setInterval(async () => {
      const text = transcript.trim();
      if (text && text !== lastSegmentedTextRef.current && !isProcessing) {
        setIsProcessing(true);
        try {
          const response = await fetch("/api/detect-speaker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });

          const data = await response.json();
          if (data.segments) {
            // Format segments into readable text
            const formatted = data.segments
              .map((seg: any) => `[${seg.voice}]: ${seg.text}`)
              .join("\n\n");
            setSegmentedText(formatted);
            lastSegmentedTextRef.current = text;

            // Save to Supabase
            for (const seg of data.segments) {
              const { error } = await supabase.from("transcriptions").insert({
                meeting_id: meetingId || `broadcast-${Date.now()}`,
                chunk_index: chunkCounterRef.current++,
                text_original: seg.text,
                speaker_label: seg.voice,
                source_language: "auto",
              });

              if (error) {
                console.error("Supabase insert error:", error);
              }
            }
            console.log(
              `Segmented and saved ${data.segments.length} chunks to Supabase`
            );
          }
        } catch (err) {
          console.error("Segmentation error:", err);
        } finally {
          setIsProcessing(false);
        }
      }
    }, 10000);
  };

  const stopSegmentation = () => {
    if (segmentIntervalRef.current) {
      clearInterval(segmentIntervalRef.current);
      segmentIntervalRef.current = null;
    }
  };

  // Keep legacy save function for compatibility
  const startAutoSave = () => {};

  const stopAutoSave = () => {};

  // Toggle broadcaster
  const toggleBroadcaster = () => {
    if (isActive) {
      // Stop
      stopTranscription();
      stopVisualizer();
      stopSegmentation();
      stopAutoSave();
      setIsActive(false);
    } else {
      // Start
      setTranscript("");
      setSegmentedText("");
      setLastSaved("");
      lastSegmentedTextRef.current = "";
      chunkCounterRef.current = 0; // Reset chunk counter for new session
      startVisualizer();
      startTranscription();
      startSegmentation();
      startAutoSave();
      setIsActive(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
      stopVisualizer();
      stopSegmentation();
      stopAutoSave();
    };
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toggle Button */}
      <button
        onClick={toggleBroadcaster}
        className={cn(
          "flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 text-lg font-semibold shadow-lg transition-all",
          isActive
            ? "animate-pulse bg-red-500 text-white shadow-red-500/20 hover:bg-red-600"
            : "bg-gradient-to-r from-[#00e0ff] to-[#006dff] text-white shadow-blue-500/20 hover:opacity-90"
        )}
      >
        <Radio size={24} className={isActive ? "animate-pulse" : ""} />
        {isActive ? "Stop Broadcasting" : "Start Broadcasting"}
      </button>

      {/* Audio Visualizer */}
      {isActive && (
        <div className="rounded-xl border border-white/10 bg-dark-3/50 p-4 backdrop-blur-xl">
          <canvas
            ref={canvasRef}
            width={600}
            height={80}
            className="h-20 w-full rounded-lg"
          />
        </div>
      )}

      {/* Live Transcript - Web Speech (Fast Local) */}
      {isActive && (
        <div className="rounded-xl border border-white/10 bg-dark-3/50 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-sm font-semibold text-white/80">
              Live Transcript (Local)
            </span>
          </div>
          <div className="max-h-[200px] min-h-[100px] overflow-y-auto rounded-lg border border-white/5 bg-black/30 p-3">
            <p
              className={cn(
                "text-sm leading-relaxed text-white/90",
                transcript && "animate-pulse"
              )}
            >
              {transcript || "Listening..."}
            </p>
          </div>
        </div>
      )}

      {/* Gemini Speaker Segmentation */}
      {isActive && (
        <div className="rounded-xl border border-white/10 bg-dark-3/50 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isProcessing ? "animate-pulse bg-yellow-500" : "bg-blue-500"
              )}
            />
            <span className="text-sm font-semibold text-white/80">
              Speaker Segmentation{" "}
              {isProcessing ? "(Processing...)" : "(Ready)"}
            </span>
          </div>
          <div className="max-h-[200px] min-h-[100px] overflow-y-auto rounded-lg border border-white/5 bg-black/30 p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
              {segmentedText || "Waiting for speech..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
