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
import { LayoutList, Users, MessageSquare, X, Languages, ChevronDown } from "lucide-react";
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

// Supported languages for transcription
const TRANSCRIPTION_LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" },
  { code: "pt-BR", label: "Portuguese" },
  { code: "zh-CN", label: "Chinese" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },
  { code: "fil-PH", label: "Tagalog" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ar-SA", label: "Arabic" },
  { code: "ru-RU", label: "Russian" },
  { code: "vi-VN", label: "Vietnamese" },
  { code: "th-TH", label: "Thai" },
];

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
  const [transcriptLanguage, setTranscriptLanguage] = useState("en-US");
  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const call = useCall();

  const isPersonalRoom = !!searchParams.get("personal");

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startTranscription = async () => {
    try {
      // Use Web Speech API (works in most browsers without server)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = transcriptLanguage;

      recognition.onstart = () => {
        console.log(`[Transcription] Started - Language: ${transcriptLanguage}`);
        setIsTranscribing(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        // Show interim results as subtitle
        if (interimTranscript) {
          setCurrentSubtitle(interimTranscript);
        }

        // Add final results to history
        if (finalTranscript.trim()) {
          const langCode = transcriptLanguage.split("-")[0].toUpperCase();
          setTranscriptHistory(prev => [...prev, `[${langCode}] ${finalTranscript.trim()}`]);
          setCurrentSubtitle("");
        }
      };

      recognition.onerror = (event: any) => {
        console.error("[Transcription] Error:", event.error);
        if (event.error === "no-speech") {
          // Restart on no-speech
          recognition.stop();
          setTimeout(() => recognition.start(), 100);
        }
      };

      recognition.onend = () => {
        // Auto-restart if still transcribing
        if (isTranscribing && recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            console.log("[Transcription] Restarting...");
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;

    } catch (error) {
      console.error("[Transcription] Error:", error);
      alert("Could not access microphone. Please allow microphone permissions.");
    }
  };

  const stopTranscription = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsTranscribing(false);
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

        {/* Language Selector for Transcription */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="cursor-pointer rounded-2xl bg-[#19232D] px-3 py-2 hover:bg-[#4C535B] flex items-center gap-1"
            title="Select transcription language"
          >
            <span className="text-white text-xs font-medium">
              {transcriptLanguage.split("-")[0].toUpperCase()}
            </span>
            <ChevronDown size={14} className="text-white/60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-dark-1 bg-dark-1 text-white max-h-64 overflow-y-auto">
            {TRANSCRIPTION_LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                className={cn(
                  "cursor-pointer",
                  transcriptLanguage === lang.code && "bg-purple-1"
                )}
                onClick={() => {
                  setTranscriptLanguage(lang.code);
                  // Restart transcription with new language if active
                  if (isTranscribing) {
                    stopTranscription();
                    setTimeout(() => startTranscription(), 100);
                  }
                }}
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
