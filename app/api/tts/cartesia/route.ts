import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.CARTESIA_API_KEY;
    const voiceId = process.env.CARTESIA_VOICE_ID || "9aac52b6-c268-4d05-98d3-71a74bf9c044";
    
    if (!apiKey) {
      return NextResponse.json({ error: "Cartesia API key missing" }, { status: 500 });
    }

    console.log("[Cartesia TTS] Generating audio for:", text.substring(0, 50));

    // Call Cartesia Bytes API with sonic-3 model
    const response = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Cartesia-Version": "2025-04-16",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: "sonic-3",
        transcript: text,
        voice: {
          mode: "id",
          id: voiceId,
        },
        output_format: {
          container: "wav",
          encoding: "pcm_f32le",
          sample_rate: 44100,
        },
        speed: "normal",
        generation_config: {
          speed: 1,
          volume: 1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Cartesia TTS] API Error:", response.status, errorText);
      return NextResponse.json({ error: `Cartesia API error: ${response.status}` }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("[Cartesia TTS] Audio received, size:", audioBuffer.byteLength);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });

  } catch (err: any) {
    console.error("[Cartesia TTS] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

