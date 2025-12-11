"use client";

import React, { useState } from "react";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Shield, 
  Users, 
  Radio, 
  Languages, // For Translator
  Disc, 
  Smile,
} from "lucide-react";
import { useCall } from "@stream-io/video-react-sdk";
import { cn } from "@/lib/utils";

interface MeetingBottomBarProps {
  onLeave: () => void;
  onToggleParticipants: () => void;
  onToggleBroadcast: () => void;
  onToggleTranslator: () => void;
  isMicEnabled: boolean;
  isCamEnabled: boolean;
}

export const MeetingBottomBar = ({
  onLeave,
  onToggleParticipants,
  onToggleBroadcast,
  onToggleTranslator,
  isMicEnabled,
  isCamEnabled
}: MeetingBottomBarProps) => {
  const call = useCall();
  const [isRecording, setIsRecording] = useState(false); // Local dummy state for UI

  const ControlButton = ({ 
    icon: Icon, 
    label, 
    isActive = false, 
    onClick, 
    isDestructive = false,
    showArrow = true
  }: { 
    icon: any; 
    label: string; 
    isActive?: boolean; 
    onClick?: () => void; 
    isDestructive?: boolean;
    showArrow?: boolean;
  }) => (
    <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={onClick}>
      <div 
        className={cn(
          "p-2 rounded-lg transition-all duration-200",
          isDestructive 
            ? "bg-red-600 hover:bg-red-700 text-white"
            : isActive
              ? "text-blue-400 bg-white/10" // Simple highlight for active
              : "text-white/70 hover:text-white hover:bg-white/10"
        )}
      >
        <Icon size={24} />
      </div>
      <div className="flex items-center gap-0.5">
          <span className="text-[11px] font-medium text-white/80 group-hover:text-white">{label}</span>
          {showArrow && !isDestructive && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                  <path d="m6 9 6 6 6-6"/>
              </svg>
          )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-[72px] bg-[#1a1a1a]/95 border-t border-white/10 flex items-center justify-between px-4 z-50">
      {/* Left Group */}
      <div className="flex items-center gap-4">
        <ControlButton 
            icon={isMicEnabled ? Mic : MicOff} 
            label={isMicEnabled ? "Mute" : "Unmute"}
            isActive={!isMicEnabled} // "Active" here means button is "pressed" or state is off? usually "Mute" is default.
            // Following Zoom logic: if enabled, icon is normal. if disabled, icon is red/crossed.
            // Let's stick to the visual style of the reference: Clean white icons.
            onClick={() => call?.microphone.toggle()}
        />
        <ControlButton 
            icon={isCamEnabled ? Video : VideoOff} 
            label={isCamEnabled ? "Stop Video" : "Start Video"} 
            onClick={() => call?.camera.toggle()}
        />
      </div>

      {/* Center Group */}
      <div className="flex items-center gap-6">
        <ControlButton icon={Shield} label="Security" showArrow={false} />
        <ControlButton icon={Users} label="Participants" onClick={onToggleParticipants} />
        
        {/* Broadcast & Translate - Key Features */}
        <ControlButton icon={Radio} label="Broadcast" onClick={onToggleBroadcast} showArrow={false} />
        <ControlButton icon={Languages} label="Translator" onClick={onToggleTranslator} showArrow={false} />
        
        <ControlButton icon={Disc} label="Record" showArrow={false} />
        <ControlButton icon={Smile} label="Reactions" showArrow={false} />
      </div>

      {/* Right Group */}
      <div>
        <button 
            onClick={onLeave}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md transition-colors"
        >
            Leave
        </button>
      </div>
    </div>
  );
};
