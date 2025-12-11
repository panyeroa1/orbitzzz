import { useState, useRef, useCallback, useEffect } from "react";

interface TTSQueueItem {
  text: string;
  language: string;
  id: string;
}

interface UseGeminiLiveAudioReturn {
  speak: (text: string, language: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  queueSize: number;
  currentText: string | null;
}

// Map language codes to Gemini voice names
function getVoiceName(language: string): string {
  const languageToVoice: Record<string, string> = {
    'en': 'Orus',
    'es': 'Orus',
    'fr': 'Orus',
    'de': 'Orus',
    'it': 'Orus',
    'pt': 'Orus',
    'tl': 'Orus',      // Filipino/Tagalog
    'tl-en': 'Orus',   // Taglish
    'ja': 'Orus',
    'ko': 'Orus',
    'zh': 'Orus',
    'ar': 'Orus',
    'hi': 'Orus',
  };
  
  return languageToVoice[language] || 'Orus';
}

export function useGeminiLiveAudio(): UseGeminiLiveAudioReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [currentText, setCurrentText] = useState<string | null>(null);
  
  const queueRef = useRef<TTSQueueItem[]>([]);
  const isProcessingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Process the TTS queue with Gemini API
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const item = queueRef.current.shift();
    setQueueSize(queueRef.current.length);

    if (!item) {
      isProcessingRef.current = false;
      return;
    }

    console.log(`[Gemini TTS] Speaking: "${item.text.substring(0, 50)}..." in ${item.language}`);
    setCurrentText(item.text);
    setIsSpeaking(true);

    try {
      // Call Gemini TTS API
      const response = await fetch('/api/tts/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.text,
          voiceName: getVoiceName(item.language),
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Event listener: When audio ends, process next item
      audio.onended = () => {
        console.log("[Gemini TTS] Finished speaking");
        
        // Cleanup
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        audioRef.current = null;
        
        setIsSpeaking(false);
        setCurrentText(null);
        
        // Enforce 1 second delay before processing next item
        setTimeout(() => {
          isProcessingRef.current = false;
          processQueue();
        }, 1000);
      };

      audio.onerror = (event) => {
        console.error("[Gemini TTS] Playback error:", event);
        
        // Cleanup
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        audioRef.current = null;
        
        setIsSpeaking(false);
        setCurrentText(null);
        
        // Try next item after delay
        setTimeout(() => {
          isProcessingRef.current = false;
          processQueue();
        }, 1000);
      };

      // Start playback
      await audio.play();
      
    } catch (error) {
      console.error("[Gemini TTS] Error:", error);
      
      // Cleanup on error
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      audioRef.current = null;
      
      setIsSpeaking(false);
      setCurrentText(null);
      
      // Try next item after delay
      setTimeout(() => {
        isProcessingRef.current = false;
        processQueue();
      }, 1000);
    }
  }, []);

  // Add text to queue
  const speak = useCallback((text: string, language: string) => {
    if (!text.trim()) return;

    const item: TTSQueueItem = {
      text,
      language,
      id: `${Date.now()}-${Math.random()}`,
    };

    queueRef.current.push(item);
    setQueueSize(queueRef.current.length);
    
    console.log(`[Gemini TTS] Added to queue (${queueRef.current.length} items): "${text.substring(0, 30)}..."`);
    
    // Start processing if not already
    if (!isProcessingRef.current) {
      processQueue();
    }
  }, [processQueue]);

  // Stop current speech and clear queue
  const stop = useCallback(() => {
    // Stop and cleanup current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    
    queueRef.current = [];
    setQueueSize(0);
    setIsSpeaking(false);
    setCurrentText(null);
    isProcessingRef.current = false;
    
    console.log("[Gemini TTS] Stopped and cleared queue");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    speak,
    stop,
    isSpeaking,
    queueSize,
    currentText,
  };
}
