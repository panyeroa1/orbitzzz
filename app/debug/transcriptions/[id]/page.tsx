"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DebugTranscriptionsPage({ params }: { params: Promise<{ id: string }> }) {
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
        { event: "INSERT", schema: "public", table: "transcriptions", filter: `meeting_id=eq.${meetingId}` },
        (payload) => {
          setRows(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white font-mono text-sm">
      <h1 className="text-xl mb-4 font-bold">Debug: Transcriptions for {meetingId}</h1>
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-800 text-gray-400">
          <tr>
            <th className="p-2 border-b border-gray-700">Chunk</th>
            <th className="p-2 border-b border-gray-700">Time</th>
            <th className="p-2 border-b border-gray-700">Speaker</th>
            <th className="p-2 border-b border-gray-700">Text</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-800/50">
              <td className="p-2 border-b border-gray-800">{row.chunk_index}</td>
              <td className="p-2 border-b border-gray-800">{new Date(row.created_at).toLocaleTimeString()}</td>
              <td className="p-2 border-b border-gray-800 text-purple-400">{row.speaker_label}</td>
              <td className="p-2 border-b border-gray-800">{row.text_original}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
