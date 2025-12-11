"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Shield,
  Users,
  Radio,
  Disc,
  Smile,
  Heart,
  Languages,
} from "lucide-react";
import { useCall } from "@stream-io/video-react-sdk";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MeetingBottomBarProps {
  onLeave: () => void;
  onToggleParticipants: () => void;
  onToggleBroadcast: () => void;
  onToggleTranslator: () => void;
  onToggleDonation: () => void;
  isMicEnabled: boolean;
  isCamEnabled: boolean;
}

export const MeetingBottomBar = ({
  onLeave,
  onToggleParticipants,
  onToggleBroadcast,
  onToggleTranslator,
  onToggleDonation,
  isMicEnabled,
  isCamEnabled,
}: MeetingBottomBarProps) => {
  const call = useCall();

  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_HIDE_DELAY = 12000;

  const resetHideTimer = useCallback(() => {
    setIsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setIsVisible(false), AUTO_HIDE_DELAY);
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

  const buttons = [
    {
      label: isMicEnabled ? "Mute" : "Unmute",
      icon: isMicEnabled ? Mic : MicOff,
      onClick: () => call?.microphone.toggle(),
      danger: false,
    },
    {
      label: isCamEnabled ? "Stop Video" : "Start Video",
      icon: isCamEnabled ? Video : VideoOff,
      onClick: () => call?.camera.toggle(),
      danger: false,
    },
    { label: "Security", icon: Shield, onClick: () => {}, danger: false },
    {
      label: "Participants",
      icon: Users,
      onClick: onToggleParticipants,
      danger: false,
    },
    {
      label: "Broadcast",
      icon: Radio,
      onClick: onToggleBroadcast,
      danger: false,
    },
    {
      label: "Translator",
      icon: Languages,
      onClick: onToggleTranslator,
      danger: false,
    },
    {
      label: "Record",
      icon: Disc,
      onClick: () => {},
      danger: false,
    },
    {
      label: "Reactions",
      icon: Smile,
      onClick: () => {},
      danger: false,
    },
    {
      label: "Donate",
      icon: Heart,
      onClick: onToggleDonation,
      danger: false,
    },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-gradient-to-t from-black/80 to-black/40 pb-3 pt-2"
        >
          <div className="flex w-full max-w-full items-center justify-between gap-2 rounded-3xl border border-white/10 bg-black/70 px-4 py-3 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-1 items-center justify-start gap-1 overflow-x-auto">
              {buttons.map(({ label, icon: Icon, onClick, danger }) => (
                <motion.button
                  key={label}
                  onClick={onClick}
                  whileHover={{ scale: 1.08 }}
                  className={cn(
                    "group flex min-w-[76px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white",
                    danger && "text-red-500"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="whitespace-nowrap">{label}</span>
                </motion.button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={onLeave}
              className="flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700"
            >
              Leave
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
