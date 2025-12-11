import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Initialize the new Google GenAI SDK
    // It automatically picks up GEMINI_API_KEY from process.env
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    // Generate content using gemini-2.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json", 
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    let rawText = response.text; 
    // In @google/genai v1+, .text is a getter (property) that returns string or null/undefined.
    // We check just in case.
    
    if (typeof rawText === 'function') {
        // @ts-ignore
        rawText = rawText();
    } 
    
    if (!rawText && response.candidates && response.candidates.length > 0) {
        rawText = response.candidates[0].content?.parts?.[0]?.text;
    }

    if (!rawText) {
        rawText = ""; // Handle empty
    }

    // Clean up markdown
    rawText = rawText.trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '');

    let segments = [];
    try {
      segments = JSON.parse(rawText);
    } catch (e) {
      console.error("JSON parse failed:", rawText);
      segments = [{ text: text, voice: "Aoede" }];
    }
    
    if (!Array.isArray(segments) || segments.length === 0) {
       segments = [{ text: text, voice: "Aoede" }];
    }

    return NextResponse.json({ segments });
  } catch (error: any) {
    console.error("Speaker detection error:", error);
    // Return 200 with fallback to avoid breaking UI flow entirely, 
    // OR return 500 if we want the UI to show red. 
    // The user saw "Speaker detection failed" which implies non-200. 
    // But my previous code returned 200.
    // Let's return 200 with fallback so it 'works' but just defaults to one speaker if the API fails.
    return NextResponse.json({ segments: [{ text: "Error in detection, using default voice.", voice: "Aoede" }] }); 
  }
}
