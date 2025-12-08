import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage, meetingId } = await req.json();

    if (!text || !meetingId) {
      return NextResponse.json({ error: "Text and meetingId are required" }, { status: 400 });
    }

    // 1. Initialize Gemini
    const apiKey = process.env.EBURON_SPEECH_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    // Use standard Generative AI for text translation (faster/cheaper than Live)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // 2. Translate Text
    const prompt = `Translate the following text to ${targetLanguage || "Spanish"}. Return ONLY the translated text, no markdown, no explanations. Text: "${text}"`;
    
    const result = await model.generateContent(prompt);
    const translatedText = result.response.text();

    // 3. Save to Supabase
    const { error: dbError } = await supabase
      .from('translations')
      .insert({
        meeting_id: meetingId,
        original_text: text,
        translated_text: translatedText,
        language: targetLanguage || "es",
        // created_at is default
      });

    if (dbError) {
      console.error("Supabase Error:", dbError);
      return NextResponse.json({ error: "Failed to save translation" }, { status: 500 });
    }

    return NextResponse.json({ success: true, translatedText });

  } catch (err: any) {
    console.error("[Translate API] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

