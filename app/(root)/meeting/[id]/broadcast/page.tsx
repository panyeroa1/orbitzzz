"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BroadcastPageProps {
  params: Promise<{ id: string }>;
}

export default function BroadcastPage({ params }: BroadcastPageProps) {
  const { id: meetingId } = use(params);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-dark-1 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-dark-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Meeting
        </button>
        <div className="text-sm text-white/60">
          Meeting: <span className="text-purple-1 font-mono">{meetingId}</span>
        </div>
      </div>

      {/* Broadcaster Iframe */}
      <div className="flex-1">
        <iframe
          src={`/broadcaster.html?meeting_id=${meetingId}`}
          className="w-full h-full border-0"
          allow="microphone; camera; display-capture"
          title="Eburon Broadcaster"
        />
      </div>
    </div>
  );
}
