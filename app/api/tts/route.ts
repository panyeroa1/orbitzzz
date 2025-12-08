
import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
} from "@google/genai";

// Reusing WAV Helper Functions (inlined directly here to rely on Node/Next environment)
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
  let sampleRate = 24000;
  let numChannels = 1;
  let bitsPerSample = 16;
  
  if (mimeType && mimeType.includes("rate=")) {
      const match = mimeType.match(/rate=(\d+)/);
      if (match) sampleRate = parseInt(match[1], 10);
  }

  const options: WavConversionOptions = {
    numChannels,
    sampleRate,
    bitsPerSample,
  };

  const buffers = base64Parts.map(part => Buffer.from(part, "base64"));
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);

  const wavHeader = createWavHeader(totalLength, options);
  const audioData = Buffer.concat(buffers);

  return Buffer.concat([wavHeader, audioData]);
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.EBURON_SPEECH_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("API Key is missing");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const model = "models/gemini-2.5-flash-native-audio-preview-09-2025";
    const responseQueue: LiveServerMessage[] = [];

    let turnComplete = false;
    let connectionError: Error | null = null;

    const session = await ai.live.connect({
      model,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Orus", 
            },
          },
        },
      },
      callbacks: {
        onopen: () => console.log("[TTS API] Connected"),
        onmessage: (msg: LiveServerMessage) => responseQueue.push(msg),
        onclose: () => console.log("[TTS API] Closed"),
        onerror: (err: any) => {
          console.error("[TTS API] Error:", err);
          connectionError = err;
          turnComplete = true; 
        },
      },
    });

    // Just read the text
    await session.sendClientContent({
      turns: [`Read this text aloud naturally: "${text}"`],
    });

    const audioParts: string[] = [];
    let mimeType = "audio/pcm; rate=24000";
    const maxWaitTimeMs = 15000; 
    const startTime = Date.now();

    while (!turnComplete) {
      if (Date.now() - startTime > maxWaitTimeMs) break;
      if (connectionError) break;

      if (responseQueue.length > 0) {
        const msg = responseQueue.shift();
        if (!msg) continue;

        if (msg.serverContent?.modelTurn?.parts) {
          const parts = msg.serverContent.modelTurn.parts;
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              audioParts.push(part.inlineData.data);
              if (part.inlineData.mimeType) mimeType = part.inlineData.mimeType;
            }
          }
        }

        if (msg.serverContent?.turnComplete) turnComplete = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    
    await session.close();

    if (connectionError) throw connectionError;
    if (audioParts.length === 0) return NextResponse.json({ error: "No audio generated" }, { status: 500 });

    const wavBuffer = convertToWav(audioParts, mimeType);

    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.length.toString(),
      },
    });

  } catch (err: any) {
    console.error("[TTS API] Request failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
