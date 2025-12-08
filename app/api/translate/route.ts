import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  LiveServerMessage,
  MediaResolution,
  Modality,
  TurnCoverage,
} from "@google/genai";

// --- WAV Helper Functions (Adapted from User Snippet) ---

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

function createWavHeader(dataLength: number, options: WavConversionOptions) {
  const { numChannels, sampleRate, bitsPerSample } = options;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

function convertToWav(base64Parts: string[], mimeType: string) {
  // Default for Gemini Live audio is usually 24kHz PCM
  let sampleRate = 24000;
  let numChannels = 1;
  let bitsPerSample = 16;
  
  // Try to parse rate from mime if present, e.g. "audio/pcm; rate=24000"
  if (mimeType && mimeType.includes("rate=")) {
      const match = mimeType.match(/rate=(\d+)/);
      if (match) sampleRate = parseInt(match[1], 10);
  }

  const options: WavConversionOptions = {
    numChannels,
    sampleRate,
    bitsPerSample,
  };

  // Convert base64 strings to Buffers
  const buffers = base64Parts.map(part => Buffer.from(part, "base64"));
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);

  const wavHeader = createWavHeader(totalLength, options);
  const audioData = Buffer.concat(buffers);

  return Buffer.concat([wavHeader, audioData]);
}

// --- Main API Route ---

export async function POST(req: NextRequest) {
  // 1. Get Input
  let text, targetLanguage;
  try {
    const body = await req.json();
    text = body.text;
    targetLanguage = body.targetLanguage;
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  // 2. Initialize Gemini Client
  const apiKey = process.env.EBURON_SPEECH_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("EBURON_SPEECH_API_KEY or GEMINI_API_KEY is missing");
    return NextResponse.json({ error: "Server configuration error (API Key missing)" }, { status: 500 });
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    // 3. Step 1: Translate with Gemini Flash Lite (text-only, fast)
    console.log("[Translation] Step 1: Translating with Gemini Flash Lite...");
    const translationModel = ai.models.generateContent;
    
    const translationPrompt = `You are a professional translator. Translate the following text to ${targetLanguage || "Spanish"}. 
IMPORTANT RULES:
- Output ONLY the translation, nothing else
- Preserve the natural tone and meaning
- Use appropriate regional expressions and idioms for ${targetLanguage}
- Do not add explanations or notes

Text to translate: "${text}"`;

    const translationResult = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: translationPrompt,
    });

    const translatedText = translationResult.text?.trim() || text;
    console.log(`[Translation] Translated to ${targetLanguage}: "${translatedText}"`);

    // 4. Step 2: Use Live Audio for TTS-only (no listening, output only)
    // This reads the translated text aloud with human-rich nuances and deep accent
    console.log("[Translation] Step 2: Generating speech with Gemini Live Audio (TTS-only)...");
    
    const ttsModel = "models/gemini-2.5-flash-native-audio-preview-09-2025";
    const responseQueue: LiveServerMessage[] = [];

    let turnComplete = false;
    let connectionError: Error | null = null;

    // 5. Connect to Live API for TTS (output-only, no listening)
    const session = await ai.live.connect({
      model: ttsModel,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Orus", // Human-rich voice with deep accent
            },
          },
        },
      },
      callbacks: {
        onopen: () => {
          console.log("[Gemini TTS] Connected - TTS only mode (no listening)");
        },
        onmessage: (msg: LiveServerMessage) => {
          responseQueue.push(msg);
        },
        onclose: () => {
          console.log("[Gemini TTS] Session closed");
        },
        onerror: (err: any) => {
          console.error("[Gemini TTS] Error:", err);
          connectionError = err;
          turnComplete = true;
        },
      },
    });

    // 6. Send TTS prompt - read the translated text aloud with nuances
    const ttsPrompt = `Read the following ${targetLanguage} text aloud naturally with human-rich nuances, emotion, and a deep authentic accent. Speak as a native speaker would, with proper intonation, rhythm, and expression. Do not say anything else, just read the text:

"${translatedText}"`;
    
    await session.sendClientContent({
      turns: [ttsPrompt],
    });

    // 7. Accumulate Audio
    const audioParts: string[] = [];
    let mimeType = "audio/pcm; rate=24000";

    // Wait for the turn to complete
    // We poll the queue
    const maxWaitTimeMs = 15000; // 15 seconds timeout
    const startTime = Date.now();

    while (!turnComplete) {
      if (Date.now() - startTime > maxWaitTimeMs) {
        console.error("[Gemini API] Timeout waiting for turn completion");
        break;
      }
      
      if (connectionError) break;

      if (responseQueue.length > 0) {
        const msg = responseQueue.shift();
        if (!msg) continue;

        // Extract Audio
        if (msg.serverContent?.modelTurn?.parts) {
          const parts = msg.serverContent.modelTurn.parts;
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              audioParts.push(part.inlineData.data);
              if (part.inlineData.mimeType) {
                mimeType = part.inlineData.mimeType;
              }
            }
          }
        }

        // Check completion
        if (msg.serverContent?.turnComplete) {
          turnComplete = true;
        }
      } else {
        // Yield to event loop
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    
    // 6. Cleanup
    await session.close();

    if (connectionError) {
       throw connectionError;
    }

    if (audioParts.length === 0) {
        return NextResponse.json({ error: "No audio generated" }, { status: 500 });
    }

    // 7. Convert and Return
    const wavBuffer = convertToWav(audioParts, mimeType);

    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.length.toString(),
      },
    });

  } catch (err: any) {
    console.error("[Gemini API] Request failed:", err);
    return NextResponse.json({ error: "Translation failed: " + err.message }, { status: 500 });
  }
}
