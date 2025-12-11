
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


import { Loader } from "./loader";
import { TranslationModal } from "./translation-modal";


import { MeetingBottomBar } from "./meeting-bottom-bar"; // Updated import
import { AnimatedBackground } from "./animated-background";
import { TitleBar } from "./title-bar";
import { IPhoneMockup } from "./iphone-mockup";
import { BroadcasterMockup } from "./broadcaster-mockup";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

export const MeetingRoom = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const call = useCall();
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showTranslator, setShowTranslator] = useState(false);
  const [showBroadcaster, setShowBroadcaster] = useState(false);
  const [layout, setLayout] = useState<CallLayoutType>("speaker-left");
  
  // Call State Hooks
  const { useCallCallingState, useMicrophoneState, useCameraState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const { isEnabled: isMicEnabled } = useMicrophoneState();
  const { isEnabled: isCamEnabled } = useCameraState();

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
    <AnimatedBackground className="flex flex-col h-screen overflow-hidden">
      {/* MacOS Title Bar */}
      <TitleBar />

      {/* Main Content Area (Video + Sidebar) */}
      <div className="flex-1 flex overflow-hidden w-full relative px-4 py-4">
        <div className="flex-1 flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/30 backdrop-blur-md">
                <CallLayout />
            </div>
        </div>

        {/* Pinned Right Sidebar */}
        <AnimatePresence mode="wait">
          {showParticipants && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="h-full ml-4 rounded-2xl border border-white/10 bg-[#1e1e1e]/80 backdrop-blur-xl flex flex-col z-40 overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 h-[60px]">
                <h2 className="text-sm font-medium text-white/90">Participants</h2>
                <button 
                  onClick={() => setShowParticipants(false)}
                  className="text-white/50 hover:text-white transition-colors"
                  title="Close sidebar"
                >
                  <span className="sr-only">Close sidebar</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <CallParticipantsList onClose={() => setShowParticipants(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      
      {/* iPhone Translator Mockup */}
      <IPhoneMockup 
        isOpen={showTranslator}
        onClose={() => setShowTranslator(false)}
      />

      {/* iPhone Broadcaster Mockup */}
      <BroadcasterMockup 
        isOpen={showBroadcaster}
        onClose={() => setShowBroadcaster(false)}
        meetingId={call?.id || "unknown"}
      />

      {/* Fixed Bottom Control Bar */}
      <MeetingBottomBar 
        isMicEnabled={isMicEnabled}
        isCamEnabled={isCamEnabled}
        onLeave={() => router.push("/")}
        onToggleParticipants={() => setShowParticipants((prev) => !prev)}
        onToggleBroadcast={() => setShowBroadcaster((prev) => !prev)}
        onToggleTranslator={() => setShowTranslator((prev) => !prev)}
      />

      {/* Translation Modal (Hidden logic for generic meeting room, can be re-enabled) */}
      <TranslationModal
        meetingId={call?.id || ""}
        open={showTranslation}
        onOpenChange={setShowTranslation}
      />
    </AnimatedBackground>
  );
};
