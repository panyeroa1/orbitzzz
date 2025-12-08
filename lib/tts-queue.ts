/**
 * TTS Queue Manager
 * 
 * Manages a FIFO queue of text segments for Text-to-Speech.
 * 
 * CRITICAL RULES:
 * 1. Never call TTS directly - always enqueue and respect isSpeaking
 * 2. Only one TTS can play at a time per user/language
 * 3. Queue processes automatically when previous audio finishes
 */

import { translationConfig } from "@/config/translation";

export interface TTSSegment {
  id: string;
  text: string;
  language: string;
  sessionId: string;
  userId: string;
  enqueuedAt: number;
  priority?: number;
}

export interface TTSQueueState {
  queue: TTSSegment[];
  isSpeaking: boolean;
  currentSegment: TTSSegment | null;
  lastCompletedAt: number | null;
}

type TTSCallback = (segment: TTSSegment) => Promise<ArrayBuffer>;
type CompletionCallback = (segment: TTSSegment) => void;

/**
 * TTS Queue Manager
 * 
 * Usage:
 * ```typescript
 * const queue = new TTSQueue(async (segment) => {
 *   const response = await fetch('/api/tts', {
 *     method: 'POST',
 *     body: JSON.stringify({ text: segment.text }),
 *   });
 *   return response.arrayBuffer();
 * });
 * 
 * queue.enqueue({ text: "Hello", language: "en", ... });
 * ```
 */
export class TTSQueue {
  private queues: Map<string, TTSQueueState> = new Map();
  private ttsCallback: TTSCallback;
  private onComplete?: CompletionCallback;
  private onError?: (error: Error, segment: TTSSegment) => void;

  constructor(
    ttsCallback: TTSCallback,
    options?: {
      onComplete?: CompletionCallback;
      onError?: (error: Error, segment: TTSSegment) => void;
    }
  ) {
    this.ttsCallback = ttsCallback;
    this.onComplete = options?.onComplete;
    this.onError = options?.onError;
  }

  /**
   * Get unique key for user/language combination
   */
  private getQueueKey(userId: string, language: string): string {
    return `${userId}:${language}`;
  }

  /**
   * Get or create queue state for a user/language
   */
  private getState(userId: string, language: string): TTSQueueState {
    const key = this.getQueueKey(userId, language);
    
    if (!this.queues.has(key)) {
      this.queues.set(key, {
        queue: [],
        isSpeaking: false,
        currentSegment: null,
        lastCompletedAt: null,
      });
    }

    return this.queues.get(key)!;
  }

  /**
   * Generate unique segment ID
   */
  private generateId(): string {
    return `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enqueue a text segment for TTS.
   * The segment will be processed when the current audio finishes.
   * 
   * @returns The ID of the enqueued segment
   */
  enqueue(
    params: Omit<TTSSegment, "id" | "enqueuedAt">
  ): string {
    const { userId, language, text, sessionId, priority } = params;

    if (!text.trim()) {
      console.warn("[TTS Queue] Ignoring empty text segment");
      return "";
    }

    const state = this.getState(userId, language);
    const segment: TTSSegment = {
      id: this.generateId(),
      text: text.trim(),
      language,
      sessionId,
      userId,
      enqueuedAt: Date.now(),
      priority,
    };

    // Add to queue (sorted by priority if specified)
    if (priority !== undefined) {
      const insertIndex = state.queue.findIndex(
        (s) => (s.priority ?? 0) < priority
      );
      if (insertIndex === -1) {
        state.queue.push(segment);
      } else {
        state.queue.splice(insertIndex, 0, segment);
      }
    } else {
      state.queue.push(segment);
    }

    const { logging } = translationConfig;
    if (logging.level === "debug") {
      console.log(
        `[TTS Queue] Enqueued: id=${segment.id} ` +
        `text="${text.substring(0, 30)}..." ` +
        `queueLength=${state.queue.length}`
      );
    }

    // Try to start processing
    this.maybeStartTTS(userId, language);

    return segment.id;
  }

  /**
   * Start TTS if not already speaking and queue is not empty.
   * 
   * CRITICAL: This respects the isSpeaking guard to prevent overlapping audio.
   */
  private async maybeStartTTS(userId: string, language: string): Promise<void> {
    const state = this.getState(userId, language);

    // Guard: Do not start if already speaking
    if (state.isSpeaking) {
      return;
    }

    // Guard: Nothing to process
    if (state.queue.length === 0) {
      return;
    }

    // Pop next segment
    const segment = state.queue.shift()!;
    state.isSpeaking = true;
    state.currentSegment = segment;

    const { logging } = translationConfig;
    if (logging.level === "debug" || logging.level === "info") {
      console.log(
        `[TTS Queue] Starting TTS: id=${segment.id} ` +
        `text="${segment.text.substring(0, 30)}..."`
      );
    }

    try {
      // Call TTS callback (user-provided function to generate audio)
      await this.ttsCallback(segment);

      // Mark completion
      state.lastCompletedAt = Date.now();
      this.onComplete?.(segment);

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[TTS Queue] Error: ${error.message}`);
      this.onError?.(error, segment);
    } finally {
      // Always reset speaking state and try next
      state.isSpeaking = false;
      state.currentSegment = null;

      // Process next in queue
      this.maybeStartTTS(userId, language);
    }
  }

  /**
   * Mark current TTS as complete and process next.
   * Call this when audio playback finishes on the client.
   */
  markComplete(userId: string, language: string): void {
    const state = this.getState(userId, language);
    state.isSpeaking = false;
    state.currentSegment = null;
    state.lastCompletedAt = Date.now();

    // Process next
    this.maybeStartTTS(userId, language);
  }

  /**
   * Get current queue state for a user/language
   */
  getQueueState(userId: string, language: string): Readonly<TTSQueueState> {
    return this.getState(userId, language);
  }

  /**
   * Check if currently speaking for a user/language
   */
  isSpeaking(userId: string, language: string): boolean {
    return this.getState(userId, language).isSpeaking;
  }

  /**
   * Get queue length for a user/language
   */
  getQueueLength(userId: string, language: string): number {
    return this.getState(userId, language).queue.length;
  }

  /**
   * Clear queue for a user/language (does not stop current TTS)
   */
  clearQueue(userId: string, language: string): void {
    const state = this.getState(userId, language);
    state.queue = [];
  }

  /**
   * Clear all queues
   */
  clearAll(): void {
    this.queues.clear();
  }
}

// Singleton instance for server-side use
let serverQueue: TTSQueue | null = null;

export function getServerTTSQueue(
  ttsCallback: TTSCallback,
  options?: {
    onComplete?: CompletionCallback;
    onError?: (error: Error, segment: TTSSegment) => void;
  }
): TTSQueue {
  if (!serverQueue) {
    serverQueue = new TTSQueue(ttsCallback, options);
  }
  return serverQueue;
}
