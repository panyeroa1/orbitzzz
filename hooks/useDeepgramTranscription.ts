import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface DeepgramTranscriptSegment {
  text: string;
  timestamp: string;
  isFinal: boolean;
  confidence?: number;
  language?: string;
  speaker?: number;
}

interface UseDeepgramTranscriptionOptions {
  apiKey: string;
  model?: string;
  language?: string; // "auto" for auto-detection or specific language code
  enableFallback?: boolean; // Fallback to Web Speech API if Deepgram fails
  meetingId?: string; // Optional meeting ID to associate transcriptions
}

interface UseDeepgramTranscriptionReturn {
  isListening: boolean;
  isConnected: boolean;
  isPaused: boolean;
  transcript: string;
  interimTranscript: string;
  segments: DeepgramTranscriptSegment[];
  detectedLanguage: string | null;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  resetTranscript: () => void;
}

export function useDeepgramTranscription(
  options: UseDeepgramTranscriptionOptions
): UseDeepgramTranscriptionReturn {
  const {
    apiKey,
    model = "nova-2",
    language = "auto",
    enableFallback = true,
    meetingId,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [segments, setSegments] = useState<DeepgramTranscriptSegment[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef(false);

  // Check if we can use Deepgram
  const canUseDeepgram = apiKey && apiKey.length > 0;

  const cleanup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
    isListeningRef.current = false;
  }, []);

  const startListening = useCallback(async () => {
    if (isListeningRef.current || !canUseDeepgram) {
      setError("Deepgram API key not configured");
      return;
    }

    try {
      setError(null);
      isListeningRef.current = true;
      setIsListening(true);

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create Deepgram WebSocket connection
      // For auto-detection, use detect_language=true instead of language=auto
      const languageParam = language === "auto" 
        ? "detect_language=true" 
        : `language=${language}`;
      
      // Enable diarize=true for speaker detection and tag with meetingId
      const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=${model}&${languageParam}&smart_format=true&interim_results=true&endpointing=300&diarize=true${meetingId ? `&tag=${meetingId}` : ""}`;
      
      const socket = new WebSocket(deepgramUrl, ["token", apiKey]);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("[Deepgram] Connected");
        setIsConnected(true);
        setError(null);

        // Create MediaRecorder and send audio
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm",
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        mediaRecorder.start(250); // Send audio chunks every 250ms
      };

      socket.onmessage = async (message) => {
        try {
          const data = JSON.parse(message.data);
          
          if (data.channel?.alternatives?.[0]) {
            const alternative = data.channel.alternatives[0];
            const transcriptText = alternative.transcript;
            
            if (transcriptText && transcriptText.trim()) {
              const isFinal = data.is_final === true;
              const confidence = alternative.confidence;
              const detectedLang = data.channel.detected_language || language;

              // Extract speaker from the first word if available
              let speakerId: number | undefined = undefined;
              if (alternative.words && alternative.words.length > 0) {
                 speakerId = alternative.words[0].speaker;
              }

              if (isFinal) {
                // Final transcript - add to segments
                const segment: DeepgramTranscriptSegment = {
                  text: transcriptText,
                  timestamp: new Date().toISOString(),
                  isFinal: true,
                  confidence: confidence,
                  language: detectedLang,
                  speaker: speakerId,
                };

                setSegments((prev) => [...prev, segment]);
                setTranscript((prev) => prev + transcriptText + " ");
                setInterimTranscript("");
                
                // Update detected language
                if (detectedLang && detectedLang !== "auto") {
                  setDetectedLanguage(detectedLang);
                }

                // Save to Supabase
                if (meetingId) {
                  try {
                    const { error: supabaseError } = await supabase
                      .from('transcriptions')
                      .insert([
                        { 
                          text: transcriptText,
                          is_final: true,
                          confidence: confidence,
                          language: detectedLang,
                          meeting_id: meetingId,
                          speaker_id: speakerId !== undefined ? speakerId.toString() : null
                        }
                      ]);
                    
                    if (supabaseError) {
                      console.error("[Supabase] Error saving transcript:", supabaseError);
                    }
                  } catch (sbErr) {
                    console.error("[Supabase] Exception saving transcript:", sbErr);
                  }
                }

              } else {
                // Interim transcript
                setInterimTranscript(transcriptText);
              }
            }
          }
        } catch (err) {
          console.error("[Deepgram] Error parsing message:", err);
        }
      };

      socket.onerror = (err) => {
        console.error("[Deepgram] WebSocket error:", err);
        setError("Deepgram connection error");
        setIsConnected(false);
      };

      socket.onclose = () => {
        console.log("[Deepgram] Disconnected");
        setIsConnected(false);
        
        if (isListeningRef.current) {
          cleanup();
        }
      };
    } catch (err) {
      console.error("[Deepgram] Error starting transcription:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start transcription"
      );
      cleanup();
    }
  }, [apiKey, model, language, canUseDeepgram, cleanup, meetingId]);

  const stopListening = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Pause listening - mutes the microphone to prevent audio feedback during TTS
  const pauseListening = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      setIsPaused(true);
      console.log("[Deepgram] Microphone muted");
    }
  }, []);

  // Resume listening - unmutes the microphone after TTS finishes
  const resumeListening = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setIsPaused(false);
      console.log("[Deepgram] Microphone unmuted");
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setSegments([]);
    setDetectedLanguage(null);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    isConnected,
    isPaused,
    transcript,
    interimTranscript,
    segments,
    detectedLanguage,
    error,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    resetTranscript,
  };
}
