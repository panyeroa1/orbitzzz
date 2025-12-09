import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Helper to send audio to Deepgram
async function transcribeAudio(audioBuffer: Buffer, mimetype: string) {
  const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY; // Ideally use a backend-only key if available
  if (!deepgramApiKey) {
    throw new Error("Deepgram API Key is missing");
  }

  const url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Token ${deepgramApiKey}`,
      "Content-Type": mimetype,
    },
    body: audioBuffer as any,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram API failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;
    const meetingId = formData.get("meeting_id") as string | null;
    const chunkIndexStr = formData.get("chunk_index") as string | null;

    if (!file || !meetingId || !chunkIndexStr) {
      return NextResponse.json(
        { error: "Missing required fields (file, meeting_id, chunk_index)" },
        { status: 400 }
      );
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    const validMimeTypes = ["audio/webm", "audio/ogg", "audio/wav", "audio/mp4"];
    if (!validMimeTypes.includes(file.type) && !file.type.startsWith("audio/")) {
       // Allow general audio/ if browser sends specific codec info
    }

    // Convert Blob to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Transcribe with Deepgram
    const dgResponse = await transcribeAudio(buffer, file.type);
    
    // Check results
    const results = dgResponse.results?.channels?.[0]?.alternatives?.[0];
    const transcript = results?.transcript;

    if (!transcript || !transcript.trim()) {
      // Empty transcript, maybe silence. We can skip inserting or insert empty.
      // Inserting helps keep chunk sequence if needed, but for now let's skip empty to save DB space
      // unless user wants strict continuity.
      return NextResponse.json({ status: "skipped_empty" });
    }

    const confidence = results.confidence;
    const detectedLanguage = dgResponse.results?.channels?.[0]?.detected_language;
    // Extract speaker from first word if available
    let speakerLabel = null;
    if (results.words && results.words.length > 0) {
        speakerLabel = `speaker_${results.words[0].speaker}`;
    }

    // 2. Upsert into Supabase (update single row per meeting)
    const { error: sbError } = await supabase
      .from("transcriptions")
      .upsert(
        {
          meeting_id: meetingId,
          chunk_index: chunkIndex,
          text_original: transcript,
          source_language: detectedLanguage || "en",
          speaker_label: speakerLabel,
        },
        {
          onConflict: 'meeting_id',
          ignoreDuplicates: false,
        }
      );

    if (sbError) {
      console.error("Supabase Upsert Error:", JSON.stringify(sbError, null, 2));
      return NextResponse.json({ error: "Database error: " + sbError.message, details: sbError }, { status: 500 });
    }

    return NextResponse.json({ status: "success", chunk_index: chunkIndex });

  } catch (err: any) {
    console.error("Ingest API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
