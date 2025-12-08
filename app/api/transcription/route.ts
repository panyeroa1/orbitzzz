/**
 * Transcription API Endpoint
 * 
 * POST /api/transcription
 * 
 * CRITICAL: This endpoint should ONLY receive audio from STT input sources.
 * DO NOT PIPE TTS OUTPUT INTO THIS INPUT - it will cause feedback loops.
 * 
 * Accepts audio blob, transcribes via Deepgram, returns transcript.
 */

import { NextRequest, NextResponse } from "next/server";
import { translationConfig } from "@/config/translation";

// Deepgram API configuration
const DEEPGRAM_API_URL = "https://api.deepgram.com/v1/listen";

interface TranscriptionRequest {
  audio: string; // Base64 encoded audio
  mimeType?: string;
  sessionId: string;
  userId?: string;
  language?: string;
}

interface TranscriptionResponse {
  success: boolean;
  transcript?: string;
  confidence?: number;
  language?: string;
  isFinal?: boolean;
  error?: string;
  timing?: {
    startMs: number;
    endMs: number;
    durationMs: number;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<TranscriptionResponse>> {
  const startTime = Date.now();
  const { logging } = translationConfig;

  try {
    const body: TranscriptionRequest = await req.json();

    // Validate required fields
    if (!body.audio || !body.sessionId) {
      return NextResponse.json(
        { success: false, error: "audio and sessionId are required" },
        { status: 400 }
      );
    }

    // Get Deepgram API key
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.error("[Transcription API] DEEPGRAM_API_KEY not configured");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Decode base64 audio
    const audioBuffer = Buffer.from(body.audio, "base64");

    // Build Deepgram query params
    const params = new URLSearchParams({
      model: "nova-2",
      language: body.language || "en",
      punctuate: "true",
      diarize: "false",
      smart_format: "true",
    });

    // Send to Deepgram
    if (logging.level === "debug") {
      console.log(`[Transcription API] Sending ${audioBuffer.length} bytes to Deepgram`);
    }

    const response = await fetch(`${DEEPGRAM_API_URL}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": body.mimeType || "audio/webm",
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Transcription API] Deepgram error:", errorText);
      return NextResponse.json(
        { success: false, error: `Deepgram error: ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();

    // Extract transcript from Deepgram response
    const alternatives = result.results?.channels?.[0]?.alternatives;
    const transcript = alternatives?.[0]?.transcript || "";
    const confidence = alternatives?.[0]?.confidence || 0;
    const detectedLanguage = result.results?.channels?.[0]?.detected_language || body.language;

    const endTime = Date.now();

    if (logging.level === "debug" || logging.level === "info") {
      console.log(
        `[Transcription API] session=${body.sessionId} ` +
        `transcript="${transcript.substring(0, 50)}..." ` +
        `confidence=${confidence.toFixed(2)} ` +
        `duration=${endTime - startTime}ms`
      );
    }

    return NextResponse.json({
      success: true,
      transcript,
      confidence,
      language: detectedLanguage,
      isFinal: true,
      timing: logging.includeTiming
        ? {
            startMs: startTime,
            endMs: endTime,
            durationMs: endTime - startTime,
          }
        : undefined,
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[Transcription API] Error:", errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    service: "transcription",
    note: "POST audio to this endpoint for transcription. DO NOT send TTS output here.",
  });
}
