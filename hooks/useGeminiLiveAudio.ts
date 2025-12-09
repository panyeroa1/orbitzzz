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

export function useGeminiLiveAudio(): UseGeminiLiveAudioReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [currentText, setCurrentText] = useState<string | null>(null);
  
  const queueRef = useRef<TTSQueueItem[]>([]);
  const isProcessingRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Process the TTS queue
  const processQueue = useCallback(() => {
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

    console.log(`[TTS] Speaking: "${item.text.substring(0, 50)}..." in ${item.language}`);
    setCurrentText(item.text);
    setIsSpeaking(true);

    // Use Web Speech API for TTS
    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.lang = item.language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Event listener: When speech ends, process next item
    utterance.onend = () => {
      console.log("[TTS] Finished speaking");
      setIsSpeaking(false);
      setCurrentText(null);
      isProcessingRef.current = false;
      
      // Process next item in queue after a short delay
      setTimeout(() => {
        processQueue();
      }, 100);
    };

    utterance.onerror = (event) => {
      console.error("[TTS] Error:", event);
      setIsSpeaking(false);
      setCurrentText(null);
      isProcessingRef.current = false;
      
      // Try next item
      setTimeout(() => {
        processQueue();
      }, 100);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
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
    
    console.log(`[TTS] Added to queue (${queueRef.current.length} items): "${text.substring(0, 30)}..."`);
    
    // Start processing if not already
    if (!isProcessingRef.current) {
      processQueue();
    }
  }, [processQueue]);

  // Stop current speech and clear queue
  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    queueRef.current = [];
    setQueueSize(0);
    setIsSpeaking(false);
    setCurrentText(null);
    isProcessingRef.current = false;
    utteranceRef.current = null;
    console.log("[TTS] Stopped and cleared queue");
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
