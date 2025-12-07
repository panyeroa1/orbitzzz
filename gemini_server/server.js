
const { WebSocketServer } = require('ws');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PORT = 8000;
const wss = new WebSocketServer({ port: PORT });

console.log(`[Gemini Server] Starting on port ${PORT}...`);

const apiKey = process.env.EBURON_SPEECH_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("[Gemini Server] ERROR: EBURON_SPEECH_API_KEY or GEMINI_API_KEY not found in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const MODEL = "models/gemini-2.5-flash-native-audio-preview-09-2025"; // Using experimental flash for live
// Note: Node SDK Live client might default to a specific model.

// Config for Live Session
// Dynamic config function
const getConfig = (targetLang) => ({
    responseModalities: ["AUDIO"],
    speechConfig: {
        voiceConfig: {
            prebuiltVoiceConfig: {
                voiceName: "Orus", 
            },
        },
    },
    systemInstruction: {
        parts: [{ 
            text: `You are a professional translator and voice actor. Your task is to translate spoken content into ${targetLang}.

IMPORTANT RULES:
- Wait for complete sentences or natural speech pauses before translating.
- Do NOT translate word-by-word or overlap with the speaker.
- Translate each sentence fully, then speak it with natural human expression.
- Match the emotional tone: if the speaker is excited, sound excited; if serious, sound serious.
- Use natural pauses, intonation, and rhythm like a native speaker.
- Never introduce yourself or add commentary. Just speak the translation.
- If there is silence, remain completely silent.
- Aim for clear, expressive, human-like speech that sounds like a professional voice actor.` 
        }],
    },
});

wss.on('connection', async (ws, req) => {
    console.log("[Gemini Server] Client connected");
    
    // Parse Query Params for Language
    const url = new URL(req.url, `http://${req.headers.host}`);
    const targetLang = url.searchParams.get('lang') || 'Spanish';
    console.log(`[Gemini Server] Target Language: ${targetLang}`);

    // Initialize Gemini Session
    let currentSession = null;

    try {
        currentSession = await ai.live.connect({
            model: MODEL,
            config: getConfig(targetLang),
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
                                const payload = {
                                    type: 'audio',
                                    data: part.inlineData.data 
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
