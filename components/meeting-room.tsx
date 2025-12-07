"use client";

import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import { LayoutList, Users, MessageSquare, X, Languages } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useWebSpeech } from "@/hooks/useWebSpeech";

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

export const MeetingRoom = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showParticipants, setShowParticipants] = useState(false);
  const [layout, setLayout] = useState<CallLayoutType>("speaker-left");
  
  // Transcription State
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Web Speech API for transcription
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    segments,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setLanguage,
  } = useWebSpeech({
    language: selectedLanguage,
    continuous: true,
    interimResults: true,
  });

  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const call = useCall();

  const isPersonalRoom = !!searchParams.get("personal");

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [segments]);

  const toggleTranscription = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const clearTranscript = () => {
    resetTranscript();
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setLanguage(lang);
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
      {interimTranscript && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 max-w-[80%] animate-fade-in">
          <div className="rounded-apple-lg bg-black/80 backdrop-blur-sm px-6 py-3 text-center">
            <p className="text-lg font-medium text-white leading-relaxed">{interimTranscript}</p>
          </div>
        </div>
      )}

      {/* Browser Support Warning */}
      {!isSupported && showTranscript && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 max-w-md animate-fade-in">
          <div className="rounded-apple-lg bg-red-600/90 backdrop-blur-sm px-6 py-3 text-center">
            <p className="text-sm font-medium text-white">Web Speech API is not supported in this browser. Please use Chrome or Edge.</p>
          </div>
        </div>
      )}

      {/* Transcript Panel */}
      {showTranscript && (
        <div className="fixed right-4 top-20 bottom-24 w-80 apple-card flex flex-col animate-slide-up z-50">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="font-semibold tracking-apple-tight">Live Transcript</h3>
            <div className="flex items-center gap-2">
              {segments.length > 0 && (
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
            {segments.length === 0 ? (
              <p className="text-white/40 text-center text-sm py-8">
                {isListening ? "Listening for speech..." : "Start transcription to see live text"}
              </p>
            ) : (
              segments.map((segment, i) => (
                <div key={i} className="p-3 bg-dark-3/50 rounded-apple text-sm">
                  <p className="text-white/90">{segment.text}</p>
                  <div className="flex items-center justify-between mt-1 text-xs text-white/40">
                    <span>{new Date(segment.timestamp).toLocaleTimeString()}</span>
                    {segment.confidence && (
                      <span>{Math.round(segment.confidence * 100)}% confident</span>
                    )}
                  </div>
                </div>
              ))
            )}
            {interimTranscript && (
              <div className="p-3 bg-blue-500/20 rounded-apple text-sm text-white/70 italic">
                {interimTranscript}
              </div>
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
          title={isListening ? "Stop Transcription" : "Start Transcription"}
          className={cn(
            "cursor-pointer rounded-2xl px-4 py-2 transition-all",
            isListening 
              ? "bg-green-600 hover:bg-green-700" 
              : "bg-[#19232D] hover:bg-[#4C535B]"
          )}
        >
          <MessageSquare size={20} className={cn("text-white", { "animate-pulse": isListening })} />
        </button>

        {/* Show Transcript Button */}
        {(isListening || segments.length > 0) && (
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            title="Show Transcript"
            className={cn(
              "cursor-pointer rounded-2xl px-4 py-2",
              showTranscript ? "bg-purple-1" : "bg-[#19232D] hover:bg-[#4C535B]"
            )}
          >
            <span className="text-white text-sm font-medium">
              {segments.length > 0 ? `(${segments.length})` : "Transcript"}
            </span>
          </button>
        )}

        {/* Translation Button */}
        <button
          onClick={() => {
            const meetingId = call?.id || "unknown";
            window.open(`/meeting/${meetingId}/translate`, "_blank", "width=800,height=900");
          }}
          title="Open Translation"
          className="cursor-pointer rounded-2xl bg-[#19232D] px-4 py-2 hover:bg-[#4C535B] transition-all"
        >
          <Languages size={20} className="text-white" />
        </button>

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
