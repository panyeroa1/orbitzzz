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
import { cn } from "@/lib/utils";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
  AnimatePresence,
} from "framer-motion";

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
  const mouseX = useMotionValue<number>(Infinity);

  // Auto-hide state
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_HIDE_DELAY = 12000; // 12 seconds

  // Reset hide timer
  const resetHideTimer = useCallback(() => {
    setIsVisible(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, AUTO_HIDE_DELAY);
  }, []);

  // Show dock on user interaction
  const handleUserActivity = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  // Set up global event listeners for user activity
  useEffect(() => {
    // Start initial hide timer
    resetHideTimer();

    // Listen for user interactions anywhere in the document
    const events = [
      "mousemove",
      "mousedown",
      "touchstart",
      "keydown",
      "scroll",
    ];
    events.forEach((event) => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserActivity);
      });
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [handleUserActivity, resetHideTimer]);

  const ControlButton = ({
    icon: Icon,
    label,
    isActive = false,
    onClick,
    isDestructive = false,
    showArrow = true,
    mouseX,
  }: {
    icon: any;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    isDestructive?: boolean;
    showArrow?: boolean;
    mouseX: MotionValue<number>;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const distance = useTransform(mouseX, (val: number) => {
      const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
      const iconCenter = bounds.x + bounds.width / 2;
      return Math.abs(val - iconCenter);
    });

    const widthSync = useTransform(distance, [0, 150], [60, 44]);
    const width = useSpring(widthSync, {
      mass: 0.1,
      stiffness: 150,
      damping: 12,
    });

    const iconScale = useTransform(width, [44, 60], [1, 1.3]);

    return (
      <motion.div
        ref={ref}
        style={{ width }}
        className="group relative flex cursor-pointer flex-col items-center gap-1"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? -40 : 10,
          }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute -top-4 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] text-white backdrop-blur-md"
        >
          {label}
        </motion.div>

        <motion.div
          style={{ width: "100%", height: "100%" }}
          className={cn(
            "flex aspect-square items-center justify-center rounded-xl transition-colors duration-200",
            isDestructive
              ? "bg-red-600 text-white hover:bg-red-700"
              : isActive
                ? "bg-white/10 text-blue-400"
                : "text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <motion.div style={{ scale: iconScale }}>
            <Icon size={22} />
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <motion.div
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            className="flex h-[80px] items-end gap-3 rounded-[32px] border border-white/10 bg-[#0d0f18]/90 px-6 py-3 shadow-2xl backdrop-blur-2xl"
          >
            {/* Left Group */}
            <div className="flex h-full items-end gap-2 border-r border-white/10 pb-2 pr-2">
              <ControlButton
                icon={isMicEnabled ? Mic : MicOff}
                label={isMicEnabled ? "Mute" : "Unmute"}
                isActive={!isMicEnabled}
                onClick={() => call?.microphone.toggle()}
                mouseX={mouseX}
              />
              <ControlButton
                icon={isCamEnabled ? Video : VideoOff}
                label={isCamEnabled ? "Stop Video" : "Start Video"}
                onClick={() => call?.camera.toggle()}
                mouseX={mouseX}
              />
            </div>

            {/* Center Group */}
            <div className="flex h-full items-end gap-2 pb-2">
              <ControlButton
                icon={Shield}
                label="Security"
                showArrow={false}
                mouseX={mouseX}
              />
              <ControlButton
                icon={Users}
                label="Participants"
                onClick={onToggleParticipants}
                mouseX={mouseX}
              />

              <ControlButton
                icon={Radio}
                label="Broadcast"
                onClick={onToggleBroadcast}
                showArrow={false}
                mouseX={mouseX}
              />

              <ControlButton
                icon={Languages}
                label="Translator"
                onClick={onToggleTranslator}
                showArrow={false}
                mouseX={mouseX}
              />

              <ControlButton
                icon={Heart}
                label="Donate"
                onClick={onToggleDonation}
                showArrow={false}
                mouseX={mouseX}
              />

              <ControlButton
                icon={Disc}
                label="Record"
                showArrow={false}
                mouseX={mouseX}
              />
              <ControlButton
                icon={Smile}
                label="Reactions"
                showArrow={false}
                mouseX={mouseX}
              />
            </div>

            {/* Right Group */}
            <div className="flex h-full items-end gap-2 border-l border-white/10 pb-2 pl-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLeave}
                className="h-[44px] rounded-2xl bg-red-600 px-6 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-700"
              >
                Leave
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
