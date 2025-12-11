import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, LiveServerMessage, MediaResolution, Modality, Session, TurnCoverage } from "@google/genai";

// Helper function to convert base64 audio chunks to WAV
function convertToWav(rawData: string[], mimeType: string): Buffer {
  const options = parseMimeType(mimeType);
  const dataLength = rawData.reduce((a, b) => a + Buffer.from(b, 'base64').length, 0);
  const wavHeader = createWavHeader(dataLength, options);
  const buffer = Buffer.concat(rawData.map(data => Buffer.from(data, 'base64')));
  return Buffer.concat([wavHeader, buffer]);
}

function parseMimeType(mimeType: string) {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [_, format] = fileType.split('/');

  const options: { numChannels: number; sampleRate: number; bitsPerSample: number } = {
    numChannels: 1,
    bitsPerSample: 16,
    sampleRate: 24000,
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) options.bitsPerSample = bits;
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') options.sampleRate = parseInt(value, 10);
  }

  return options;
}

function createWavHeader(dataLength: number, options: { numChannels: number; sampleRate: number; bitsPerSample: number }): Buffer {
  const { numChannels, sampleRate, bitsPerSample } = options;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

export async function POST(req: NextRequest) {
  try {
    const { text, voiceName = "Orus" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.EBURON_SPEECH_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "models/gemini-2.5-flash-native-audio-preview-09-2025";

    const config = {
      responseModalities: [Modality.AUDIO],
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          }
        }
      },
      realtimeInputConfig: {
        turnCoverage: TurnCoverage.TURN_INCLUDES_ALL_INPUT,
      },
    };

    const responseQueue: LiveServerMessage[] = [];
    const audioParts: string[] = [];
    let mimeType = "";

    const session: Session = await ai.live.connect({
      model,
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          responseQueue.push(message);
        },
        onerror: (e: ErrorEvent) => {
          console.error("[Gemini TTS] Error:", e.message);
        },
      },
      config
    });

    // System prompt for expressive read-aloud with deep accent
    const systemPrompt = `You are an advanced Text-to-Speech (TTS) engine. Your ONLY function is to read the provided text aloud.
    
    CRITICAL RULES:
    1. READ EXACTLY WHAT IS WRITTEN. Do not add "Here is the text", "Sure", "I can do that", or any other conversational filler.
    2. Do not translate. The text is already translated.
    3. Adopt the persona of the selected voice (Voice Name: ${voiceName}) and the language of the text.
    4. Speak with deep expression and emotion suitable for the context, but maintain strict fidelity to the written words.
    5. If the text is a segment of a larger conversation, jump right into the character/speech without introduction.
    
    Input Text:
    `;

    session.sendClientContent({
      turns: [systemPrompt, text]
    });

    // Collect audio chunks
    let done = false;
    while (!done) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      while (responseQueue.length > 0) {
        const message = responseQueue.shift()!;
        
        if (message.serverContent?.modelTurn?.parts) {
          const part = message.serverContent.modelTurn.parts[0];
          
          if (part?.inlineData) {
            audioParts.push(part.inlineData.data ?? '');
            mimeType = part.inlineData.mimeType ?? '';
          }
        }
        
        if (message.serverContent?.turnComplete) {
          done = true;
        }
      }
    }

    session.close();

    if (audioParts.length === 0) {
      return NextResponse.json({ error: "No audio generated" }, { status: 500 });
    }

    // Convert to WAV
    const wavBuffer = convertToWav(audioParts, mimeType);

    return new NextResponse(new Uint8Array(wavBuffer), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.length.toString(),
      },
    });

  } catch (err: any) {
    console.error("[Gemini TTS] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
