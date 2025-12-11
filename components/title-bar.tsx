"use client";

import React from 'react';

export const TitleBar = () => {
  return (
    <div className="w-full h-10 flex items-center justify-between px-4 select-none z-50">
      {/* Traffic Lights */}
      <div className="flex items-center gap-2 group">
        <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-black/10 flex items-center justify-center">
            <div className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Close Icon (X) can go here if actionable */}
            </div>
        </div>
        <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-black/10" />
        <div className="w-3 h-3 rounded-full bg-[#28C840] border border-black/10" />
      </div>

      {/* App Title */}
      <div className="text-sm font-medium text-white/50 tracking-wide font-sans">
        Orbits
      </div>

      {/* Spacer for centering logic */}
      <div className="w-12" />
    </div>
  );
};
