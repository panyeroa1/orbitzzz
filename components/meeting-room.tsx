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
import { LayoutList, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  const isPersonalRoom = !!searchParams.get("personal");

  const startTranscription = async () => {
    try {
        const ws = new WebSocket("ws://localhost:8000/ws/transcribe");
        
        ws.onopen = async () => {
            console.log("WebSocket Connected");
            setSocket(ws);
            setIsTranscribing(true);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                    ws.send(event.data);
                }
            };

            recorder.start(1000); // Send chunks every 1 second
            setMediaRecorder(recorder);
        };

        ws.onmessage = (event) => {
            setTranscription(event.data);
            // Clear subtitle after 3 seconds
            setTimeout(() => setTranscription(""), 5000);
        };

        ws.onclose = () => {
            console.log("WebSocket Disconnected");
            stopTranscription();
        };

    } catch (error) {
        console.error("Error starting transcription:", error);
    }
  };

  const stopTranscription = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    if (socket) {
        socket.close();
    }
    setIsTranscribing(false);
    setSocket(null);
    setMediaRecorder(null);
    setTranscription("");
  };

  const toggleTranscription = () => {
    if (isTranscribing) {
        stopTranscription();
    } else {
        startTranscription();
    }
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

      {/* Subtitles Overlay */}
      {transcription && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 transform rounded-lg bg-black/70 px-6 py-3 text-center text-xl text-yellow-400">
            {transcription}
        </div>
      )}

      <div className="fixed bottom-0 flex w-full flex-wrap items-center justify-center gap-5">
        <CallControls onLeave={() => router.push("/")} />

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
            <DropdownMenuSeparator className="border-dark-1" />
             <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={toggleTranscription}
                >
                  {isTranscribing ? "Stop Transcription" : "Start Transcription"}
            </DropdownMenuItem>
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
