"use client";

import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { SIDEBAR_LINKS, SIDEBAR_ACTIONS } from "@/constants";
import { cn } from "@/lib/utils";

// Individual Dock Icon with magnification (for navigation)
interface DockIconProps {
  item: typeof SIDEBAR_LINKS[number];
  mouseX: MotionValue<number>;
}

function DockIcon({ item, mouseX }: DockIconProps) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    const iconCenter = bounds.x + bounds.width / 2;
    return Math.abs(val - iconCenter);
  });

  const widthSync = useTransform(distance, [0, 150], [72, 48]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 300,
    damping: 20,
  });

  return (
    <Link href={item.route}>
      <motion.div
        ref={ref}
        style={{ width }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex flex-col items-center justify-center group"
      >
        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 10,
          }}
          transition={{ duration: 0.2 }}
          className="absolute -top-12 px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg text-white text-sm font-medium whitespace-nowrap pointer-events-none z-50"
        >
          {item.label}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-black/80 rotate-45" />
        </motion.div>

        {/* Icon Container */}
        <motion.div
          className={cn(
            "aspect-square w-full rounded-2xl flex items-center justify-center transition-all duration-200 relative overflow-hidden",
            isActive
              ? "bg-white/10 shadow-lg shadow-blue-500/20"
              : "bg-white/5 hover:bg-white/10"
          )}
        >
          {/* Active Indicator Glow */}
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 animate-pulse" />
          )}

          <Image
            src={item.imgUrl}
            alt={item.label}
            width={32}
            height={32}
            className={cn(
              "relative z-10 transition-all duration-200",
              isActive ? "opacity-100 brightness-110" : "opacity-70"
            )}
          />
        </motion.div>

        {/* Active Indicator Dot */}
        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/50"
          />
        )}
      </motion.div>
    </Link>
  );
}

// Dock Action Icon with magnification (for sidebar triggers)
interface DockActionIconProps {
  item: typeof SIDEBAR_ACTIONS[number];
  mouseX: MotionValue<number>;
  onClick: (action: string) => void;
  isActive?: boolean;
}

function DockActionIcon({ item, mouseX, onClick, isActive = false }: DockActionIconProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    const iconCenter = bounds.x + bounds.width / 2;
    return Math.abs(val - iconCenter);
  });

  const widthSync = useTransform(distance, [0, 150], [72, 48]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 300,
    damping: 20,
  });

  return (
    <button
      onClick={() => onClick(item.action)}
      className="focus:outline-none"
    >
      <motion.div
        ref={ref}
        style={{ width }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex flex-col items-center justify-center group"
      >
        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 10,
          }}
          transition={{ duration: 0.2 }}
          className="absolute -top-12 px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg text-white text-sm font-medium whitespace-nowrap pointer-events-none z-50"
        >
          {item.label}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-black/80 rotate-45" />
        </motion.div>

        {/* Icon Container */}
        <motion.div
          className={cn(
            "aspect-square w-full rounded-2xl flex items-center justify-center transition-all duration-200 relative overflow-hidden",
            isActive
              ? "bg-gradient-to-br from-[#00e0ff]/20 to-[#006dff]/20 shadow-lg shadow-[#00e0ff]/30"
              : "bg-white/5 hover:bg-white/10"
          )}
        >
          {/* Active Indicator Glow */}
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#00e0ff]/30 to-[#006dff]/30 animate-pulse" />
          )}

          <Image
            src={item.imgUrl}
            alt={item.label}
            width={32}
            height={32}
            className={cn(
              "relative z-10 transition-all duration-200",
              isActive ? "opacity-100 brightness-125" : "opacity-70"
            )}
          />
        </motion.div>

        {/* Active Indicator Dot */}
        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#00e0ff] to-[#006dff] shadow-lg shadow-[#00e0ff]/50"
          />
        )}
      </motion.div>
    </button>
  );
}

// Dock Divider
function DockDivider() {
  return (
    <div className="w-px h-10 bg-white/10 mx-2" />
  );
}

// Props for main Dock
interface DockProps {
  onSidebarAction?: (action: string) => void;
  activeSidebar?: "broadcaster" | "translator" | null;
}

// Main Dock Component
export function Dock({ onSidebarAction, activeSidebar }: DockProps = {}) {
  const mouseX = useMotionValue<number>(Infinity);

  const handleAction = (action: string) => {
    onSidebarAction?.(action);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-lg:hidden">
      <motion.div
        onMouseMove={(e: React.MouseEvent) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-end gap-3 px-6 py-3 bg-[#1a1a1a]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl"
        style={{
          height: "80px", // Match MeetingBottomBar height constraint if appropriate, or let it grow. MeetingBottomBar has h-[80px]. Dock relies on icons. Let's keep it flexible but styled similarly.
        }}
      >
        {/* Navigation Icons */}
        {SIDEBAR_LINKS.map((item) => (
          <DockIcon key={item.route} item={item} mouseX={mouseX} />
        ))}

        {/* Divider */}
        <DockDivider />

        {/* Action Icons (Broadcaster, Translator) */}
        {SIDEBAR_ACTIONS.map((item) => (
          <DockActionIcon
            key={item.action}
            item={item}
            mouseX={mouseX}
            onClick={handleAction}
            isActive={activeSidebar === item.action}
          />
        ))}
      </motion.div>
    </div>
  );
}
