"use client";

interface BroadcasterSidebarProps {
  onActiveChange?: (isActive: boolean) => void;
}

export function BroadcasterSidebar({
  onActiveChange,
}: BroadcasterSidebarProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-black/20">
      <iframe
        src="/broadcaster.html"
        className="h-full w-full border-0"
        allow="camera; microphone; display-capture; autoplay; clipboard-write"
        allowFullScreen
        title="Eburon Broadcaster"
      />
    </div>
  );
}
