"use client";

import { cn } from "@/lib/utils";
import React from "react";

export const AnimatedBackground = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative h-screen w-full overflow-hidden bg-black",
        className
      )}
    >
      {/* Background Gradient to ensure depth */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black via-gray-900 to-[#050505]" />

      {/* Waves Container */}
      <div className="absolute inset-x-0 bottom-0 top-0 z-0 opacity-50">
        <svg
          className="absolute bottom-0 h-[50vh] min-h-[400px] w-full"
          viewBox="0 24 150 28"
          preserveAspectRatio="none"
          shapeRendering="auto"
        >
          <defs>
            <path
              id="gentle-wave"
              d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
            />
          </defs>
          {/* Parallax Waves */}
          <g className="parallax-waves">
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="0"
              fill="rgba(255,255,255,0.03)" // Very faint white/gray
            />
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="3"
              fill="rgba(255,255,255,0.05)"
            />
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="5"
              fill="rgba(255,255,255,0.02)"
            />
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="7"
              fill="rgba(255,255,255,0.01)"
            />
          </g>
        </svg>

        {/* Styles for animation */}
        <style jsx>{`
          .parallax-waves > use {
            animation: move-forever 25s cubic-bezier(0.55, 0.5, 0.45, 0.5)
              infinite;
          }
          .parallax-waves > use:nth-child(1) {
            animation-delay: -2s;
            animation-duration: 7s;
          }
          .parallax-waves > use:nth-child(2) {
            animation-delay: -3s;
            animation-duration: 10s;
          }
          .parallax-waves > use:nth-child(3) {
            animation-delay: -4s;
            animation-duration: 13s;
          }
          .parallax-waves > use:nth-child(4) {
            animation-delay: -5s;
            animation-duration: 20s;
          }
          @keyframes move-forever {
            0% {
              transform: translate3d(-90px, 0, 0);
            }
            100% {
              transform: translate3d(85px, 0, 0);
            }
          }
        `}</style>
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full w-full flex-col">
        {children}
      </div>
    </div>
  );
};
