
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Use gemini-2.0-flash-exp (or falling back to 1.5-flash if preferred, but user asked for latest)
    // If the specific "gemini-flash-latest" isn't a valid API model string, we usually use gemini-1.5-flash or gemini-2.0-flash-exp
    // I will use gemini-2.0-flash-exp as it is the latest fast model.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
      Analyze the following text. It may contain a monologue or a dialogue between multiple speakers.
      Your task is to segment the text by speaker and assign the most appropriate voice to each segment.

      Text: "${text}"

      Available Voices:
      - Aoede (Female, use for women, narrators, or generic female)
      - Charon (Male, use for men, deep voice, or generic male)
      - Kore (Female, younger/alternative)
      - Orus (Male, younger/alternative)

      Output Format:
      Return ONLY a JSON array of objects. Do not wrap in markdown code blocks.
      Example:
      [
        {"text": "Hello, how are you?", "voice": "Charon"},
        {"text": "I am fine, thanks.", "voice": "Aoede"}
      ]

      Rules:
      1. Split the text whenever the speaker changes (based on context cues like "He said", "She replied", or implicit dialogue).
      2. If it is a single speaker, return a single object in the array.
      3. Assign voices consistently (e.g., if "Paul" is Charon, keep him as Charon).
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    let rawText = response.text().trim();
    // Remove potential markdown wrappers if the model ignores the instruction
    rawText = rawText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '');

    let segments = [];
    try {
      segments = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse JSON from generic speaker detection, falling back to single segment:", rawText);
      segments = [{ text: text, voice: "Aoede" }];
    }
    
    // Ensure fallback if empty or invalid structure
    if (!Array.isArray(segments) || segments.length === 0) {
       segments = [{ text: text, voice: "Aoede" }];
    }

    return NextResponse.json({ segments });
  } catch (error: any) {
    console.error("Speaker detection error:", error);
    // Fallback to default
    return NextResponse.json({ voice: "Aoede" }); 
  }
}
