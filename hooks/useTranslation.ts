"use client";

import { useState, useCallback } from "react";

interface UseTranslationOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  apiUrl?: string;
}

interface UseTranslationReturn {
  translate: (text: string) => Promise<string>;
  isTranslating: boolean;
  error: string | null;
  lastTranslation: string;
}

// LibreTranslate public instance (free, no API key required)
const DEFAULT_API_URL = "https://libretranslate.com/translate";

export function useTranslation(
  options: UseTranslationOptions
): UseTranslationReturn {
  const {
    sourceLanguage = "auto",
    targetLanguage,
    apiUrl = DEFAULT_API_URL,
  } = options;

  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranslation, setLastTranslation] = useState("");

  const translate = useCallback(
    async (text: string): Promise<string> => {
      if (!text.trim()) return "";

      setIsTranslating(true);
      setError(null);

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: text,
            source: sourceLanguage,
            target: targetLanguage,
            format: "text",
          }),
        });

        if (!response.ok) {
          throw new Error(`Translation failed: ${response.statusText}`);
        }

        const data = await response.json();
        const translatedText = data.translatedText || "";

        setLastTranslation(translatedText);
        setIsTranslating(false);

        return translatedText;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("[Translation] Error:", errorMessage);
        setError(errorMessage);
        setIsTranslating(false);

        // Return original text on error
        return text;
      }
    },
    [sourceLanguage, targetLanguage, apiUrl]
  );

  return {
    translate,
    isTranslating,
    error,
    lastTranslation,
  };
}
