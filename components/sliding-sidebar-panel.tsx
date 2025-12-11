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
              "fixed inset-0 bg-black/60 backdrop-blur-sm z-40",
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
                className="fixed left-0 top-1/2 -translate-y-1/2 z-50 
                  bg-dark-1/90 backdrop-blur-xl border border-white/10 
                  rounded-r-xl py-4 px-2 flex flex-col items-center gap-3
                  hover:bg-dark-3/90 transition-colors cursor-pointer
                  shadow-apple-xl"
              >
                <div 
                  className="w-3 h-3 rounded-full animate-pulse shadow-lg"
                  style={{ backgroundColor: activeIndicatorColor, boxShadow: `0 0 10px ${activeIndicatorColor}` }}
                />
                <ChevronRight className="w-5 h-5 text-white/70" />
                <span className="text-xs text-white/70 writing-mode-vertical whitespace-nowrap" style={{ writingMode: "vertical-rl" }}>
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
              stiffness: 300
            }}
            className={cn(
              "fixed left-0 top-0 h-full w-1/2 max-w-[600px] min-w-[400px] z-50",
              "bg-gradient-to-br from-dark-1/95 via-dark-2/95 to-dark-1/95",
              "backdrop-blur-2xl border-r border-white/10",
              "flex flex-col shadow-2xl shadow-black/50",
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                {/* Active indicator */}
                {isActive && (
                  <div 
                    className="w-3 h-3 rounded-full animate-pulse shadow-lg"
                    style={{ backgroundColor: activeIndicatorColor, boxShadow: `0 0 10px ${activeIndicatorColor}` }}
                  />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-apple-normal">
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
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 
                    transition-colors text-white/70 hover:text-white"
                  title="Minimize to background"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 
                    transition-colors text-white/70 hover:text-red-400"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {children}
            </div>

            {/* Footer */}
            {isActive && (
              <div className="p-4 border-t border-white/10 bg-black/20">
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <div 
                    className="w-2 h-2 rounded-full animate-pulse"
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
