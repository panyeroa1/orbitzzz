import { NextResponse } from "next/server";

const DEFAULT_MODEL = process.env.GEMINI_MODEL_ID || "gemini-flash-lite-latest";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const prompt = `
Break the transcript into speaker segments. The transcript may include multiple speakers. 
Return JSON ONLY:
[
  { "text": "segment words", "voice": "Aoede" }
]

Voices: Aoede (F), Charon (M), Kore (F alt), Orus (M alt).

Rules:
1. Split each time a different speaker is implied.
2. Keep order of the conversation.
3. If speaker cannot be derived, still segment logically and choose a consistent voice.

Transcript:
${text}
    `.trim();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let rawText =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || "")
        .join("")
        .trim() || "";

    rawText = rawText.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "");

    let segments = [];
    try {
      segments = JSON.parse(rawText);
    } catch (e) {
      console.error("JSON parse failed:", rawText);
      segments = [{ text, voice: "Aoede" }];
    }

    if (!Array.isArray(segments) || segments.length === 0) {
      segments = [{ text, voice: "Aoede" }];
    }

    return NextResponse.json({ segments });
  } catch (error: any) {
    console.error("Speaker detection error:", error);
    return NextResponse.json({
      segments: [{ text: "Error in detection, using default voice.", voice: "Aoede" }],
    });
  }
}
