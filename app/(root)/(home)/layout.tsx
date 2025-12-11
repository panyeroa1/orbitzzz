import type { PropsWithChildren } from "react";

import { Navbar } from "@/components/navbar";
import { Dock } from "@/components/dock";

const HomeLayout = ({ children }: PropsWithChildren) => {
  return (
    <main className="relative min-h-screen">
      <Navbar />

      {/* Full-screen content area */}
      <section className="min-h-screen w-full pt-20 pb-28">
        <div className="w-full h-full">{children}</div>
      </section>

      {/* macOS-style Dock at bottom */}
      <Dock />
    </main>
  );
};

export default HomeLayout;
