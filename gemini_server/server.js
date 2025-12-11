
const { WebSocketServer } = require('ws');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const PORT = 8001; // Translation server on 8001, STT server on 8000
const wss = new WebSocketServer({ port: PORT });

console.log(`[Eburon Translator] Starting on port ${PORT}...`);

const apiKey = process.env.EBURON_SPEECH_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("[Gemini Server] ERROR: EBURON_SPEECH_API_KEY or GEMINI_API_KEY not found in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const MODEL = "models/gemini-2.5-flash-native-audio-preview-09-2025"; // Using experimental flash for live
// Note: Node SDK Live client might default to a specific model.

// Config for Live Session
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
- Label distinct speakers as "Speaker 1", "Speaker 2", etc. if you can identify them.
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
    
const { createClient } = require('@supabase/supabase-js');

// ... existing imports

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ... inside upsert logic

    // Parse Query Params for Language, Mode, Session, User
    const url = new URL(req.url, `http://${req.headers.host}`);
    const targetLang = url.searchParams.get('lang') || 'Spanish';
    const mode = url.searchParams.get('mode') || 'translation';
    const sessionId = url.searchParams.get('session_id') || `session_${Date.now()}`;
    const userId = url.searchParams.get('user_id') || 'anonymous';
    
    console.log(`[Gemini Server] Target Language: ${targetLang}, Mode: ${mode}, Session: ${sessionId}`);

    // Track full transcript for this session in memory
    let fullTranscript = "";
    let lastSave = Date.now();

    // ... inside onmessage

                            // Text Response (Transcription)
                            if (part.text) {
                                const text = part.text;
                                fullTranscript += text;
                                
                                const payload = {
                                    type: 'text',
                                    text: text
                                };
                                ws.send(JSON.stringify(payload));
                                
                                // Save to Supabase (debounced/periodic or on every chunk?)
                                // For real-time feel, maybe every chunk or throttle.
                                // Given strictly "save the transcription", let's update.
                                // To avoid spamming DB, let's throttle to 2 seconds or if significant content.
                                if (Date.now() - lastSave > 2000) {
                                    lastSave = Date.now();
                                    saveTranscript(sessionId, userId, fullTranscript);
                                }
                            }

// ... helper function

async function saveTranscript(sessionId, userId, text) {
    // Check if row exists for sessionUrl to update, else insert.
    // Since we don't have a unique constraint on session_id in schema provided technically,
    // we should try to find latest `id` for this session or just assume 1 row per session logic.
    // User schema: create index ... (session_id).
    
    // Strategy: Try selecting ID for this session.
    const { data: existing } = await supabase
        .from('transcripts')
        .select('id')
        .eq('session_id', sessionId)
        .limit(1)
        .single();
        
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
                source_language: 'auto' // or detect
            });
    }
}
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
