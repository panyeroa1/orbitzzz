"use client";



interface BroadcasterSidebarProps {
  onActiveChange?: (isActive: boolean) => void;
}

export function BroadcasterSidebar({ onActiveChange }: BroadcasterSidebarProps) {
  return (
    <div className="w-full h-full flex flex-col bg-black/20 overflow-hidden">
       <iframe
        src="/broadcaster.html"
        className="w-full h-full border-0"
        allow="camera; microphone; display-capture; autoplay; clipboard-write"
        allowFullScreen
        title="Eburon Broadcaster"
      />
    </div>
  );
}
