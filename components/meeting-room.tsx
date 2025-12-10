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
import { TranslationModal } from "./translation-modal";


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



      {/* Controls */}
      <div className="fixed bottom-0 flex w-full flex-wrap items-center justify-center gap-3 pb-4">
        <CallControls onLeave={() => router.push("/")} />

        {/* Broadcast Button */}
        <button
            onClick={() => {
            const meetingId = call?.id || "unknown";
            // Open local broadcaster page which embeds the external tool
            window.open(`/meeting/${meetingId}/broadcast`, "_blank", "width=800,height=700");
          }}
          title="Open Broadcaster (Source)"
          className="cursor-pointer rounded-2xl bg-[#19232D] px-4 py-2 hover:bg-[#4C535B] transition-all"
        >
          <div className="flex items-center gap-2">
              <span className="text-red-500 animate-pulse">●</span>
              <span className="text-white text-sm font-medium">Broadcast / Translate</span>
          </div>
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

      {/* Translation Modal */}
      <TranslationModal
        meetingId={call?.id || ""}
        open={showTranslation}
        onOpenChange={setShowTranslation}
      />
    </div>
  );
};
