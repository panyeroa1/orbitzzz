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

    // 3. Convert audio file to base64
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    // 4. Use Gemini model for transcription
    const model = ai.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

    // 5. Send audio for transcription
    const result = await model.generateContent([
      {
        inlineData: {
          data: audioBase64,
          mimeType: audioFile.type || "audio/webm",
        },
      },
      {
        text: `Transcribe this audio accurately. Return only the transcribed text without any additional commentary or formatting. The audio is in ${language}.`,
      },
    ]);

    const response = await result.response;
    const transcription = response.text();

    return NextResponse.json({
      text: transcription,
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
