
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
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="relative h-screen w-full overflow-hidden bg-hero bg-cover bg-center text-white">
      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center">
          <CallLayout />
        </div>

        {/* Right Sidebar (Glassmorphism) */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-4 top-4 bottom-24 w-[350px] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-40 flex flex-col"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-lg font-semibold text-white/90">Participants</h2>
                <button 
                  onClick={() => setShowParticipants(false)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                <CallParticipantsList onClose={() => setShowParticipants(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
