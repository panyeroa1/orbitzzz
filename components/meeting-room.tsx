import {
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MicOff } from "lucide-react";

import { Loader } from "./loader";
import { TranslationModal } from "./translation-modal";
import { DonationSidebar } from "./donation-sidebar";
import { MeetingBottomBar } from "./meeting-bottom-bar";
import { AnimatedBackground } from "./animated-background";
import { TitleBar } from "./title-bar";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";
type SidePanel = "participants" | "broadcaster" | "donation" | "translator" | null;

export const MeetingRoom = () => {
  const router = useRouter();
  const call = useCall();
  const [activeSidebar, setActiveSidebar] = useState<SidePanel>("participants");
  const [showTranslation, setShowTranslation] = useState(false);
  const [layout] = useState<CallLayoutType>("speaker-left");

  const { useCallCallingState, useMicrophoneState, useCameraState, useParticipants } =
    useCallStateHooks();
  const callingState = useCallCallingState();
  const { isEnabled: isMicEnabled } = useMicrophoneState();
  const { isEnabled: isCamEnabled } = useCameraState();
  const participants = useParticipants();

  const participantCount = participants?.length || 0;
  const hostName = useMemo(() => {
    const first = participants?.[0];
    if (!first) return "Host";
    const name = (first as any)?.user?.name || (first as any)?.name || first.userId;
    return name || "Host";
  }, [participants]);

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

  const ParticipantList = () => (
    <div className="flex h-full w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-white">
          <span className="text-lg font-semibold">Participants</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
            {participantCount}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <ul className="divide-y divide-white/5">
          {participants?.map((p) => {
            const name =
              (p as any)?.user?.name ||
              (p as any)?.name ||
              p.userId ||
              "Guest";
            const avatar =
              (p as any)?.user?.image || (p as any)?.image || null;
            const muted =
              (p as any)?.audio?.state === "disabled" ||
              (p as any)?.isMuted ||
              (p as any)?.isMicrophoneEnabled === false;

            return (
              <li
                key={p.userId}
                className="flex items-center gap-3 px-4 py-3 text-sm text-white/90"
              >
                <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/10">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/70">
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="flex-1 truncate">{name}</span>
                <MicOff
                  className={muted ? "text-red-500" : "text-white/40"}
                  size={16}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  const SidebarContent = () => {
    switch (activeSidebar) {
      case "broadcaster":
        return (
          <div className="h-full w-[320px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl">
            <iframe
              src={`/broadcaster.html?meeting_id=${encodeURIComponent(call?.id || "unknown")}`}
              className="h-full w-full border-0"
              title="Orbits Broadcaster"
              allow="microphone; camera; display-capture; autoplay; clipboard-write; fullscreen"
            />
          </div>
        );
      case "donation":
        return (
          <div className="h-full w-[320px] shrink-0 overflow-y-auto rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-xl">
            <DonationSidebar />
          </div>
        );
      default:
        return <ParticipantList />;
    }
  };

  return (
    <AnimatedBackground className="flex h-screen w-screen overflow-hidden bg-black">
      <TitleBar />

      <div className="relative flex w-full flex-1 gap-4 overflow-hidden px-4 pb-20 pt-2">
        <div className="relative flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-2xl">
          <div className="absolute left-4 top-4 rounded-md bg-black/60 px-3 py-1 text-sm text-white/90">
            Host: {hostName}
          </div>
          <div className="absolute bottom-4 left-4 rounded-md bg-black/60 px-3 py-1 text-sm text-white/90">
            Host: {hostName}
          </div>
          <div className="h-full w-full [&_.str-video]:h-full [&_.str-video]:w-full">
            <CallLayout />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeSidebar && (
            <motion.div
              key={activeSidebar}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="z-40 h-full shrink-0"
            >
              <SidebarContent />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
            prev === "broadcaster" ? "participants" : "broadcaster"
          )
        }
        onToggleTranslator={() =>
          setActiveSidebar((prev) =>
            prev === "translator" ? "participants" : "translator"
          )
        }
        onToggleDonation={() =>
          setActiveSidebar((prev) =>
            prev === "donation" ? "participants" : "donation"
          )
        }
      />

      <TranslationModal
        meetingId={call?.id || ""}
        open={showTranslation}
        onOpenChange={setShowTranslation}
      />
    </AnimatedBackground>
  );
};
