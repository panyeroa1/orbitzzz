"use client";

import { use } from "react";

interface BroadcastPageProps {
  params: Promise<{ id: string }>;
}

export default function BroadcastPage({ params }: BroadcastPageProps) {
  const { id: meetingId } = use(params);

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <iframe
        src={`/broadcaster.html?meeting_id=${meetingId}`}
        className="w-full h-full border-0"
        allow="microphone; camera; display-capture"
        title="Eburon Broadcaster"
      />
    </div>
  );
}
