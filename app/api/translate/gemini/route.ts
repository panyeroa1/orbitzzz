import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage = "auto" } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: "Missing required fields: text, targetLanguage" },
        { status: 400 }
      );
    }

    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    // Translation prompt focused on fidelity
    const prompt = `
      You are a precise translator.
      - Translate the user text to ${targetLanguage}.
      - Preserve meaning, tone, speaker markers, punctuation, numbers, and line breaks.
      - Do not summarize, omit, or add anything.
      - If the text already contains the target language, return it unchanged.
      - Output ONLY the translated text, with no labels or commentary.
    `;

    const result = await model.generateContent({
      contents: [
        { role: "system", parts: [{ text: prompt.trim() }] },
        { role: "user", parts: [{ text }] },
      ],
    });

    const translatedText = result.response.text()?.trim() || "";

    if (!translatedText) {
      return NextResponse.json(
        { error: "Empty translation returned" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      originalText: text,
      translatedText: translatedText.trim(),
      sourceLanguage,
      targetLanguage,
    });
  } catch (error) {
    console.error("[Gemini Translation] Error:", error);
    return NextResponse.json(
      { error: "Translation failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
