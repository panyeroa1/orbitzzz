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

      {/* Waves Container - Full screen slow wavy background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
        >
          <defs>
            <path
              id="slow-wave"
              d="M0,400 C180,350 360,450 540,400 C720,350 900,450 1080,400 C1260,350 1440,450 1620,400 L1620,900 L0,900 Z"
            />
            <path
              id="slow-wave-2"
              d="M0,500 C240,450 480,550 720,500 C960,450 1200,550 1440,500 L1440,900 L0,900 Z"
            />
            <path
              id="slow-wave-3"
              d="M0,600 C160,550 320,650 480,600 C640,550 800,650 960,600 C1120,550 1280,650 1440,600 L1440,900 L0,900 Z"
            />
          </defs>
          <g className="slow-waves">
            <use
              xlinkHref="#slow-wave"
              fill="rgba(30,30,40,0.5)"
              className="wave-1"
            />
            <use
              xlinkHref="#slow-wave-2"
              fill="rgba(20,20,30,0.4)"
              className="wave-2"
            />
            <use
              xlinkHref="#slow-wave-3"
              fill="rgba(15,15,25,0.3)"
              className="wave-3"
            />
          </g>
        </svg>

        <style jsx>{`
          .wave-1 {
            animation: slow-sway 30s ease-in-out infinite;
          }
          .wave-2 {
            animation: slow-sway 40s ease-in-out infinite reverse;
          }
          .wave-3 {
            animation: slow-sway 50s ease-in-out infinite;
          }
          @keyframes slow-sway {
            0%, 100% {
              transform: translateX(0) translateY(0);
            }
            25% {
              transform: translateX(-30px) translateY(10px);
            }
            50% {
              transform: translateX(0) translateY(-15px);
            }
            75% {
              transform: translateX(30px) translateY(5px);
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
