"use client";

import type { PropsWithChildren } from "react";
import { useState, useCallback } from "react";

import { Navbar } from "@/components/navbar";
import { Dock } from "@/components/dock";
import { SlidingSidebarPanel } from "@/components/sliding-sidebar-panel";
import { BroadcasterSidebar } from "@/components/broadcaster-sidebar";
import { TranslatorSidebar } from "@/components/translator-sidebar";
import { useRoleExclusivity } from "@/hooks/use-role-exclusivity";
import { useToast } from "@/components/ui/use-toast";

type SidebarType = "broadcaster" | "translator" | null;

const HomeLayout = ({ children }: PropsWithChildren) => {
  const [activeSidebar, setActiveSidebar] = useState<SidebarType>(null);
  const [isBroadcasterActive, setIsBroadcasterActive] = useState(false);
  const [isTranslatorActive, setIsTranslatorActive] = useState(false);
  
  const { 
    canUseBroadcaster, 
    canUseTranslator, 
    activateBroadcaster, 
    activateTranslator, 
    deactivateRole,
    errorMessage 
  } = useRoleExclusivity();
  
  const { toast } = useToast();

  // Handle sidebar action from dock
  const handleSidebarAction = useCallback(async (action: string) => {
    if (action === "broadcaster") {
      if (!canUseBroadcaster && activeSidebar !== "broadcaster") {
        toast({
          title: "Cannot open Broadcaster",
          description: "Translator is currently active. Please stop it first.",
          variant: "destructive",
        });
        return;
      }
      setActiveSidebar(activeSidebar === "broadcaster" ? null : "broadcaster");
    } else if (action === "translator") {
      if (!canUseTranslator && activeSidebar !== "translator") {
        toast({
          title: "Cannot open Translator",
          description: "Broadcaster is currently active on this device. Please use a different device or account.",
          variant: "destructive",
        });
        return;
      }
      setActiveSidebar(activeSidebar === "translator" ? null : "translator");
    }
  }, [activeSidebar, canUseBroadcaster, canUseTranslator, toast]);

  // Handle broadcaster close
  const handleBroadcasterClose = useCallback(async () => {
    if (isBroadcasterActive) {
      await deactivateRole();
    }
    setActiveSidebar(null);
    setIsBroadcasterActive(false);
  }, [isBroadcasterActive, deactivateRole]);

  // Handle translator close
  const handleTranslatorClose = useCallback(async () => {
    if (isTranslatorActive) {
      await deactivateRole();
    }
    setActiveSidebar(null);
    setIsTranslatorActive(false);
  }, [isTranslatorActive, deactivateRole]);

  // Handle broadcaster active state change
  const handleBroadcasterActiveChange = useCallback(async (isActive: boolean) => {
    setIsBroadcasterActive(isActive);
    if (isActive) {
      await activateBroadcaster();
    } else {
      await deactivateRole();
    }
  }, [activateBroadcaster, deactivateRole]);

  // Handle translator active state change
  const handleTranslatorActiveChange = useCallback(async (isActive: boolean) => {
    setIsTranslatorActive(isActive);
    if (isActive) {
      await activateTranslator();
    } else {
      await deactivateRole();
    }
  }, [activateTranslator, deactivateRole]);

  // Determine active sidebar for dock indicator
  const dockActiveSidebar = isBroadcasterActive 
    ? "broadcaster" 
    : isTranslatorActive 
      ? "translator" 
      : activeSidebar;

  return (
    <main className="relative min-h-screen">
      <Navbar />

      {/* Full-screen content area */}
      <section className="min-h-screen w-full pt-20 pb-28">
        <div className="w-full h-full">{children}</div>
      </section>

      {/* macOS-style Dock at bottom */}
      <Dock 
        onSidebarAction={handleSidebarAction}
        activeSidebar={dockActiveSidebar}
      />

      {/* Broadcaster Sidebar */}
      <SlidingSidebarPanel
        isOpen={activeSidebar === "broadcaster"}
        onClose={handleBroadcasterClose}
        title="Broadcaster"
        subtitle="Live transcription & broadcast"
        isActive={isBroadcasterActive}
        activeIndicatorColor="#00e0ff"
      >
        <BroadcasterSidebar onActiveChange={handleBroadcasterActiveChange} />
      </SlidingSidebarPanel>

      {/* Translator Sidebar */}
      <SlidingSidebarPanel
        isOpen={activeSidebar === "translator"}
        onClose={handleTranslatorClose}
        title="Translator"
        subtitle="Real-time translation & TTS"
        isActive={isTranslatorActive}
        activeIndicatorColor="#00ff90"
      >
        <TranslatorSidebar onActiveChange={handleTranslatorActiveChange} />
      </SlidingSidebarPanel>
    </main>
  );
};

export default HomeLayout;
