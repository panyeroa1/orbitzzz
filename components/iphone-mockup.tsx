"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface IPhoneMockupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IPhoneMockup = ({ isOpen, onClose }: IPhoneMockupProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute left-0 top-0 bottom-0 z-50 flex items-center p-8"
        >
          {/* iPhone Frame */}
          <div className="relative w-[375px] h-[812px] bg-black rounded-[60px] shadow-2xl border-[14px] border-gray-900 overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[180px] h-[30px] bg-black rounded-b-3xl z-10" />
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              title="Close translator"
            >
              <X size={20} />
            </button>

            {/* Screen */}
            <div className="w-full h-full bg-white rounded-[46px] overflow-hidden">
              <iframe
                src="https://orbits-tr.vercel.app/"
                className="w-full h-full border-0"
                title="Orbits Translator"
                allow="microphone; autoplay"
              />
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[140px] h-[5px] bg-gray-800 rounded-full" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
