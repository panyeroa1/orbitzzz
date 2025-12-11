
const { WebSocketServer } = require('ws');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const PORT = 8001; // Translation server on 8001, STT server on 8000
const wss = new WebSocketServer({ port: PORT });

console.log(`[Eburon Translator] Starting on port ${PORT}...`);

const apiKey = process.env.EBURON_SPEECH_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("[Gemini Server] ERROR: EBURON_SPEECH_API_KEY or GEMINI_API_KEY not found in .env");
    process.exit(1);
}

// Supabase Init
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[Gemini Server] Supabase initialized");
} else {
    console.warn("[Gemini Server] Supabase credentials missing (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
}

const ai = new GoogleGenAI({ apiKey });
const MODEL = "models/gemini-2.5-flash-native-audio-preview-09-2025"; 

// Config for Live Session
const getConfig = (targetLang, mode) => {
    if (mode === 'transcription') {
        return {
            responseModalities: ["TEXT"], // No audio response
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: "Zephyr", // Placeholder, not used for TEXT output
                    },
                },
            },
            systemInstruction: {
                parts: [{
                    text: `You are a professional transcriptionist. Your task is to generate a verbatim transcript of the audio.
                    
IMPORTANT RULES:
- Output ONLY the transcript. Do not add any conversational text, introductions, or commentary.
- Label distinct speakers as "Male 1", "Female 1", "Male 2", "Female 2", or "Speaker 1" etc. based on voice characteristics.
- If there is no speech, output nothing.
- Punctuate the transcript correctly.
- Do not translate. Keep the text in the original language of the speaker.`
                }],
            },
        };
    }

    // Default: Translation Mode
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
                text: `You are a professional translator and voice actor. Your task is to translate spoken content into ${targetLang}.

IMPORTANT RULES:
- Wait for complete sentences or natural speech pauses before translating.
- Do NOT translate word-by-word or overlap with the speaker.
- Translate each sentence fully, then speak it with natural human expression.
- Read aloud in a DEEP, RICH VOICE with the authentic native accent of ${targetLang}.
- Use CORRECT PRONUNCIATION for ${targetLang} - speak like a native speaker would.
- Match the emotional tone: if the speaker is excited, sound excited; if serious, sound serious.
- Use natural pauses, intonation, and rhythm like a native speaker.
- Never introduce yourself or add commentary. Just speak the translation.
- If there is silence, remain completely silent.
- Aim for clear, expressive, human-like speech that sounds like a professional voice actor from a ${targetLang}-speaking country.` 
            }],
        },
    };
};

wss.on('connection', async (ws, req) => {
    console.log("[Gemini Server] Client connected");
    
    // Parse Query Params for Language and Mode
    const url = new URL(req.url, `http://${req.headers.host}`);
    const targetLang = url.searchParams.get('lang') || 'Spanish';
    const mode = url.searchParams.get('mode') || 'translation';
    const sessionId = url.searchParams.get('session_id') || `session_${Date.now()}`;
    const userId = url.searchParams.get('user_id') || 'anonymous';
    
    console.log(`[Gemini Server] Target Language: ${targetLang}, Mode: ${mode}, Session: ${sessionId}`);

    // Track full transcript for this session in memory
    let fullTranscript = "";
    let lastSave = Date.now();

    // Helper: Save Transcript
    const saveTranscript = async (text) => {
        if (!supabase) return;
        
        try {
            // Check if row exists for sessionUrl to update, else insert.
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
                        user_id: userId,
                        full_transcript_text: text,
                        source_language: 'auto' 
                    });
            }
        } catch (err) {
            console.error("[Gemini Server] Supabase Save Error:", err.message);
        }
    };

    // Initialize Gemini Session
    let currentSession = null;

    try {
        currentSession = await ai.live.connect({
            model: MODEL,
            config: getConfig(targetLang, mode),
            callbacks: {
                onopen: () => {
                    console.log("[Gemini Server] Gemini Session Open");
                },
                onmessage: (msg) => {
                    // msg contains serverContent. 
                    if (msg.serverContent?.modelTurn?.parts) {
                        for (const part of msg.serverContent.modelTurn.parts) {
                            
                            // Audio Response (Translation)
                            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                                const payload = {
                                    type: 'audio',
                                    data: part.inlineData.data 
                                };
                                ws.send(JSON.stringify(payload));
                            }
                            
                            // Text Response (Transcription)
                            if (part.text) {
                                const text = part.text;
                                fullTranscript += text;
                                
                                const payload = {
                                    type: 'text',
                                    text: text
                                };
                                ws.send(JSON.stringify(payload));
                                
                                // Save to Supabase (Periodic)
                                if (Date.now() - lastSave > 2000) {
                                    lastSave = Date.now();
                                    saveTranscript(fullTranscript);
                                }
                            }
                        }
                    }
                },
                onclose: () => {
                    console.log("[Gemini Server] Gemini Session Closed");
                    // Final save
                    if (fullTranscript.length > 0) {
                        saveTranscript(fullTranscript);
                    }
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
                 mimeType: "audio/pcm;rate=16000",
                 data: b64Data
             }]);
        }
    });

    ws.on('close', () => {
        console.log("[Gemini Server] Client closed");
        if (currentSession) {
            // currentSession.close(); // SDK might not expose strict close
        }
    });
});
