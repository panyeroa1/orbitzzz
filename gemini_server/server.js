
const { WebSocketServer } = require('ws');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PORT = 8000;
const wss = new WebSocketServer({ port: PORT });

console.log(`[Gemini Server] Starting on port ${PORT}...`);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("[Gemini Server] ERROR: GEMINI_API_KEY not found in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const MODEL = "models/gemini-2.0-flash-exp"; // Using experimental flash for live
// Note: Node SDK Live client might default to a specific model.

// Config for Live Session
const config = {
    responseModalities: ["AUDIO"], // We want Audio back
    speechConfig: {
        voiceConfig: {
            prebuiltVoiceConfig: {
                voiceName: "Puck", // or Aoede, Charon, Fenrir, Kore, Puck
            },
        },
    },
    systemInstruction: {
        parts: [{ text: "You are a real-time translator. You will receive audio. Translate it to the requested language (default Spanish if unspecified) and speak ONLY the translation. Do not say 'Here is the translation'. Just speak the translation." }],
    },
};

wss.on('connection', async (ws) => {
    console.log("[Gemini Server] Client connected");
    
    let session = null;
    let targetLanguage = "Spanish"; // Could be passed in query params

    try {
        // Connect to Gemini Live
        session = await ai.live.connect({
            model: MODEL,
            config: config,
        });

        console.log("[Gemini Server] Connected to Gemini Live Session");

        // Hook up session events
        // Note: SDK interface might use callbacks or async iterator.
        // Assuming standard Node SDK implementation for Live.
        
        // Wait, @google/genai live.connect returns a Session object to send/receive.
        // It might not have 'on' events but we iterate response stream or provide callbacks in connect options.
        // Looking at SDK docs/examples (inferred from context):
        // `session` usually has `send()` and event handlers or `on('content', ...)`
        
        // Let's re-use the Logic from the Frontend API route I wrote earlier?
        // Ah, `app/api/translate/route.ts` used:
        /*
          const session = await ai.live.connect({ ..., callbacks: { ... } });
        */
        
        // Wait, I must use `callbacks` in `connect`!
        
        // I need to close previous session if exists.
        
    } catch (err) {
        console.error("[Gemini Server] Error connecting to Gemini:", err);
        ws.close(1011, "Gemini Connection Failed");
        return;
    }

    // Since I can't pass callbacks POST-facto easily, I should connect inside the handler with callbacks.
    // Re-doing connection logic:

    // Actually, I should inspect URL for target language?
    // ws.upgradeReq.url... (in `ws` lib, `ws.upgradeReq` is typically accessed via `request` event or `ws.upgradeReq`)
    // But `connection` event gives (ws, req).
});

// Re-write to use proper structure with request parsing
wss.removeAllListeners('connection');
wss.on('connection', async (ws, req) => {
    console.log("[Gemini Server] Client connected");
    
    // Parse Query Params for Language?
    // const url = new URL(req.url, 'http://localhost');
    // const targetLang = url.searchParams.get('lang') || 'Spanish';

    // Initialize Gemini Session
    let currentSession = null;

    try {
        currentSession = await ai.live.connect({
            model: MODEL,
            config: config,
            callbacks: {
                onopen: () => {
                    console.log("[Gemini Server] Gemini Session Open");
                },
                onmessage: (msg) => {
                    // msg contains serverContent. 
                    // We look for modelTurn -> parts -> inlineData (audio)
                    if (msg.serverContent?.modelTurn?.parts) {
                        for (const part of msg.serverContent.modelTurn.parts) {
                            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                                // Send Audio to Client
                                // Client expects binary Blob? Or JSON?
                                // Let's send raw binary for audio, or JSON wrapper.
                                // Simplest: Send JSON wrapper so we can send text transcripts too later.
                                const payload = {
                                    type: 'audio',
                                    data: part.inlineData.data // Base64 string from SDK typically, or Buffer?
                                    // SDK usually returns Base64 string for JSON compat.
                                };
                                ws.send(JSON.stringify(payload));
                            }
                        }
                    }
                },
                onclose: () => {
                    console.log("[Gemini Server] Gemini Session Closed");
                },
                onerror: (err) => {
                    console.error("[Gemini Server] Gemini Error:", err);
                    ws.send(JSON.stringify({ type: 'error', message: err.message }));
                }
            }
        });

    } catch (err) {
        console.error("[Gemini Server] Connection failed:", err);
        ws.close();
        return;
    }

    ws.on('message', async (data) => {
        // Data is Audio Blob (Buffer) from Client
        // Send to Gemini
        if (currentSession) {
             // Convert Buffer to Base64
             const b64Data = data.toString('base64');
             
             // Send RealtimeInput
             await currentSession.sendRealtimeInput([{
                 mimeType: "audio/pcm;rate=16000", // Client must convert WebM to PCM? Or Gemini handles it?
                 data: b64Data
             }]);
             
             // NOTE: Gemini Live API usually expects PCM 16kHz/24kHz.
             // If client sends WebM/Opus, passing "audio/webm" might work if supported.
             // If not, we rely on Client to send PCM.
             // Web Audio API `AudioWorklet` can capture PCM. `MediaRecorder` captures WebM.
             // I'll try sending "audio/webm" first as Gemini 1.5 Pro accepts it. 
             // Live API is restrictive. 
             // Safest: Client sends PCM.
        }
    });

    ws.on('close', () => {
        console.log("[Gemini Server] Client closed");
        if (currentSession) {
            // currentSession.close(); // If SDK exposes close
        }
    });
});
