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

  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing");
    return NextResponse.json({ error: "Server configuration error (API Key missing)" }, { status: 500 });
  }

  // 2. Initialize Gemini Client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const model = "models/gemini-2.5-flash-native-audio-preview-09-2025";
  const responseQueue: LiveServerMessage[] = [];

  // Scoped variables for this request
  let turnComplete = false;
  let connectionError: Error | null = null;

  try {
    // 3. Connect to Live API
    const session = await ai.live.connect({
      model,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Puck", // User preferred voice
            },
          },
        },
      },
      callbacks: {
        onopen: () => {
          console.log("[Gemini API] Connected to Live Session");
        },
        onmessage: (msg: LiveServerMessage) => {
          responseQueue.push(msg);
        },
        onclose: () => {
          console.log("[Gemini API] Session closed");
        },
        onerror: (err: any) => {
          console.error("[Gemini API] Error:", err);
          connectionError = err;
          turnComplete = true; // Break loop on error
        },
      },
    });

    // 4. Send Prompt
    const prompt = `Translate the following text to ${targetLanguage || "Spanish"} and read it aloud naturally. Do not say anything else, just the translation. Text: "${text}"`;
    
    await session.sendClientContent({
      turns: [prompt],
    });

    // 5. Accumulate Audio
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
