import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    // 1. Get audio data from request
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const language = formData.get("language") as string || "en-US";

    if (!audioFile) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    // 2. Initialize Gemini Client
    const apiKey = process.env.EBURON_SPEECH_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Transcribe API] EBURON_SPEECH_API_KEY or GEMINI_API_KEY is missing");
      return NextResponse.json({ error: "Server configuration error (API Key missing)" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "models/gemini-2.0-flash-exp";

    // 3. Convert audio file to base64
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    // 4. Use Live API for transcription
    const responseQueue: any[] = [];
    let turnComplete = false;
    let connectionError: Error | null = null;
    let transcriptionText = "";

    const session = await ai.live.connect({
      model,
      config: {
        responseModalities: [Modality.TEXT], // We want text output
      },
      callbacks: {
        onopen: () => {
          console.log("[Transcribe API] Connected to Live Session");
        },
        onmessage: (msg: any) => {
          responseQueue.push(msg);
        },
        onclose: () => {
          console.log("[Transcribe API] Session closed");
        },
        onerror: (err: any) => {
          console.error("[Transcribe API] Error:", err);
          connectionError = err;
          turnComplete = true;
        },
      },
    });

    // 5. Send audio and prompt together
    const prompt = `Transcribe this audio accurately. Return only the transcribed text without any additional commentary or formatting. The audio language is ${language}.`;
    
    await session.sendClientContent({
      turns: [prompt],
      turnComplete: true,
    });

    // Send audio as realtime input
    const audioMimeType = audioFile.type || "audio/webm";
    await session.sendRealtimeInput({
      mimeType: audioMimeType,
      data: audioBase64
    } as any);

    // 6. Wait for response
    const maxWaitTimeMs = 15000;
    const startTime = Date.now();

    while (!turnComplete) {
      if (Date.now() - startTime > maxWaitTimeMs) {
        console.error("[Transcribe API] Timeout waiting for response");
        break;
      }
      
      if (connectionError) break;

      if (responseQueue.length > 0) {
        const msg = responseQueue.shift();
        if (!msg) continue;

        // Extract text from response
        if (msg.serverContent?.modelTurn?.parts) {
          const parts = msg.serverContent.modelTurn.parts;
          for (const part of parts) {
            if (part.text) {
              transcriptionText += part.text;
            }
          }
        }

        // Check completion
        if (msg.serverContent?.turnComplete) {
          turnComplete = true;
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    
    // 7. Cleanup
    await session.close();

    if (connectionError) {
      throw connectionError;
    }

    if (!transcriptionText.trim()) {
      return NextResponse.json({ error: "No transcription generated" }, { status: 500 });
    }

    return NextResponse.json({
      text: transcriptionText.trim(),
      language: language,
      timestamp: Date.now(),
    });

  } catch (err: any) {
    console.error("[Transcribe API] Request failed:", err);
    return NextResponse.json(
      { error: "Transcription failed: " + err.message },
      { status: 500 }
    );
  }
}
