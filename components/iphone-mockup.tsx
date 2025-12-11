"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

interface IPhoneMockupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IPhoneMockup = ({ isOpen, onClose }: IPhoneMockupProps) => {
  return (
    <motion.div
      initial={{ x: "-120%" }}
      animate={{ x: isOpen ? 0 : "-120%" }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="fixed z-50
        /* Mobile: Full screen, no rounding */
        max-md:inset-0 max-md:w-full max-md:h-full max-md:rounded-none
        /* Desktop: Bottom-left, scaled down, avoiding header/dock */
        md:left-6 md:bottom-28 md:w-[320px] md:h-[680px] md:origin-bottom-left
      "
    >
      {/* Close Button - Outside frame on Desktop, Top-right on Mobile */}
      <button
        onClick={onClose}
        className="absolute z-50 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors border border-white/20
          /* Mobile: Inside, top-right */
          max-md:top-4 max-md:right-4
          /* Desktop: Outside to the right */
          md:top-10 md:-right-16
        "
        title="Close translator"
      >
        <X size={24} />
      </button>

      {/* iPhone Frame */}
      <div className="relative w-full h-full bg-black md:rounded-[50px] shadow-2xl border-[8px] md:border-[12px] border-gray-900 overflow-hidden flex flex-col">
        {/* Notch - Desktop only or adjust for mobile */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] md:w-[150px] h-[25px] bg-black rounded-b-3xl z-10" />

        {/* Screen */}
        <div className="w-full h-full bg-white md:rounded-[38px] overflow-hidden">
          <iframe
            src="https://orbits-tr.vercel.app/"
            className="w-full h-full border-0"
            title="Orbits Translator"
            allow="microphone; autoplay"
          />
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[100px] md:w-[120px] h-[4px] bg-gray-800 rounded-full" />
      </div>
    </motion.div>
  );
};
