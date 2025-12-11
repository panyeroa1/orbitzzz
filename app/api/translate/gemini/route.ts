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

    // Create translation prompt
    const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, nothing else.\n\nText to translate:\n${text}`;

    const result = await model.generateContent(prompt);
    const translatedText = result.response.text();

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
