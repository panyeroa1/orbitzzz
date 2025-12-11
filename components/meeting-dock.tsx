"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
} from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  PhoneOff,
  Radio,
  LayoutList,
  Heart,
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

function ControlIcon({
  icon: Icon,
  label,
  isActive,
  isDestructive,
  mouseX,
  onClick,
}: ControlIconProps) {
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
    <button onClick={onClick} className="group relative focus:outline-none">
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
          className="pointer-events-none absolute -top-10 z-50 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs font-medium text-white backdrop-blur-md"
        >
          {label}
        </motion.div>

        {/* Icon Container */}
        <motion.div
          className={cn(
            "flex aspect-square w-full items-center justify-center rounded-xl border border-white/10 shadow-md transition-all duration-200",
            isDestructive
              ? "bg-red-500/80 hover:bg-red-500"
              : isActive
                ? "bg-white text-black shadow-lg shadow-white/20"
                : "bg-black/40 text-white hover:bg-black/60"
          )}
        >
          <Icon
            size={20}
            className={cn(
              isDestructive ? "text-white" : "",
              isActive ? "text-black" : "text-white"
            )}
          />
        </motion.div>
      </motion.div>
    </button>
  );
}

// Divider
function DockDivider() {
  return <div className="mx-1 h-8 w-px bg-white/20" />;
}

interface MeetingDockProps {
  onLeave: () => void;
  onToggleParticipants: () => void;
  onToggleBroadcast: () => void;
  onToggleLayout: () => void;
  onToggleDonation: () => void;
}

export function MeetingDock({
  onLeave,
  onToggleParticipants,
  onToggleBroadcast,
  onToggleLayout,
  onToggleDonation,
}: MeetingDockProps) {
  const call = useCall();
  const router = useRouter();
  const { useMicrophoneState, useCameraState } = useCallStateHooks();
  const { isEnabled: isMicEnabled } = useMicrophoneState();
  const { isEnabled: isCamEnabled } = useCameraState();

  const mouseX = useMotionValue<number>(Infinity);

  if (!call) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex w-full -translate-x-1/2 items-center justify-center">
      <motion.div
        onMouseMove={(e: React.MouseEvent) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="pointer-events-auto flex items-end gap-3 rounded-[24px] border border-white/20 bg-white/10 px-4 py-3 shadow-2xl backdrop-blur-2xl"
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

        {/* Layout */}
        <ControlIcon
          icon={LayoutList}
          label="Change Layout"
          mouseX={mouseX}
          onClick={onToggleLayout}
          isActive={false}
        />

        {/* Broadcast / Translate Custom Button */}
        <ControlIcon
          icon={Radio}
          label="Broadcast"
          mouseX={mouseX}
          onClick={onToggleBroadcast}
          isActive={false}
        />

        {/* Donation Button */}
        <ControlIcon
          icon={Heart}
          label="Donate to Church"
          mouseX={mouseX}
          onClick={onToggleDonation}
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
