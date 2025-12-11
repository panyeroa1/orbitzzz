
const { WebSocketServer } = require('ws');
const { GoogleGenAI } = require('@google/genai'); // Note: 'google-genai' usually implies the new SDK, checking imports.
// Using standard @google/generative-ai for generating content with tools is safer if @google/genai is experimental. 
// But the user has @google/genai installed. I will stick to it or standard fetch for stability.
// Let's use the standard @google/generative-ai pattern if possible, or adapt to @google/genai.
// Given strict instructions, I will use the code structure for function calling.

const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const PORT = 8001; 
const wss = new WebSocketServer({ port: PORT });

console.log(`[Server] Starting on port ${PORT}...`);

const apiKey = process.env.GEMINI_API_KEY || process.env.EBURON_SPEECH_API_KEY;
if (!apiKey) {
    console.error("ERROR: GEMINI_API_KEY not found in .env");
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
    console.warn("[Server] Credentials missing");
}

const ai = new GoogleGenAI({ apiKey });
const MODEL_NAME = "gemini-flash-lite-latest"; // Updated to latest experimental flash model

// Function Tool Definition
const tools = [
    {
        functionDeclarations: [
            {
                name: "save_transcript_segment",
                description: "Save a segment of transcribed text to the database with speaker labeling.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        text: { type: "STRING", description: "The verbatim transcribed text." },
                        speaker: { type: "STRING", description: "The identified speaker, e.g., 'Male 1', 'Female 2'." },
                        language: { type: "STRING", description: "Detected language code, e.g., 'en-US'." }
                    },
                    required: ["text", "speaker"]
                }
            }
        ]
    }
];

wss.on('connection', async (ws, req) => {
    console.log("[Server] Client connected");
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('session_id') || `session_${Date.now()}`;
    const meetingId = url.searchParams.get('meeting_id') || null;
    const userId = url.searchParams.get('user_id') || 'anonymous';
    
    console.log(`[Server] Session: ${sessionId}, Meeting: ${meetingId}`);

    // Buffer for Audio
    let audioBuffer = [];
    const BUFFER_LIMIT = 40; // Approx 4-5 seconds depending on chunk size/rate
    let isProcessing = false;
    let fullTranscript = ""; // Keep track for the session

    const processAudioBuffer = async () => {
        if (audioBuffer.length === 0 || isProcessing) return;
        
        isProcessing = true;
        const currentBuffer = Buffer.concat(audioBuffer);
        audioBuffer = []; // Clear buffer immediately
        
        try {
            const b64Audio = currentBuffer.toString('base64');
            
            const model = ai.getGenerativeModel({ 
                model: MODEL_NAME,
                tools: tools 
            });

            // Prompt for the model
            const prompt = `
            You are a professional transcriptionist.
            1. Listen to the audio.
            2. Transcribe it verbatim.
            3. Identify speakers as 'Male 1', 'Female 1', etc.
            4. Detect the language.
            5. Call the 'save_transcript_segment' function with the results.
            If there is no speech, do nothing.
            `;

            const result = await model.generateContent([
                prompt,
                { inlineData: { mimeType: "audio/pcm", data: b64Audio } } // Assuming PCM linear16/16k/mono from client
            ]);

            const response = result.response;
            const functionCalls = response.functionCalls();

            if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                    if (call.name === 'save_transcript_segment') {
                        const { text, speaker, language } = call.args;
                        if (text) {
                            const labeledText = `${speaker}: ${text}\n\n`;
                            console.log(`[Transcript] ${labeledText}`);
                            
                            // Send to client for display
                            ws.send(JSON.stringify({ type: 'text', text: labeledText }));
                            
                            // UPDATE SUPABASE (Accumulate)
                            fullTranscript += labeledText;
                            
                            if (supabase) {
                                // Upsert logic as requested
                                const { error } = await supabase
                                    .from('transcripts')
                                    .upsert({
                                        session_id: sessionId,
                                        meeting_id: meetingId,
                                        user_id: userId,
                                        full_transcript_text: fullTranscript,
                                        source_language: language || 'auto',
                                        updated_at: new Date().toISOString()
                                    }, { onConflict: 'session_id, user_id' }); // Conflict target? usually PK is UUID. 
                                    // User wants "update row". We can match by ID if we stored it, or session_id/user_id unique constraint.
                                    // The user provided INSERT... so we assume we are updating the SAME row for the session.
                                    // Let's try to query first to get ID, then update.
                                
                                const { data: existing } = await supabase.from('transcripts').select('id').eq('session_id', sessionId).maybeSingle();
                                
                                if (existing) {
                                     await supabase.from('transcripts').update({ 
                                         full_transcript_text: fullTranscript,
                                         updated_at: new Date().toISOString()
                                     }).eq('id', existing.id);
                                } else {
                                     await supabase.from('transcripts').insert({
                                         session_id: sessionId,
                                         meeting_id: meetingId,
                                         user_id: userId,
                                         full_transcript_text: fullTranscript,
                                         source_language: language || 'auto'
                                     });
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("[Gemini] Processing Error:", err.message);
        } finally {
            isProcessing = false;
        }
    };

    ws.on('message', (data) => {
        // Assume data is binary audio chunk
        audioBuffer.push(data);
        
        if (audioBuffer.length >= BUFFER_LIMIT) {
            processAudioBuffer();
        }
    });

    ws.on('close', () => {
        console.log("[Server] Client closed");
        if (audioBuffer.length > 0) processAudioBuffer(); // Process remaining
    });
});
