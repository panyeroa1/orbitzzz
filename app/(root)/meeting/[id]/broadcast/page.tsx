"use client";

import { use } from "react";

interface BroadcastPageProps {
  params: Promise<{ id: string }>;
}

export default function BroadcastPage({ params }: BroadcastPageProps) {
  const { id: meetingId } = use(params);
  const broadcasterUrl = `/broadcaster.html?meeting_id=${encodeURIComponent(
    meetingId || "unknown"
  )}`;

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <iframe
        src={broadcasterUrl}
        className="h-full w-full border-0"
        allow="microphone; camera; display-capture; autoplay; clipboard-write; fullscreen"
        title="Eburon Broadcaster"
      />
    </div>
  );
}
