"use client";

import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";
import { 
  Mic, MicOff, Video, VideoOff, MonitorUp, Users, 
  PhoneOff, Settings, Radio
} from "lucide-react";
import { useRef, useState } from "react";
import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Control Icon Component
interface ControlIconProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  isDestructive?: boolean;
  mouseX: MotionValue<number>;
  onClick: () => void;
}

function ControlIcon({ icon: Icon, label, isActive, isDestructive, mouseX, onClick }: ControlIconProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    const iconCenter = bounds.x + bounds.width / 2;
    return Math.abs(val - iconCenter);
  });

  const widthSync = useTransform(distance, [0, 150], [60, 44]); // Slightly smaller than home dock
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 300,
    damping: 20,
  });

  return (
    <button onClick={onClick} className="focus:outline-none relative group">
      <motion.div
        ref={ref}
        style={{ width }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex flex-col items-center justify-center"
      >
        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 10,
          }}
          className="absolute -top-10 px-2 py-1 bg-black/80 backdrop-blur-md rounded-md text-white text-xs font-medium whitespace-nowrap pointer-events-none z-50"
        >
          {label}
        </motion.div>

        {/* Icon Container */}
        <motion.div
          className={cn(
            "aspect-square w-full rounded-full flex items-center justify-center transition-all duration-200 shadow-lg border border-white/10",
            isDestructive 
              ? "bg-red-500 hover:bg-red-600" 
              : isActive 
                ? "bg-white text-black" 
                : "bg-dark-3 hover:bg-dark-4 text-white"
          )}
        >
          <Icon size={20} className={cn(isDestructive ? "text-white" : "", isActive ? "text-black" : "text-white")} />
        </motion.div>
      </motion.div>
    </button>
  );
}

// Divider
function DockDivider() {
  return <div className="w-px h-8 bg-white/20 mx-1" />;
}

interface MeetingDockProps {
  onLeave: () => void;
  onToggleParticipants: () => void;
  onToggleBroadcast: () => void;
}

export function MeetingDock({ onLeave, onToggleParticipants, onToggleBroadcast }: MeetingDockProps) {
  const call = useCall();
  const router = useRouter();
  const { useMicrophoneState, useCameraState } = useCallStateHooks();
  const { isEnabled: isMicEnabled } = useMicrophoneState();
  const { isEnabled: isCamEnabled } = useCameraState();
  
  const mouseX = useMotionValue<number>(Infinity);

  if (!call) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-full pointer-events-none">
      <motion.div
        onMouseMove={(e: React.MouseEvent) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-end gap-3 px-6 py-3 bg-black/20 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl pointer-events-auto"
      >
        {/* Microphone */}
        <ControlIcon
          icon={isMicEnabled ? Mic : MicOff}
          label={isMicEnabled ? "Mute" : "Unmute"}
          isActive={isMicEnabled} 
          mouseX={mouseX}
          onClick={() => call.microphone.toggle()}
        />

        {/* Camera */}
        <ControlIcon
          icon={isCamEnabled ? Video : VideoOff}
          label={isCamEnabled ? "Stop Video" : "Start Video"}
          isActive={isCamEnabled}
          mouseX={mouseX}
          onClick={() => call.camera.toggle()}
        />

        {/* Screen Share */}
        {/* <ControlIcon 
             icon={MonitorUp} 
             label="Share Screen" 
             mouseX={mouseX} 
             onClick={() => call.screenShare.toggle()} 
           /> */}
           {/* Screen share usually needs state to show active. Skipping for simplicity or add later.*/}

        <DockDivider />

        {/* Participants */}
        <ControlIcon
          icon={Users}
          label="Participants"
          mouseX={mouseX}
          onClick={onToggleParticipants}
          isActive={false} // Would need state passed down
        />
        
        {/* Broadcast / Translate Custom Button */}
        <ControlIcon
          icon={Radio}
          label="Broadcast"
          mouseX={mouseX}
          onClick={onToggleBroadcast}
          isActive={false}
        />

        <DockDivider />

        {/* End Call */}
        <ControlIcon
          icon={PhoneOff}
          label="Leave"
          isDestructive={true}
          mouseX={mouseX}
          onClick={onLeave}
        />
      </motion.div>
    </div>
  );
}
