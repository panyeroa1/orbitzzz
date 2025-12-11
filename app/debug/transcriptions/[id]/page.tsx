"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DebugTranscriptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: meetingId } = use(params);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch
    supabase
      .from("transcriptions")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setRows(data);
      });

    // Realtime subscription
    const channel = supabase
      .channel("debug-view")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transcriptions",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          setRows((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  return (
    <div className="min-h-screen bg-gray-900 p-8 font-mono text-sm text-white">
      <h1 className="mb-4 text-xl font-bold">
        Debug: Transcriptions for {meetingId}
      </h1>
      <table className="w-full border-collapse text-left">
        <thead className="bg-gray-800 text-gray-400">
          <tr>
            <th className="border-b border-gray-700 p-2">Chunk</th>
            <th className="border-b border-gray-700 p-2">Time</th>
            <th className="border-b border-gray-700 p-2">Speaker</th>
            <th className="border-b border-gray-700 p-2">Text</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-800/50">
              <td className="border-b border-gray-800 p-2">
                {row.chunk_index}
              </td>
              <td className="border-b border-gray-800 p-2">
                {new Date(row.created_at).toLocaleTimeString()}
              </td>
              <td className="border-b border-gray-800 p-2 text-purple-400">
                {row.speaker_label}
              </td>
              <td className="border-b border-gray-800 p-2">
                {row.text_original}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
