"use client";

import React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Shield,
  MessageSquareText,
  Radio,
  Globe,
  DollarSign,
} from "lucide-react";
import { useCall } from "@stream-io/video-react-sdk";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MeetingBottomBarProps {
  isVisible: boolean;
  onLeave: () => void;
  onSidebarChange: (sidebar: "participants" | "broadcaster" | "translator" | "donation" | "one-on-one" | null) => void;
  activeSidebar: string | null;
  isMicEnabled: boolean;
  isCamEnabled: boolean;
}

export const MeetingBottomBar = ({
  isVisible,
  onLeave,
  onSidebarChange,
  activeSidebar,
  isMicEnabled,
  isCamEnabled,
}: MeetingBottomBarProps) => {
  const call = useCall();

  const mainControls = [
    {
      label: isMicEnabled ? "Mute" : "Unmute",
      icon: isMicEnabled ? Mic : MicOff,
      onClick: () => call?.microphone.toggle(),
      danger: false,
      isActive: isMicEnabled,
    },
    {
      label: isCamEnabled ? "Stop Video" : "Start Video",
      icon: isCamEnabled ? Video : VideoOff,
      onClick: () => call?.camera.toggle(),
      danger: false,
      isActive: isCamEnabled,
    },
    { label: "Security", icon: Shield, onClick: () => {}, danger: false, isActive: false },
    {
      label: "1:1",
      icon: MessageSquareText, // Using MessageSquareText as visual proxy for 1:1 chat/translation
      onClick: () => onSidebarChange?.("one-on-one"),
      isActive: activeSidebar === "one-on-one",
      danger: false,
    },
    {
      label: "Participants",
      icon: Users,
      onClick: () => onSidebarChange?.("participants"),
      isActive: activeSidebar === "participants",
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSidebarChange?.("broadcaster")}
              title="Broadcaster"
              className={cn(
                "rounded-2xl bg-[#1A1A1A]/80 p-3.5 backdrop-blur-xl transition-all hover:bg-[#2A2A2A] hover:scale-105 active:scale-95 border border-white/5 shadow-lg",
                activeSidebar === "broadcaster" ? "bg-blue-600/20 border-blue-500/50" : ""
              )}
            >
              <Radio size={22} className={cn("text-white", activeSidebar === "broadcaster" ? "text-blue-400" : "")} />
            </button>
            <button
              onClick={() => onSidebarChange?.("translator")}
              title="Translator"
              className={cn(
                "rounded-2xl bg-[#1A1A1A]/80 p-3.5 backdrop-blur-xl transition-all hover:bg-[#2A2A2A] hover:scale-105 active:scale-95 border border-white/5 shadow-lg",
                activeSidebar === "translator" ? "bg-blue-600/20 border-blue-500/50" : ""
              )}
            >
              <Globe size={22} className={cn("text-white", activeSidebar === "translator" ? "text-blue-400" : "")} />
            </button>
          </div>

          <div className="mx-4 flex items-center gap-2 rounded-3xl bg-[#0F0F0F]/80 p-1.5 backdrop-blur-2xl border border-white/5 shadow-2xl">
            {mainControls.map((control, index) => (
              <button
                key={index}
                onClick={control.onClick}
                title={control.label}
                className={cn(
                  "group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:bg-white/10 active:scale-95",
                  control.danger ? "hover:bg-red-500/20" : "",
                  control.isActive && !control.danger ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/50" : "text-white/80 hover:text-white"
                )}
              >
                <control.icon
                  size={22}
                  className={cn(
                    "transition-transform group-hover:scale-110",
                    control.danger ? "text-red-400" : ""
                  )}
                />
                {control.isActive && !control.danger && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
            
            <button
               onClick={onLeave}
               title="Leave Meeting"
               className="group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:bg-red-500/20 active:scale-95"
            >
               <PhoneOff size={22} className="text-red-400 transition-transform group-hover:scale-110" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSidebarChange?.("donation")}
              title="Donate"
              className={cn(
                "rounded-2xl bg-[#1A1A1A]/80 p-3.5 backdrop-blur-xl transition-all hover:bg-[#2A2A2A] hover:scale-105 active:scale-95 border border-white/5 shadow-lg",
                activeSidebar === "donation" ? "bg-blue-600/20 border-blue-500/50" : ""
              )}
            >
              <DollarSign size={22} className={cn("text-white", activeSidebar === "donation" ? "text-blue-400" : "")} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
