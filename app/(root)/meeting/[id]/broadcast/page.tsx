"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SimpleBroadcaster } from "@/components/SimpleBroadcaster";

type BroadcastPageProps = {
  params: Promise<{ id: string }>;
};

export default function BroadcastPage({ params }: BroadcastPageProps) {
  const { id: meetingId } = use(params);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-dark-1 text-white p-6 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
      </div>

      {/* Main Content */}
      <div className="max-width-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Broadcaster</h1>
          <p className="text-white/60">
            Meeting <span className="text-purple-1 font-mono">{meetingId}</span>
          </p>
        </div>

        {/* Simple Broadcaster Component */}
        <SimpleBroadcaster meetingId={meetingId} className="max-w-2xl mx-auto" />
      </div>
    </div>
  );
}
