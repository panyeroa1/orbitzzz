/**
 * Translation System Configuration
 * 
 * Centralized config for the Live Transcribe → Translate → Read-Aloud pipeline.
 */

export const translationConfig = {
  // ============================================================
  // BATCHING SETTINGS
  // ============================================================
  batching: {
    // Time-based: trigger translation after N milliseconds of accumulated text
    timeThresholdMs: 8000, // 8 seconds

    // Sentence-based: trigger translation after N complete sentences
    sentenceThreshold: 2,

    // Minimum characters before triggering translation
    minCharacters: 20,

    // Maximum characters per batch (to avoid token limits)
    maxCharacters: 500,
  },

  // ============================================================
  // DEFAULT LANGUAGES
  // ============================================================
  languages: {
    // Default source language for STT (use 'auto' for auto-detection)
    defaultSource: 'auto',

    // Default target language for translation
    defaultTarget: 'Spanish',

    // Supported target languages
    supportedTargets: [
      'Spanish',
      'French',
      'German',
      'Italian',
      'Portuguese',
      'Chinese',
      'Japanese',
      'Korean',
      'Arabic',
      'Russian',
      'Hindi',
      'Tagalog',
      'Vietnamese',
      'Thai',
      'Indonesian',
      'Dutch',
      'Polish',
    ] as const,
  },

  // ============================================================
  // TTS SETTINGS
  // ============================================================
  tts: {
    // Gemini Live Audio model
    model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',

    // Voice configuration
    voiceName: 'Orus',

    // Maximum characters per TTS request
    maxCharsPerRequest: 1900,

    // Timeout for TTS response (ms)
    timeoutMs: 15000,
  },

  // ============================================================
  // LOGGING
  // ============================================================
  logging: {
    // Log level: 'debug' | 'info' | 'warn' | 'error'
    level: (process.env.APP_ENV === 'prod' ? 'warn' : 'debug') as 'debug' | 'info' | 'warn' | 'error',

    // Include timing information in logs
    includeTiming: true,

    // Include session/user IDs in logs
    includeIdentifiers: true,
  },
};

// Sentence detection regex (supports multiple sentence-ending punctuation)
export const SENTENCE_ENDINGS = /[.!?。！？]+/g;

// Helper to detect complete sentences
export function countCompleteSentences(text: string): number {
  const matches = text.match(SENTENCE_ENDINGS);
  return matches ? matches.length : 0;
}

// Helper to check if batch is ready for translation
export function isBatchReady(
  text: string,
  elapsedMs: number,
): { ready: boolean; reason: string } {
  const { batching } = translationConfig;

  if (text.length < batching.minCharacters) {
    return { ready: false, reason: 'below_min_chars' };
  }

  if (text.length >= batching.maxCharacters) {
    return { ready: true, reason: 'max_chars_reached' };
  }

  if (elapsedMs >= batching.timeThresholdMs) {
    return { ready: true, reason: 'time_threshold' };
  }

  const sentences = countCompleteSentences(text);
  if (sentences >= batching.sentenceThreshold) {
    return { ready: true, reason: 'sentence_threshold' };
  }

  return { ready: false, reason: 'waiting' };
}

export type SupportedLanguage = (typeof translationConfig.languages.supportedTargets)[number];
