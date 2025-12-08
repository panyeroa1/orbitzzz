"use client";

import { use, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mic, Monitor, Radio, Square, RefreshCcw } from "lucide-react";
import { useBroadcastTranscription } from "@/hooks/useBroadcastTranscription";
import { cn } from "@/lib/utils";

// Types
type BroadcastPageProps = {
  params: Promise<{ id: string }>;
};

export default function BroadcastPage({ params }: BroadcastPageProps) {
  const { id: meetingId } = use(params);
  const router = useRouter();

  const [source, setSource] = useState<"mic" | "system">("mic");
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const { start, stop, isTranscribing, error } = useBroadcastTranscription({ meetingId });
  const [status, setStatus] = useState<"idle" | "broadcasting" | "error">("idle");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);

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
      if (source === "mic") {
         newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
         newStream = await navigator.mediaDevices.getDisplayMedia({ 
             video: true, // Required to get system audio usually
             audio: { 
                 echoCancellation: false, 
                 noiseSuppression: false 
             }
         });
         // If user stops sharing via browser UI
         newStream.getVideoTracks()[0].onended = () => {
             stopBroadcast();
         };
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

       <div className="max-w-md w-full relative z-10">
          <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-dark-3 mb-6 shadow-2xl border border-white/10">
                 <Radio size={40} className={cn("text-white/80", status === "broadcasting" && "text-purple-1 animate-pulse")} />
             </div>
             <h1 className="text-3xl font-bold tracking-tight mb-2">Broadcaster Mode</h1>
             <p className="text-white/60">
                You are the audio source for Meeting <span className="text-purple-1 font-mono">{meetingId}</span>
             </p>
          </div>

          <div className="apple-card p-6 bg-dark-3/50 backdrop-blur-xl border border-white/10 space-y-6">
             {/* Source Selector */}
             <div className="grid grid-cols-2 gap-3 p-1 bg-dark-2 rounded-lg">
                <button
                   onClick={() => !isTranscribing && setSource("mic")}
                   disabled={isTranscribing}
                   className={cn(
                       "flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-all",
                       source === "mic" ? "bg-dark-4 text-white shadow-sm" : "text-white/50 hover:text-white/80",
                       isTranscribing && "opacity-50 cursor-not-allowed"
                   )}
                >
                    <Mic size={16} /> Microphone
                </button>
                <button
                   onClick={() => !isTranscribing && setSource("system")}
                   disabled={isTranscribing}
                   className={cn(
                       "flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-all",
                       source === "system" ? "bg-dark-4 text-white shadow-sm" : "text-white/50 hover:text-white/80",
                       isTranscribing && "opacity-50 cursor-not-allowed"
                   )}
                >
                    <Monitor size={16} /> System Audio
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
