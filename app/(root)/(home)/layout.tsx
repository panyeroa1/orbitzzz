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
      <section className="min-h-screen w-full overflow-y-auto px-4 pb-28 pt-20 sm:px-6">
        <div className="mx-auto h-full w-full max-w-7xl">{children}</div>
      </section>

      {/* macOS-style Dock at bottom */}
      <Dock />
    </AnimatedBackground>
  );
};

export default HomeLayout;
