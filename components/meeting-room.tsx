import {
  CallParticipantsList,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Loader } from "./loader";
import { TranslationModal } from "./translation-modal";
import { DonationSidebar } from "./donation-sidebar";

import { MeetingBottomBar } from "./meeting-bottom-bar";
import { AnimatedBackground } from "./animated-background";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

export const MeetingRoom = () => {
  const router = useRouter();
  const call = useCall();
  const [activeSidebar, setActiveSidebar] = useState<
    "participants" | "broadcaster" | "translator" | "donation" | null
  >(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [layout, setLayout] = useState<CallLayoutType>("speaker-left");

  // Call State Hooks
  const { useCallCallingState, useMicrophoneState, useCameraState } =
    useCallStateHooks();
  const callingState = useCallCallingState();
  const { isEnabled: isMicEnabled } = useMicrophoneState();
  const { isEnabled: isCamEnabled } = useCameraState();

  if (callingState !== CallingState.JOINED) return <Loader />;

  /* Sidebar Content Renderer */
  const SidebarContent = () => {
    switch (activeSidebar) {
      case "participants":
        return <CallParticipantsList onClose={() => setActiveSidebar(null)} />;
      case "broadcaster":
        return (
          <div className="h-full w-full bg-[#0d0f18]">
            <iframe
              src="https://eburon.ai/broadcaster/"
              className="h-full w-full border-0"
              title="Eburon Broadcaster"
              allow="microphone; camera; display-capture; autoplay; clipboard-write; fullscreen; speaker; audio *; screen-wake-lock; web-share"
            />
          </div>
        );
      case "translator":
        return (
          <div className="h-full w-full bg-[#0d0f18]">
            <iframe
              src="https://eburon.ai/translate"
              className="h-full w-full border-0"
              title="Eburon Translator"
              allow="microphone; autoplay; clipboard-write; fullscreen; speaker; audio *"
            />
          </div>
        );
      case "donation":
        return (
          <div className="h-full bg-[#0d0f18] p-6">
            <DonationSidebar />
          </div>
        );
      default:
        return null;
    }
  };

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
    <AnimatedBackground className="flex h-screen w-screen overflow-hidden bg-[#0d0f18]">
      {/* Main Content Area - Full screen video + sidebar */}
      <div className="absolute inset-0 flex">
        {/* Video Area - Full screen */}
        <div className="relative h-full flex-1 bg-black [&_.str-video]:h-full [&_.str-video]:w-full [&_.str-video__video]:h-full [&_.str-video__video]:w-full">
          <CallLayout />
        </div>

        {/* Right Sidebar - Full height */}
        <AnimatePresence mode="wait">
          {activeSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="z-40 flex h-full shrink-0 flex-col overflow-hidden border-l border-white/10 bg-[#0d0f18]"
            >
              {/* Sidebar Header */}
              <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-white/10 bg-[#0d0f18] p-4">
                <h2 className="text-sm font-medium capitalize text-white/90">
                  {activeSidebar}
                </h2>
                <button
                  onClick={() => setActiveSidebar(null)}
                  className="rounded-lg p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                  title="Close sidebar"
                >
                  <span className="sr-only">Close sidebar</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {/* Sidebar Content - Full remaining height */}
              <div className="flex-1 overflow-hidden bg-[#0d0f18]">
                <SidebarContent />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Control Bar - Auto-hides after 12s */}
      <MeetingBottomBar
        isMicEnabled={isMicEnabled}
        isCamEnabled={isCamEnabled}
        onLeave={() => router.push("/")}
        onToggleParticipants={() =>
          setActiveSidebar((prev) =>
            prev === "participants" ? null : "participants"
          )
        }
        onToggleBroadcast={() =>
          setActiveSidebar((prev) =>
            prev === "broadcaster" ? null : "broadcaster"
          )
        }
        onToggleTranslator={() =>
          setActiveSidebar((prev) =>
            prev === "translator" ? null : "translator"
          )
        }
        onToggleDonation={() =>
          setActiveSidebar((prev) => (prev === "donation" ? null : "donation"))
        }
      />

      {/* Translation Modal */}
      <TranslationModal
        meetingId={call?.id || ""}
        open={showTranslation}
        onOpenChange={setShowTranslation}
      />
    </AnimatedBackground>
  );
};
