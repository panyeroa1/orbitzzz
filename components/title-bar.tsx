"use client";

import React from "react";

export const TitleBar = () => {
  return (
    <div className="z-50 flex h-10 w-full select-none items-center justify-between px-4">
      {/* Traffic Lights */}
      <div className="group flex items-center gap-2">
        <div className="flex h-3 w-3 items-center justify-center rounded-full border border-black/10 bg-[#FF5F57]">
          <div className="h-1.5 w-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Close Icon (X) can go here if actionable */}
          </div>
        </div>
        <div className="h-3 w-3 rounded-full border border-black/10 bg-[#FEBC2E]" />
        <div className="h-3 w-3 rounded-full border border-black/10 bg-[#28C840]" />
      </div>

      {/* App Title */}
      <div className="font-sans text-sm font-medium tracking-wide text-white/50">
        Orbits
      </div>

      {/* Spacer for centering logic */}
      <div className="w-12" />
    </div>
  );
};
