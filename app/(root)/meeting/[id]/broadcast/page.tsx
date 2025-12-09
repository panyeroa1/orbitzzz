"use client";

import { use, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mic, Monitor, Radio, Square, Languages } from "lucide-react";
import { useBroadcastTranscription } from "@/hooks/useBroadcastTranscription";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

// Types
type BroadcastPageProps = {
  params: Promise<{ id: string }>;
};

interface TranscriptItem {
  id: string;
  text: string;
  language: string | null;
  speaker: string | null;
  timestamp: string;
}

export default function BroadcastPage({ params }: BroadcastPageProps) {
  const { id: meetingId } = use(params);
  const router = useRouter();

  const [source, setSource] = useState<"mic" | "share-tab" | "mixed">("mic");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  
  const { start, stop, isTranscribing, error } = useBroadcastTranscription({ meetingId });
  const [status, setStatus] = useState<"idle" | "broadcasting" | "error">("idle");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to transcriptions from Supabase Realtime + Polling Fallback
  useEffect(() => {
    if (!isTranscribing) return;

    console.log(`[Broadcast] Subscribing to transcriptions for ${meetingId}`);

    // Track IDs we've already seen to avoid duplicates
    const seenIds = new Set<string>(transcripts.map(t => t.id));

    // Realtime subscription (works if enabled in Supabase dashboard)
    const channel = supabase
      .channel(`broadcast-transcripts:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transcriptions",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          const row = payload.new;
          if (seenIds.has(row.id)) return; // Skip duplicates
          seenIds.add(row.id);
          
          const item: TranscriptItem = {
            id: row.id,
            text: row.text_original,
            language: row.source_language,
            speaker: row.speaker_label,
            timestamp: row.created_at,
          };
          setTranscripts((prev) => [...prev.slice(-20), item]); // Keep last 20
        }
      )
      .subscribe((status) => {
        console.log(`[Broadcast] Realtime status: ${status}`);
      });

    // Polling fallback (in case Realtime isn't enabled)
    const pollTranscripts = async () => {
      try {
        const { data, error } = await supabase
          .from("transcriptions")
          .select("id, text_original, source_language, speaker_label, created_at")
          .eq("meeting_id", meetingId)
          .order("created_at", { ascending: true })
          .limit(30);

        if (error) {
          console.error("[Broadcast] Polling error:", error.message || error.code || JSON.stringify(error));
          return;
        }

        if (data && data.length > 0) {
          const newItems: TranscriptItem[] = [];
          for (const row of data) {
            if (!seenIds.has(row.id)) {
              seenIds.add(row.id);
              newItems.push({
                id: row.id,
                text: row.text_original,
                language: row.source_language,
                speaker: row.speaker_label,
                timestamp: row.created_at,
              });
            }
          }
          if (newItems.length > 0) {
            setTranscripts((prev) => [...prev, ...newItems].slice(-20));
          }
        }
      } catch (err) {
        console.error("[Broadcast] Polling exception:", err);
      }
    };

    // Poll every 2 seconds
    const pollInterval = setInterval(pollTranscripts, 2000);
    // Initial poll
    pollTranscripts();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [meetingId, isTranscribing]);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  // Visualize audio
  useEffect(() => {
    if (!stream || !isTranscribing) {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sourceNode = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    sourceNode.connect(analyzer);
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

        ctx.fillStyle = "#1a1a1a"; // Dark background matching UI
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            ctx.fillStyle = `rgb(${barHeight + 100}, 50, 200)`; // Purple-ish
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    };

    draw();

    return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        audioContext.close();
    };
  }, [stream, isTranscribing]);


  const startBroadcast = async () => {
    try {
      let newStream: MediaStream;
      setTranscripts([]); // Clear previous transcripts

      if (source === "mic") {
         newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else if (source === "share-tab") {
         newStream = await navigator.mediaDevices.getDisplayMedia({ 
             video: true, 
             audio: { 
                 echoCancellation: false, 
                 noiseSuppression: false,
                 autoGainControl: false,
             }
         });
      } else {
         // Mixed: Mic + System
         const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
         const systemStream = await navigator.mediaDevices.getDisplayMedia({ 
             video: true, 
             audio: { 
                 echoCancellation: false, 
                 noiseSuppression: false,
             } 
         });

         const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
         const micSource = audioContext.createMediaStreamSource(micStream);
         const systemSource = audioContext.createMediaStreamSource(systemStream);
         const dest = audioContext.createMediaStreamDestination();

         micSource.connect(dest);
         systemSource.connect(dest);

         newStream = dest.stream;

         // Keep tracks referenced to stop them later
         // We might need to attach them to the newStream so stopBroadcast cleans them up?
         // Actually, let's just track them. 
         // simpler hack: add original tracks to the newStream so we can stop them
         micStream.getTracks().forEach(t => newStream.addTrack(t));
         systemStream.getTracks().forEach(t => newStream.addTrack(t));
      }

      setStream(newStream);
      await start(newStream);
      setStatus("broadcasting");

    } catch (err) {
      console.error("Failed to get stream:", err);
      setStatus("error");
    }
  };

  const stopBroadcast = () => {
    stop();
    if (stream) {
        // For system audio, we might want to keep it open?
        // But usually stop means stop everything.
        stream.getTracks().forEach(t => t.stop());
    }
    setStream(null);
    setStatus("idle");
  };

  return (
    <div className="min-h-screen bg-dark-1 text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
       {/* Background Pulse Animation */}
       {status === "broadcasting" && (
           <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
               <div className="w-[500px] h-[500px] bg-purple-1/20 rounded-full blur-3xl animate-pulse" />
           </div>
       )}

       {/* Header */}
       <div className="absolute top-6 left-6">
          <button
            onClick={() => { stopBroadcast(); router.back(); }}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>
       </div>

       <div className="max-w-2xl w-full relative z-10">
          <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-dark-3 mb-6 shadow-2xl border border-white/10">
                 <Radio size={40} className={cn("text-white/80", status === "broadcasting" && "text-purple-1 animate-pulse")} />
             </div>
             <h1 className="text-3xl font-bold tracking-tight mb-2">Broadcaster Mode</h1>
             <p className="text-white/60">
                You are the audio source for Meeting <span className="text-purple-1 font-mono">{meetingId}</span>
             </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Controls Card */}
             <div className="apple-card p-6 bg-dark-3/50 backdrop-blur-xl border border-white/10 space-y-6">
                {/* Source Selector */}
                <div className="grid grid-cols-1 gap-2 p-1 bg-dark-2 rounded-lg">
                   <button
                      onClick={() => !isTranscribing && setSource("mic")}
                      disabled={isTranscribing}
                      className={cn(
                          "flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-all",
                          source === "mic" ? "bg-dark-4 text-white shadow-sm border border-white/10" : "text-white/50 hover:text-white/80",
                          isTranscribing && "opacity-50 cursor-not-allowed"
                      )}
                   >
                       <Mic size={16} /> Microphone
                   </button>
                   <button
                      onClick={() => !isTranscribing && setSource("share-tab")}
                      disabled={isTranscribing}
                      className={cn(
                          "flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-all",
                          source === "share-tab" ? "bg-dark-4 text-white shadow-sm border border-white/10" : "text-white/50 hover:text-white/80",
                          isTranscribing && "opacity-50 cursor-not-allowed"
                      )}
                   >
                       <Monitor size={16} /> Share Tab
                   </button>
                    <button
                      onClick={() => !isTranscribing && setSource("mixed")}
                      disabled={isTranscribing}
                      className={cn(
                          "flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-all",
                          source === "mixed" ? "bg-dark-4 text-white shadow-sm border border-white/10" : "text-white/50 hover:text-white/80",
                          isTranscribing && "opacity-50 cursor-not-allowed"
                      )}
                   >
                       <div className="flex items-center gap-1">
                           <Mic size={14} /> + <Monitor size={14} />
                       </div>
                       Mic + System
                   </button>
                </div>

                {/* Visualizer Canvas */}
                <div className="h-32 bg-black/40 rounded-lg overflow-hidden relative border border-white/5">
                    {status === "idle" && (
                        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                            Audio Inactive
                        </div>
                    )}
                    <canvas ref={canvasRef} width={400} height={128} className="w-full h-full" />
                </div>

                {/* Action Button */}
                {status === "idle" || status === "error" ? (
                    <button
                       onClick={startBroadcast}
                       className="w-full py-4 rounded-xl bg-purple-1 hover:bg-purple-600 text-white font-semibold text-lg shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-3"
                    >
                        <Radio size={24} />
                        Start Broadcasting
                    </button>
                ) : (
                    <button
                       onClick={stopBroadcast}
                       className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-lg shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-3 animate-pulse"
                    >
                        <Square size={24} fill="currentColor" />
                        Stop Broadcasting
                    </button>
                )}
                
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}
             </div>

             {/* Live Transcription Card */}
             <div className="apple-card p-6 bg-dark-3/50 backdrop-blur-xl border border-white/10 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                    <Languages size={20} className="text-purple-1" />
                    <h2 className="text-lg font-semibold">Live Transcription</h2>
                </div>
                
                <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto bg-black/30 rounded-lg p-4 border border-white/5 space-y-3">
                    {transcripts.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-white/30 text-sm">
                            {isTranscribing ? "Waiting for speech..." : "Start broadcasting to see transcription"}
                        </div>
                    ) : (
                        <>
                            {transcripts.map((item) => (
                                <div key={item.id} className="p-3 bg-dark-4/50 rounded-lg border border-white/5 animate-fade-in">
                                    <p className="text-white/90">{item.text}</p>
                                    <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                        <div className="flex items-center gap-2">
                                            {item.speaker && <span className="text-purple-400">{item.speaker}</span>}
                                            {item.language && (
                                                <span className="bg-purple-1/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">
                                                    {item.language.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={transcriptEndRef} />
                        </>
                    )}
                </div>
             </div>
          </div>

          <div className="mt-8 text-center">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                 <div className={cn("w-2 h-2 rounded-full", status === "broadcasting" ? "bg-green-500 animate-pulse" : "bg-white/20")} />
                 <span className="text-xs font-mono text-white/60">
                     STATUS: {status.toUpperCase()}
                 </span>
             </div>
          </div>
       </div>
    </div>
  );
}
