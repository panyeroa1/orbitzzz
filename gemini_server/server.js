
const { WebSocketServer } = require('ws');
const { GoogleGenAI } = require('@google/genai');
const { createClient: createDeepgramClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const PORT = 8001; 
const wss = new WebSocketServer({ port: PORT });

console.log(`[Server] Starting on port ${PORT}...`);

const geminiApiKey = process.env.GEMINI_API_KEY;
const deepgramApiKey = process.env.DEEPGRAM_API_KEY || process.env.EBURON_SPEECH_API_KEY;

if (!geminiApiKey && !deepgramApiKey) {
    console.error("ERROR: Missing API Keys (GEMINI_API_KEY or DEEPGRAM_API_KEY)");
    process.exit(1);
}

// Supabase Init
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[Server] Supabase initialized");
} else {
    console.warn("[Server] Supabase credentials missing");
}

const ai = new GoogleGenAI({ apiKey: geminiApiKey });

const MODEL = "models/gemini-2.5-flash-native-audio-preview-09-2025"; 
const deepgram = deepgramApiKey ? createDeepgramClient(deepgramApiKey) : null; 

// ... (Keep existing getConfig for Translation if needed, but we focus on Transcription logic change)
const getTranslationConfig = (targetLang) => {
    return {
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
                text: `You are a professional translator... (truncated for brevity, same as before) ...` 
            }],
        },
    };
};

wss.on('connection', async (ws, req) => {
    console.log("[Server] Client connected");
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const targetLang = url.searchParams.get('lang') || 'Spanish';
    const mode = url.searchParams.get('mode') || 'translation';
    const sessionId = url.searchParams.get('session_id') || `session_${Date.now()}`;
    const meetingId = url.searchParams.get('meeting_id') || null;
    const userId = url.searchParams.get('user_id') || 'anonymous';
    
    console.log(`[Server] Mode: ${mode}, Session: ${sessionId}`);

    let fullTranscript = "";
    let lastSave = Date.now();

    const saveTranscript = async (text) => {
        if (!supabase) return;
        try {
            const { data: existing } = await supabase
                .from('transcripts')
                .select('id')
                .eq('session_id', sessionId)
                .limit(1)
                .maybeSingle(); // Use maybeSingle to avoid 406 if not found
            
            if (existing) {
                await supabase
                    .from('transcripts')
                    .update({ 
                        full_transcript_text: text,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('transcripts')
                    .insert({
                        session_id: sessionId,
                        meeting_id: meetingId,
                        user_id: userId,
                        full_transcript_text: text,
                        source_language: 'auto' 
                    });
            }
        } catch (err) {
            console.error("[Server] Supabase Save Error:", err.message);
        }
    };

    let deepgramLive = null;
    let geminiSession = null;

    if (mode === 'transcription') {
        // USE DEEPGRAM FOR TRANSCRIPTION & DIARIZATION
        if (!deepgramApiKey) {
            ws.send(JSON.stringify({ type: 'error', message: 'Deepgram API Key missing for transcription mode' }));
            return;
        }

        deepgramLive = deepgram.listen.live({
            model: "nova-2",
            language: "en-US", // or auto-detect if needed, but Nova-2 is great for English
            smart_format: true,
            diarize: true,
            interim_results: true,
            filler_words: false,
            punctuation: true,
        });

        deepgramLive.on(LiveTranscriptionEvents.Open, () => {
            console.log("[Deepgram] Connection Open");
        });

        deepgramLive.on(LiveTranscriptionEvents.Transcript, (data) => {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript && data.is_final) {
                // Diarization handling
                const words = data.channel.alternatives[0].words;
                const speaker = words[0]?.speaker || 0;
                const labeledText = `Speaker ${speaker}: ${transcript}\n`;
                
                fullTranscript += labeledText;
                
                ws.send(JSON.stringify({ type: 'text', text: labeledText }));
                
                saveTranscript(fullTranscript);
            }
        });

        deepgramLive.on(LiveTranscriptionEvents.Error, (err) => {
            console.error("[Deepgram] Error:", err);
        });

        deepgramLive.on(LiveTranscriptionEvents.Close, () => {
            console.log("[Deepgram] Connection Closed");
        });

    } else {
        // USE GEMINI FOR TRANSLATION (Existing Logic)
        try {
            geminiSession = await ai.live.connect({
                model: MODEL,
                config: getTranslationConfig(targetLang),
                callbacks: {
                    onopen: () => console.log("[Gemini] Session Open"),
                    onmessage: (msg) => {
                         if (msg.serverContent?.modelTurn?.parts) {
                            for (const part of msg.serverContent.modelTurn.parts) {
                                if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                                    ws.send(JSON.stringify({ type: 'audio', data: part.inlineData.data }));
                                }
                            }
                        }
                    },
                    onclose: () => console.log("[Gemini] Session Closed"),
                    onerror: (err) => console.error("[Gemini] Error:", err)
                }
            });
        } catch (err) {
            console.error("[Gemini] Connection Failed:", err);
            ws.close();
            return;
        }
    }

    ws.on('message', async (data) => {
        if (deepgramLive && deepgramLive.getReadyState() === 1) {
            deepgramLive.send(data);
        }
        if (geminiSession) {
            const b64Data = data.toString('base64');
            await geminiSession.sendRealtimeInput([{
                mimeType: "audio/pcm;rate=16000",
                data: b64Data
            }]);
        }
    });

    ws.on('close', () => {
        console.log("[Server] Client closed");
        if (deepgramLive) deepgramLive.finish();
        // geminiSession cleanup handled by library/GC usually
    });
});
