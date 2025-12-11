"use client";

import type { PropsWithChildren } from "react";

import { Navbar } from "@/components/navbar";
import { Dock } from "@/components/dock";

import { AnimatedBackground } from "@/components/animated-background";

const HomeLayout = ({ children }: PropsWithChildren) => {
  return (
    <AnimatedBackground className="relative min-h-screen">
      <Navbar />

      {/* Full-screen content area with consistent padding */}
      <section className="min-h-screen w-full pt-20 pb-28 px-4 sm:px-6 overflow-y-auto">
        <div className="w-full h-full max-w-7xl mx-auto">{children}</div>
      </section>

      {/* macOS-style Dock at bottom */}
      <Dock />
    </AnimatedBackground>
  );
};

export default HomeLayout;
