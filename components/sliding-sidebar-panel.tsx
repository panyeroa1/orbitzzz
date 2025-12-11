"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SlidingSidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  isActive?: boolean;
  activeIndicatorColor?: string;
  children: ReactNode;
  className?: string;
}

export function SlidingSidebarPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  isActive = false,
  activeIndicatorColor = "#00e0ff",
  children,
  className,
}: SlidingSidebarPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCollapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const handleExpand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isCollapsed ? 0 : 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",
              isCollapsed && "pointer-events-none"
            )}
            onClick={handleCollapse}
          />

          {/* Collapsed indicator */}
          <AnimatePresence>
            {isCollapsed && isActive && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onClick={handleExpand}
                className="fixed left-0 top-1/2 z-50 flex -translate-y-1/2 cursor-pointer flex-col items-center gap-3 rounded-r-xl border border-white/10 bg-dark-1/90 px-2 py-4 shadow-apple-xl backdrop-blur-xl transition-colors hover:bg-dark-3/90"
              >
                <div
                  className="h-3 w-3 animate-pulse rounded-full shadow-lg"
                  style={{
                    backgroundColor: activeIndicatorColor,
                    boxShadow: `0 0 10px ${activeIndicatorColor}`,
                  }}
                />
                <ChevronRight className="h-5 w-5 text-white/70" />
                <span
                  className="writing-mode-vertical whitespace-nowrap text-xs text-white/70"
                  style={{ writingMode: "vertical-rl" }}
                >
                  {title}
                </span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: isCollapsed ? "-100%" : 0 }}
            exit={{ x: "-100%" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
            }}
            className={cn(
              "fixed left-0 top-0 z-50 h-full w-1/2 min-w-[400px] max-w-[600px]",
              "bg-gradient-to-br from-dark-1/95 via-dark-2/95 to-dark-1/95",
              "border-r border-white/10 backdrop-blur-2xl",
              "flex flex-col shadow-2xl shadow-black/50",
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                {/* Active indicator */}
                {isActive && (
                  <div
                    className="h-3 w-3 animate-pulse rounded-full shadow-lg"
                    style={{
                      backgroundColor: activeIndicatorColor,
                      boxShadow: `0 0 10px ${activeIndicatorColor}`,
                    }}
                  />
                )}
                <div>
                  <h2 className="text-lg font-semibold tracking-apple-normal text-white">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-sm text-white/50">{subtitle}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Collapse button */}
                <button
                  onClick={handleCollapse}
                  className="rounded-lg bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  title="Minimize to background"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="rounded-lg bg-white/5 p-2 text-white/70 transition-colors hover:bg-red-500/20 hover:text-red-400"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            {/* Footer */}
            {isActive && (
              <div className="border-t border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <div
                    className="h-2 w-2 animate-pulse rounded-full"
                    style={{ backgroundColor: activeIndicatorColor }}
                  />
                  <span>Running in background when minimized</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
