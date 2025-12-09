import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  // 1. Get Input
  let text: string, targetLanguage: string;
  try {
    const body = await req.json();
    text = body.text;
    targetLanguage = body.targetLanguage;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  // 2. Initialize Gemini Client
  const apiKey = process.env.EBURON_SPEECH_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("EBURON_SPEECH_API_KEY or GEMINI_API_KEY is missing");
    return NextResponse.json({ error: "Server configuration error (API Key missing)" }, { status: 500 });
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    // 3. Translate with Gemini Flash Lite (text-only, fast)
    console.log("[Translation] Translating with Gemini Flash Lite...");
    
    const translationPrompt = `You are a professional translator. Translate the following text to ${targetLanguage || "Spanish"}. 
IMPORTANT RULES:
- Output ONLY the translation, nothing else
- Preserve the natural tone and meaning
- Use appropriate regional expressions and idioms for ${targetLanguage}
- Do not add explanations or notes

Text to translate: "${text}"`;

    const translationResult = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: translationPrompt,
    });

    const translatedText = translationResult.text?.trim() || text;
    console.log(`[Translation] Translated to ${targetLanguage}: "${translatedText}"`);

    return NextResponse.json({
      translatedText,
      originalText: text,
      targetLanguage
    });

  } catch (err: any) {
    console.error("[Gemini API] Translation failed:", err);
    return NextResponse.json({ error: "Translation failed: " + err.message }, { status: 500 });
  }
}
