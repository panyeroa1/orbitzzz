"use client";

import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { LayoutList, Users, MessageSquare, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { EndCallButton } from "./end-call-button";
import { Loader } from "./loader";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

const WHISPER_URL = process.env.NEXT_PUBLIC_WHISPER_SERVER_URL || "ws://localhost:8000";

export const MeetingRoom = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showParticipants, setShowParticipants] = useState(false);
  const [layout, setLayout] = useState<CallLayoutType>("speaker-left");
  
  // Transcription State
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  const isPersonalRoom = !!searchParams.get("personal");

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptHistory]);

  const startTranscription = async () => {
    try {
      const wsUrl = WHISPER_URL.replace("http://", "ws://").replace("https://", "wss://");
      const ws = new WebSocket(`${wsUrl}/ws/transcribe`);
      
      ws.onopen = async () => {
        console.log("[Eburon STT] Connected to transcription service");
        socketRef.current = ws;
        setIsTranscribing(true);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        recorder.start(2000); // Send chunks every 2 seconds for better accuracy
        mediaRecorderRef.current = recorder;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            const langLabel = data.language ? `[${data.language.toUpperCase()}]` : "";
            setCurrentSubtitle(`${langLabel} ${data.text}`);
            setTranscriptHistory(prev => [...prev, `${langLabel} ${data.text}`]);
            // Clear subtitle after 4 seconds
            setTimeout(() => setCurrentSubtitle(""), 4000);
          }
        } catch {
          // Fallback for plain text (backward compatibility)
          const text = event.data.trim();
          if (text) {
            setCurrentSubtitle(text);
            setTranscriptHistory(prev => [...prev, text]);
            setTimeout(() => setCurrentSubtitle(""), 4000);
          }
        }
      };

      ws.onerror = (error) => {
        console.error("[Eburon STT] Connection error:", error);
      };

      ws.onclose = () => {
        console.log("[Eburon STT] Disconnected");
        stopTranscription();
      };

    } catch (error) {
      console.error("[Eburon STT] Error starting transcription:", error);
      alert("Could not access microphone. Please allow microphone permissions.");
    }
  };

  const stopTranscription = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    setIsTranscribing(false);
    socketRef.current = null;
    mediaRecorderRef.current = null;
    setCurrentSubtitle("");
  };

  const toggleTranscription = () => {
    if (isTranscribing) {
      stopTranscription();
    } else {
      startTranscription();
    }
  };

  const clearTranscript = () => {
    setTranscriptHistory([]);
  };

  if (callingState !== CallingState.JOINED) return <Loader />;

  const CallLayout = () => {
    switch (layout) {
      case "grid":
        return <PaginatedGridLayout />;
      case "speaker-right":
        return <SpeakerLayout participantsBarPosition="left" />;
      default:
        return <SpeakerLayout participantsBarPosition="right" />;
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden pt-4 text-white">
      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center">
          <CallLayout />
        </div>

        <div
          className={cn("ml-2 hidden h-[calc(100vh_-_86px)]", {
            "show-block": showParticipants,
          })}
        >
          <CallParticipantsList onClose={() => setShowParticipants(false)} />
        </div>
      </div>

      {/* Live Subtitles Overlay */}
      {currentSubtitle && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 max-w-[80%] animate-fade-in">
          <div className="rounded-apple-lg bg-black/80 backdrop-blur-sm px-6 py-3 text-center">
            <p className="text-lg font-medium text-white leading-relaxed">{currentSubtitle}</p>
          </div>
        </div>
      )}

      {/* Transcript Panel */}
      {showTranscript && (
        <div className="fixed right-4 top-20 bottom-24 w-80 apple-card flex flex-col animate-slide-up z-50">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="font-semibold tracking-apple-tight">Live Transcript</h3>
            <div className="flex items-center gap-2">
              {transcriptHistory.length > 0 && (
                <button 
                  onClick={clearTranscript}
                  className="text-xs text-white/50 hover:text-white"
                >
                  Clear
                </button>
              )}
              <button onClick={() => setShowTranscript(false)} title="Close transcript">
                <X size={18} className="text-white/60 hover:text-white" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {transcriptHistory.length === 0 ? (
              <p className="text-white/40 text-center text-sm py-8">
                {isTranscribing ? "Listening for speech..." : "Start transcription to see live text"}
              </p>
            ) : (
              transcriptHistory.map((text, i) => (
                <div key={i} className="p-3 bg-dark-3/50 rounded-apple text-sm text-white/90">
                  {text}
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="fixed bottom-0 flex w-full flex-wrap items-center justify-center gap-3 pb-4">
        <CallControls onLeave={() => router.push("/")} />

        {/* Transcription Button */}
        <button
          onClick={toggleTranscription}
          title={isTranscribing ? "Stop Transcription" : "Start Transcription"}
          className={cn(
            "cursor-pointer rounded-2xl px-4 py-2 transition-all",
            isTranscribing 
              ? "bg-green-600 hover:bg-green-700" 
              : "bg-[#19232D] hover:bg-[#4C535B]"
          )}
        >
          <MessageSquare size={20} className={cn("text-white", { "animate-pulse": isTranscribing })} />
        </button>

        {/* Show Transcript Button */}
        {(isTranscribing || transcriptHistory.length > 0) && (
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            title="Show Transcript"
            className={cn(
              "cursor-pointer rounded-2xl px-4 py-2",
              showTranscript ? "bg-purple-1" : "bg-[#19232D] hover:bg-[#4C535B]"
            )}
          >
            <span className="text-white text-sm font-medium">
              {transcriptHistory.length > 0 ? `(${transcriptHistory.length})` : "Transcript"}
            </span>
          </button>
        )}

        <DropdownMenu>
          <div className="flex items-center">
            <DropdownMenuTrigger
              className="cursor-pointer rounded-2xl bg-[#19232D] px-4 py-2 hover:bg-[#4C535B]"
              title="Call layout"
            >
              <LayoutList size={20} className="text-white" />
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent className="border-dark-1 bg-dark-1 text-white">
            {["Grid", "Speaker Left", "Speaker Right"].map((item, i) => (
              <div key={item + "-" + i}>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() =>
                    setLayout(
                      item.toLowerCase().replace(" ", "-") as CallLayoutType
                    )
                  }
                >
                  {item}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="border-dark-1" />
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <CallStatsButton />

        <button
          onClick={() =>
            setShowParticipants((prevShowParticipants) => !prevShowParticipants)
          }
          title="Show participants"
        >
          <div className="cursor-pointer rounded-2xl bg-[#19232D] px-4 py-2 hover:bg-[#4C535B]">
            <Users size={20} className="text-white" />
          </div>
        </button>

        {!isPersonalRoom && <EndCallButton />}
      </div>
    </div>
  );
};
