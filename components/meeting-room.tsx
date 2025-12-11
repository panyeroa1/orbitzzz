"use client";

import {
  CallParticipantsList,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";


import { cn } from "@/lib/utils";

import { Loader } from "./loader";
import { TranslationModal } from "./translation-modal";


import { MeetingDock } from "./meeting-dock";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

export const MeetingRoom = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const call = useCall();
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [layout, setLayout] = useState<CallLayoutType>("speaker-left");
  
  // Transcription State Removed (moved to Broadcast/Translate pages)
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (callingState !== CallingState.JOINED) return <Loader />;

  const isPersonalRoom = !!searchParams.get("personal");

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



      
      {/* Meeting Dock Controls */}
      <MeetingDock 
        onLeave={() => router.push("/")}
        onToggleParticipants={() => setShowParticipants((prev) => !prev)}
        onToggleLayout={() => {
            setLayout((prev) => {
              if (prev === "speaker-left") return "grid";
              if (prev === "grid") return "speaker-right";
              return "speaker-left";
            });
        }}
        onToggleBroadcast={() => {
            const meetingId = call?.id || "unknown";
            // Open local broadcaster page which embeds the external tool
            window.open(`/meeting/${meetingId}/broadcast`, "_blank", "width=800,height=700");
        }}
      />

      {/* Translation Modal */}
      <TranslationModal
        meetingId={call?.id || ""}
        open={showTranslation}
        onOpenChange={setShowTranslation}
      />
    </div>
  );
};
