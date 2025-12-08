import { useState, useRef, useCallback, useEffect } from "react";

interface UseBroadcastTranscriptionOptions {
  meetingId: string;
}

interface UseBroadcastTranscriptionReturn {
  isTranscribing: boolean;
  start: (sourceStream: MediaStream) => Promise<void>;
  stop: () => void;
  error: string | null;
}

export function useBroadcastTranscription({
  meetingId,
}: UseBroadcastTranscriptionOptions): UseBroadcastTranscriptionReturn {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef(0);
  const isTranscribingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const CHUNK_DURATION_MS = 3000; // 3 seconds per chunk

  const sendAudioChunk = async (blob: Blob, index: number) => {
    try {
      const formData = new FormData();
      formData.append("file", blob);
      formData.append("meeting_id", meetingId);
      formData.append("chunk_index", index.toString());

      await fetch("/api/transcription/ingest-audio", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.error("Error sending audio chunk:", err);
      // Don't stop transcribing on single chunk failure, just log
    }
  };

  const startRecorderLoop = useCallback((stream: MediaStream) => {
    // We use a "stop-start" loop to ensure each chunk is a valid standalone file with headers.
    // This is safer for backend processing (Deepgram Pre-recorded API).
    
    const recordSegment = () => {
      if (!isTranscribingRef.current) return;

      try {
        const mimeType = [
           "audio/webm", 
           "audio/mp4", 
           "audio/ogg", 
           "audio/webm;codecs=opus", 
           "audio/mp4;codecs=mp4a.40.2"
        ].find(type => MediaRecorder.isTypeSupported(type)) || "";

        const options = mimeType ? { mimeType } : {};
        console.log(`[Broadcast] Using mimeType: ${mimeType || "default"}`);

        const recorder = new MediaRecorder(stream, options);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const type = mimeType || "audio/webm"; // Default fallback for Blob constructor
          const blob = new Blob(chunks, { type });
          if (blob.size > 0) {
            sendAudioChunk(blob, chunkIndexRef.current);
            chunkIndexRef.current++;
          }
        };

        recorder.start();
        
        // Stop recording after duration
        setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
          // Recursively call for next segment if still active
          if (isTranscribingRef.current) {
             recordSegment();
          }
        }, CHUNK_DURATION_MS);

      } catch (err: any) {
        console.error("Recorder loop error:", err);
        setError("Failed to record audio segment");
        isTranscribingRef.current = false;
        setIsTranscribing(false);
      }
    };

    recordSegment();
  }, [meetingId]);

  const start = useCallback(async (sourceStream: MediaStream) => {
    setError(null);
    streamRef.current = sourceStream;
    chunkIndexRef.current = 0;
    isTranscribingRef.current = true;
    setIsTranscribing(true);

    startRecorderLoop(sourceStream);
  }, [startRecorderLoop]);

  const stop = useCallback(() => {
    isTranscribingRef.current = false;
    setIsTranscribing(false);
    
    if (streamRef.current) {
        // We typically don't stop the stream here if it was passed in (e.g. system audio), 
        // effectively letting the caller manage the stream lifecycle.
        // But for cleanup we can ensure internal refs are cleared.
        streamRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
        isTranscribingRef.current = false;
    };
  }, []);

  return {
    isTranscribing,
    start,
    stop,
    error
  };
}
