"use client";

import React, { useState, useRef } from "react";
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
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";

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
  isCamEnabled
}: MeetingBottomBarProps) => {
  const call = useCall();
  const [isRecording, setIsRecording] = useState(false); 
  const mouseX = useMotionValue<number>(Infinity);


  const ControlButton = ({ 
    icon: Icon, 
    label, 
    isActive = false, 
    onClick, 
    isDestructive = false,
    showArrow = true,
    mouseX
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

    const widthSync = useTransform(distance, [0, 150], [60, 44]); // Magnification range
    const width = useSpring(widthSync, {
      mass: 0.1,
      stiffness: 150,
      damping: 12,
    });

    // Scale icon size based on width
    const iconScale = useTransform(width, [44, 60], [1, 1.3]);

    return (
      <motion.div 
        ref={ref}
        style={{ width }}
        className="flex flex-col items-center gap-1 group cursor-pointer relative"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Tooltip-like Label */}
         <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? -40 : 10, // Move up
          }}
          transition={{ duration: 0.2 }}
          className="absolute -top-4 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-md rounded text-white text-[10px] whitespace-nowrap pointer-events-none z-50"
        >
          {label}
        </motion.div>

        <motion.div 
          style={{ width: "100%", height: "100%" }}
          className={cn(
            "aspect-square rounded-xl flex items-center justify-center transition-colors duration-200",
            isDestructive 
              ? "bg-red-600 hover:bg-red-700 text-white"
              : isActive
                ? "text-blue-400 bg-white/10" 
                : "text-white/70 hover:text-white hover:bg-white/10"
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
       <motion.div 
          onMouseMove={(e) => mouseX.set(e.pageX)}
          onMouseLeave={() => mouseX.set(Infinity)}
          className="h-[80px] bg-[#1a1a1a]/80 backdrop-blur-2xl border border-white/10 flex items-end gap-3 px-6 py-3 rounded-[32px] shadow-2xl"
       >
        {/* Left Group */}
        <div className="flex items-end gap-2 border-r border-white/10 pr-2 pb-2 h-full">
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
        <div className="flex items-end gap-2 pb-2 h-full">
          <ControlButton icon={Shield} label="Security" showArrow={false} mouseX={mouseX} />
          <ControlButton icon={Users} label="Participants" onClick={onToggleParticipants} mouseX={mouseX} />
          
          <ControlButton icon={Radio} label="Broadcast" onClick={onToggleBroadcast} showArrow={false} mouseX={mouseX} />
          
          <ControlButton icon={Languages} label="Translator" onClick={onToggleTranslator} showArrow={false} mouseX={mouseX} />
          
          <ControlButton icon={Heart} label="Donate" onClick={onToggleDonation} showArrow={false} mouseX={mouseX} />
          
          <ControlButton icon={Disc} label="Record" showArrow={false} mouseX={mouseX} />
          <ControlButton icon={Smile} label="Reactions" showArrow={false} mouseX={mouseX} />
        </div>

        {/* Right Group */}
        <div className="flex items-end gap-2 border-l border-white/10 pl-2 pb-2 h-full">
          <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLeave}
              className="h-[44px] px-6 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-2xl transition-colors shadow-lg shadow-red-600/20"
          >
              Leave
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
