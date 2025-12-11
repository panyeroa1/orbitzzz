import {
  CallParticipantsList,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
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
  
  // Track which background services have been activated (to keep running)
  const [broadcasterActive, setBroadcasterActive] = useState(false);
  const [translatorActive, setTranslatorActive] = useState(false);

  // Auto-hide controls logic
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_HIDE_DELAY = 12000;

  const resetHideTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setIsControlsVisible(false), AUTO_HIDE_DELAY);
  }, []);

  const handleUserActivity = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  useEffect(() => {
    resetHideTimer();
    const events = ["mousemove", "mousedown", "touchstart", "keydown", "scroll"];
    events.forEach((ev) => document.addEventListener(ev, handleUserActivity, { passive: true }));
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handleUserActivity));
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [handleUserActivity, resetHideTimer]);


  // Call State Hooks
  const { useCallCallingState, useMicrophoneState, useCameraState } =
    useCallStateHooks();
  const callingState = useCallCallingState();
  const { isEnabled: isMicEnabled } = useMicrophoneState();
  const { isEnabled: isCamEnabled } = useCameraState();

  if (callingState !== CallingState.JOINED) return <Loader />;

  /* Sidebar Content Renderer - Only for non-persistent sidebars */
  const SidebarContent = () => {
    switch (activeSidebar) {
      case "participants":
        return (
          <div className="h-full w-full overflow-hidden">
            <CallParticipantsList onClose={() => setActiveSidebar(null)} />
          </div>
        );
      case "broadcaster":
        return null; // Handled by persistent iframe
      case "translator":
        return null; // Handled by persistent iframe
      case "donation":
        return (
          <div className="h-full bg-[#0d0f18]/80 p-6 text-white">
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

  const handleToggleBroadcast = () => {
    if (activeSidebar !== "broadcaster") setBroadcasterActive(true);
    setActiveSidebar((prev) => (prev === "broadcaster" ? null : "broadcaster"));
  };

  const handleToggleTranslator = () => {
    if (activeSidebar !== "translator") setTranslatorActive(true);
    setActiveSidebar((prev) => (prev === "translator" ? null : "translator"));
  };

  return (
    <AnimatedBackground className="flex h-screen w-screen overflow-hidden bg-black font-sans text-white">
      
      {/* Top Branding Bar */}
      <div className="absolute left-6 top-6 z-50 flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 backdrop-blur-md border border-white/10 shadow-lg">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold tracking-wide text-white/90">Orbits</span>
          <span className="text-xs text-white/50">|</span>
          <span className="text-xs font-mono text-white/70">{call?.id}</span>
        </div>
      </div>

      {/* Main Video Area - Full Screen & Floating */}
      {/* Dynamic padding based on visibility of bottom controls */}
      <div className={`absolute inset-0 z-0 p-4 transition-all duration-500 ease-in-out ${isControlsVisible ? "pb-24" : "pb-4"}`}>
        <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-black/50 shadow-2xl backdrop-blur-sm [&_.str-video]:h-full [&_.str-video]:w-full [&_.str-video__video]:h-full [&_.str-video__video]:w-full [&_.str-video__video]:object-cover">
          <CallLayout />
        </div>
      </div>

      {/* SIDEBARS: All sidebars are now floating overlays to prevent video resizing */}

      {/* Persistent: Broadcaster */}
      {broadcasterActive && (
        <div 
          className={`absolute z-30 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            activeSidebar === "broadcaster" 
              ? `right-4 top-4 w-[400px] rounded-3xl border border-white/10 shadow-2xl overflow-hidden ${isControlsVisible ? "bottom-24" : "bottom-4"}` 
              : "pointer-events-none fixed -left-[9999px] top-0 h-[1px] w-[1px] opacity-0"
          }`}
        >
          {activeSidebar === "broadcaster" && (
            <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-white/10 bg-black/80 backdrop-blur-xl px-6">
              <h2 className="text-sm font-semibold text-white/90">Broadcaster</h2>
              <button onClick={() => setActiveSidebar(null)} className="rounded-full bg-white/5 p-2 hover:bg-white/10 transition" aria-label="Close sidebar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          )}
          <div className={activeSidebar === "broadcaster" ? "h-[calc(100%-60px)]" : "h-full"}>
            <iframe
              src={`https://eburon.ai/broadcaster/?meeting_id=${encodeURIComponent(call?.id || "")}&autostart=true`}
              className="h-full w-full border-0 bg-black/90"
              title="Eburon Broadcaster"
              allow="microphone; camera; display-capture; autoplay; clipboard-write; fullscreen; speaker; audio *; screen-wake-lock; web-share"
            />
          </div>
        </div>
      )}

      {/* Persistent: Translator */}
      {translatorActive && (
        <div 
          className={`absolute z-30 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            activeSidebar === "translator" 
              ? `right-4 top-4 w-[400px] rounded-3xl border border-white/10 shadow-2xl overflow-hidden ${isControlsVisible ? "bottom-24" : "bottom-4"}` 
              : "pointer-events-none fixed -left-[9999px] top-0 h-[1px] w-[1px] opacity-0"
          }`}
        >
          {activeSidebar === "translator" && (
            <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-white/10 bg-black/80 backdrop-blur-xl px-6">
              <h2 className="text-sm font-semibold text-white/90">Translator</h2>
              <button onClick={() => setActiveSidebar(null)} className="rounded-full bg-white/5 p-2 hover:bg-white/10 transition" aria-label="Close sidebar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          )}
          <div className={activeSidebar === "translator" ? "h-[calc(100%-60px)]" : "h-full"}>
            <iframe
              src="https://eburon.ai/translate"
              className="h-full w-full border-0 bg-black/90"
              title="Eburon Translator"
              allow="microphone; autoplay; clipboard-write; fullscreen; speaker; audio *"
            />
          </div>
        </div>
      )}

      {/* Dynamic: Participants / Donation (Now also floating) */}
      <AnimatePresence mode="wait">
        {activeSidebar && activeSidebar !== "broadcaster" && activeSidebar !== "translator" && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`absolute right-4 top-4 z-40 w-[400px] flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl transition-all duration-500 ease-in-out ${isControlsVisible ? "bottom-24" : "bottom-4"}`}
          >
            {/* Sidebar Header */}
            <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-white/10 bg-white/5 px-6">
              <h2 className="text-sm font-semibold capitalize text-white/90">
                {activeSidebar}
              </h2>
              <button
                onClick={() => setActiveSidebar(null)}
                className="rounded-full bg-white/5 p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close sidebar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-hidden">
              <SidebarContent />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Control Bar */}
      <MeetingBottomBar
        isVisible={isControlsVisible}
        isMicEnabled={isMicEnabled}
        isCamEnabled={isCamEnabled}
        onLeave={() => router.push("/")}
        onToggleParticipants={() => setActiveSidebar(prev => prev === "participants" ? null : "participants")}
        onToggleBroadcast={handleToggleBroadcast}
        onToggleTranslator={handleToggleTranslator}
        onToggleDonation={() => setActiveSidebar(prev => prev === "donation" ? null : "donation")}
      />

      <TranslationModal
        meetingId={call?.id || ""}
        open={showTranslation}
        onOpenChange={setShowTranslation}
      />
    </AnimatedBackground>
  );
};
