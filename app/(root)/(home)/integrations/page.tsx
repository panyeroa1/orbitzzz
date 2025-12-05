"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Mic, MicOff, Loader2 } from "lucide-react";

const WHISPER_URL = process.env.NEXT_PUBLIC_WHISPER_SERVER_URL || "ws://localhost:8000";

const IntegrationsPage = () => {
  const [status, setStatus] = useState<"Connected" | "Disconnected">("Disconnected");
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const wsUrl = WHISPER_URL.replace("http://", "ws://").replace("https://", "wss://");
        const socket = new WebSocket(`${wsUrl}/ws/status`);
        
        socket.onopen = () => {
          setStatus("Connected");
          socket.close();
        };

        socket.onerror = () => {
          setStatus("Disconnected");
        };
      } catch {
        setStatus("Disconnected");
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  // Connect to WebSocket for transcription
  const connectWebSocket = useCallback(() => {
    const wsUrl = WHISPER_URL.replace("http://", "ws://").replace("https://", "wss://");
    const ws = new WebSocket(`${wsUrl}/ws/transcribe`);
    
    ws.onopen = () => {
      console.log("[Eburon STT] WebSocket connected");
    };

    ws.onmessage = (event) => {
      setIsProcessing(false);
      if (event.data.trim()) {
        setTranscription(prev => [...prev, event.data.trim()]);
      }
    };

    ws.onerror = (error) => {
      console.error("[Eburon STT] WebSocket error:", error);
      setIsProcessing(false);
    };

    ws.onclose = () => {
      console.log("[Eburon STT] WebSocket closed");
    };

    websocketRef.current = ws;
    return ws;
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      // Connect WebSocket
      connectWebSocket();
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Send accumulated audio to server
        if (chunksRef.current.length > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          setIsProcessing(true);
          websocketRef.current.send(audioBlob);
          chunksRef.current = [];
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please allow microphone permissions.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Clear transcription
  const clearTranscription = () => {
    setTranscription([]);
  };

  return (
    <section className="flex size-full flex-col gap-8 text-white animate-fade-in">
      <h1 className="text-3xl font-semibold tracking-apple-tight">Integrations</h1>

      {/* Connection Status Card */}
      <div className="apple-card flex w-full items-center justify-between p-5 sm:max-w-[400px]">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-apple bg-gradient-to-br from-purple-1 to-blue-1">
            <Image 
              src="/icons/add-personal.svg"
              alt="Eburon STT"
              width={24}
              height={24}
            />
          </div>
          <div className="flex flex-col">
            <p className="text-lg font-semibold tracking-apple-tight">Eburon STT</p>
            <p className="text-sm text-white/50 tracking-apple-normal">Real-time Transcription</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`size-2.5 rounded-full ${status === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <p className={`text-sm font-medium ${status === 'Connected' ? 'text-green-400' : 'text-red-400'}`}>{status}</p>
        </div>
      </div>

      {/* Live Transcription Section */}
      <div className="apple-card p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-apple-tight">Live Transcription</h2>
          
          <div className="flex items-center gap-3">
            {transcription.length > 0 && (
              <button
                onClick={clearTranscription}
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
            
            <button
              onClick={toggleRecording}
              disabled={status !== "Connected"}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-apple font-medium transition-all duration-apple ${
                isRecording 
                  ? "bg-red-500 hover:bg-red-600 text-white" 
                  : status === "Connected"
                    ? "bg-purple-1 hover:bg-purple-1/90 text-white"
                    : "bg-dark-3 text-white/30 cursor-not-allowed"
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff size={18} />
                  Stop
                </>
              ) : (
                <>
                  <Mic size={18} />
                  Start Recording
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-red-400">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium">Recording...</span>
          </div>
        )}

        {/* Transcription output */}
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto bg-dark-3/50 rounded-apple p-4 border border-white/5">
          {transcription.length === 0 ? (
            <p className="text-white/30 text-center py-8">
              {status === "Connected" 
                ? "Click 'Start Recording' to begin live transcription" 
                : "Connect to Eburon STT server to start transcription"}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {transcription.map((text, index) => (
                <div 
                  key={index} 
                  className="p-3 bg-dark-4/50 rounded-apple animate-slide-up"
                >
                  <p className="text-white/90 leading-relaxed">{text}</p>
                </div>
              ))}
              {isProcessing && (
                <div className="flex items-center gap-2 text-white/50 p-3">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Processing audio...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-white/40 space-y-1">
          <p>• Make sure the Eburon STT server is running on port 8000</p>
          <p>• Speak clearly for best transcription results</p>
          <p>• Stop recording to send audio for transcription</p>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsPage;
