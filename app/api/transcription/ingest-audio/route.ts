import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getSpeakerLabel } from "@/lib/speaker-utils";

// Helper to send audio to Deepgram
async function transcribeAudio(audioBuffer: Buffer, mimetype: string) {
  const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY; // Ideally use a backend-only key if available
  if (!deepgramApiKey) {
    throw new Error("Deepgram API Key is missing");
  }

  const url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&punctuate=true&utterances=true";

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
    
    // Advanced Multi-Speaker Processing
    let formattedTranscript = transcript; // fallback
    let dominantSpeakerLabel: string | null = null;

    if (results.words && results.words.length > 0) {
        // 1. Group words by speaker turns
        const turns: { speakerId: number, text: string }[] = [];
        let currentSpeakerId = -1;
        let currentText: string[] = [];

        // Track word counts to find dominant speaker
        const speakerWordCounts: Record<number, number> = {};

        for (const wordObj of results.words) {
            const spk = Number(wordObj.speaker);
            const word = wordObj.word;
            const punctuated_word = wordObj.punctuated_word || word;

            // Update stats
            speakerWordCounts[spk] = (speakerWordCounts[spk] || 0) + 1;

            if (spk !== currentSpeakerId) {
                // Determine if we push previous turn
                if (currentSpeakerId !== -1 && currentText.length > 0) {
                    turns.push({ speakerId: currentSpeakerId, text: currentText.join(" ") });
                }
                // Start new turn
                currentSpeakerId = spk;
                currentText = [punctuated_word];
            } else {
                currentText.push(punctuated_word);
            }
        }
        // Push final turn
        if (currentSpeakerId !== -1 && currentText.length > 0) {
            turns.push({ speakerId: currentSpeakerId, text: currentText.join(" ") });
        }

        // 2. Build Formatted Transcript
        // Format: "Male 1: Hello world. \n Female 1: Hi there."
        if (turns.length > 0) {
            formattedTranscript = turns.map(t => {
                const label = getSpeakerLabel(t.speakerId) || `Speaker ${t.speakerId}`;
                return `${label}: ${t.text}`;
            }).join("\n");
        }

        // 3. Find Dominant Speaker (for metadata column)
        let maxWords = -1;
        let bestSpkId = -1;
        for (const [spkIdStr, count] of Object.entries(speakerWordCounts)) {
            const countNum = count as number;
            if (countNum > maxWords) {
                maxWords = countNum;
                bestSpkId = parseInt(spkIdStr);
            }
        }
        if (bestSpkId !== -1) {
            dominantSpeakerLabel = getSpeakerLabel(bestSpkId) || `speaker_${bestSpkId}`;
        }
    }

    // 2. Upsert into Supabase (update single row per meeting)
    const { error: sbError } = await supabase
      .from("transcriptions")
      .upsert(
        {
          meeting_id: meetingId,
          chunk_index: chunkIndex,
          text_original: formattedTranscript, // Now contains newline-separated speaker turns
          source_language: detectedLanguage || "en",
          speaker_label: dominantSpeakerLabel, // Dominant speaker
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
