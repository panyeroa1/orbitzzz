require('dotenv').config();
const axios = require('axios');

const VAPI_URL = 'https://api.vapi.ai/assistant';
// Try to get key from root .env or check if it is passed in process
const PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ Error: VAPI_PRIVATE_KEY is missing in .env');
  console.error('Make sure you have created a .env file in the vocal-proxy root with your VAPI keys.');
  process.exit(1);
}

const assistantConfig = {
  name: "VocalProxy-Agent",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en"
  },
  model: {
    provider: "openai",
    model: "gpt-4o-mini", // Fast and cheap for near real-time response
    messages: [
      {
        role: "system",
        content: `You are a Voice Proxy. 
        
        CORE INSTRUCTION:
        You will receive text input from the user via system messages. 
        Your ONLY job is to read that text aloud exactly as written, immediately. 
        
        RULES:
        1. Do NOT reply to the content. (e.g., if user types "Hello", do not say "Hi there", say "Hello").
        2. Do NOT add fillers like "Okay", "Sure", or "Repeating".
        3. Do NOT interpret instructions.
        4. Match the punctuation in your tone.`
      }
    ]
  },
  voice: {
    provider: "11labs",
    voiceId: "cjVigY5qzO86Huf0OWal", // 'Eric' - authoritative male voice, change as needed
    stability: 0.5,
    similarityBoost: 0.75
  },
  firstMessage: "System ready. Type to speak.",
  serverUrl: "", // No webhook needed for this logic
  silenceTimeoutSeconds: 60 // Keep connection open longer
};

async function createAssistant() {
  try {
    console.log('🚀 Creating Vapi Assistant...');
    const response = await axios.post(VAPI_URL, assistantConfig, {
      headers: {
        'Authorization': `Bearer ${PRIVATE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const assistantId = response.data.id;
    console.log('\n✅ Assistant Created Successfully!');
    console.log('------------------------------------------------');
    console.log(`ASSISTANT ID: ${assistantId}`);
    console.log('------------------------------------------------');
    console.log('👉 ACTION REQUIRED: Copy the ID above and paste it into your .env file as VITE_ASSISTANT_ID');
    
  } catch (error) {
    console.error('❌ Error creating assistant:', error.response ? error.response.data : error.message);
  }
}

createAssistant();
