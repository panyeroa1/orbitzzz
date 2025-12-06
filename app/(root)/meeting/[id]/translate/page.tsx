"use client";

import { useRouter } from "next/navigation";
import { use, useState, useRef, useEffect } from "react";
import { Globe, Volume2, VolumeX, ArrowLeft, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTTS } from "@/hooks/useTTS";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "tl", name: "Tagalog" },
  { code: "ar", name: "Arabic" },
  { code: "ru", name: "Russian" },
  { code: "hi", name: "Hindi" },
];

const WHISPER_URL = process.env.NEXT_PUBLIC_WHISPER_SERVER_URL || "ws://localhost:8000";

type TranslatePageProps = {
  params: Promise<{ id: string }>;
};

export default function TranslatePage({ params }: TranslatePageProps) {
  const { id: meetingId } = use(params);
  const router = useRouter();

  const [targetLanguage, setTargetLanguage] = useState("es");
  const [isConnected, setIsConnected] = useState(false);
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ original: string; translated: string; language: string }>>([]);
  const [currentOriginal, setCurrentOriginal] = useState("");
  const [currentTranslated, setCurrentTranslated] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const { speak, stop, isSpeaking, isSupported: ttsSupported } = useTTS({
    language: targetLanguage,
    rate: 0.9,
  });

  const { translate, isTranslating } = useTranslation({
    sourceLanguage: "auto",
    targetLanguage,
  });

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptHistory]);

  // Connect to Whisper WebSocket
  useEffect(() => {
    const connectToWhisper = async () => {
      try {
        const wsUrl = WHISPER_URL.replace("http://", "ws://").replace("https://", "wss://");
        const ws = new WebSocket(`${wsUrl}/ws/transcribe`);

        ws.onopen = async () => {
          console.log("[Translation] Connected to transcription service");
          socketRef.current = ws;
          setIsConnected(true);

          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Determine supported mime type
            let mimeType = "audio/webm";
            if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
              mimeType = "audio/webm;codecs=opus";
            } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
              mimeType = "audio/mp4"; // Safari fallback
            }

            console.log(`[Translation] Using MIME type: ${mimeType}`);

            const recordAndSend = () => {
              if (ws.readyState !== WebSocket.OPEN) return;

              const recorder = new MediaRecorder(stream, { mimeType });
              
              recorder.ondataavailable = (event) => {
                if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                  ws.send(event.data);
                }
              };

              recorder.start();

              // Stop and restart every 3 seconds to ensure headers are sent
              setTimeout(() => {
                if (recorder.state === "recording") {
                  recorder.stop();
                  if (ws.readyState === WebSocket.OPEN) {
                     recordAndSend();
                  }
                }
              }, 3000);
            };
            
            // Start the loop
            recordAndSend();
            
            // Store stream cleanup, not recorder ref since it changes
            mediaRecorderRef.current = { 
               stream, 
               stop: () => stream.getTracks().forEach(t => t.stop()),
               state: "active" 
            } as any;

          } catch (err) {
            console.error("Error accessing microphone:", err);
          }
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.text) {
              const originalText = data.text;
              const detectedLang = data.language || "unknown";
              
              setCurrentOriginal(originalText);

              // Translate the text
              const translatedText = await translate(originalText);
              setCurrentTranslated(translatedText);

              // Add to history
              setTranscriptHistory((prev) => [
                ...prev,
                {
                  original: originalText,
                  translated: translatedText,
                  language: detectedLang,
                },
              ]);

              // Speak the translation
              if (autoSpeak && translatedText) {
                speak(translatedText);
              }

              // Clear current after 5 seconds
              setTimeout(() => {
                setCurrentOriginal("");
                setCurrentTranslated("");
              }, 5000);
            }
          } catch (err) {
            console.error("[Translation] Error processing message:", err);
          }
        };

        ws.onerror = (error) => {
          console.error("[Translation] WebSocket error:", error);
        };

        ws.onclose = () => {
          console.log("[Translation] Disconnected");
          setIsConnected(false);
          // Cleanup stream
          if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
             mediaRecorderRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
          }
        };
      } catch (error) {
        console.error("[Translation] Error connecting:", error);
        alert("Could not access microphone. Please allow microphone permissions.");
      }
    };

    connectToWhisper();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      stop();
    };
  }, [translate, autoSpeak, speak, stop]);

  const toggleAutoSpeak = () => {
    if (autoSpeak && isSpeaking) {
      stop();
    }
    setAutoSpeak(!autoSpeak);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-1 text-white p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Meeting
          </button>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Connected
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                Connecting...
              </div>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className="apple-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-purple-1/20">
              <Globe size={24} className="text-purple-1" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-apple-tight">Real-time Translation</h1>
              <p className="text-white/60 text-sm">Meeting: {meetingId}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-white/60 mb-2">Target Language</label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="w-full bg-dark-3 border-white/10">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="bg-dark-1 border-white/10">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="text-white">
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleAutoSpeak}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-apple transition-all",
                  autoSpeak
                    ? "bg-purple-1 text-white"
                    : "bg-dark-3 text-white/60 hover:text-white"
                )}
                title={autoSpeak ? "Disable auto-speak" : "Enable auto-speak"}
              >
                {autoSpeak ? <Volume2 size={20} /> : <VolumeX size={20} />}
                <span className="text-sm font-medium">Auto-speak</span>
              </button>
            </div>
          </div>

          {/* Live Translation Display */}
          {(currentOriginal || currentTranslated) && (
            <div className="mb-6 p-4 bg-dark-3 rounded-apple space-y-3 animate-fade-in">
              {currentOriginal && (
                <div>
                  <div className="text-xs text-white/40 mb-1">Original</div>
                  <p className="text-white/80">{currentOriginal}</p>
                </div>
              )}
              {currentTranslated && (
                <div>
                  <div className="text-xs text-purple-1 mb-1 flex items-center gap-2">
                    Translation
                    {isTranslating && <Loader2 size={12} className="animate-spin" />}
                    {isSpeaking && <Volume2 size={12} className="animate-pulse" />}
                  </div>
                  <p className="text-white font-medium text-lg">{currentTranslated}</p>
                </div>
              )}
            </div>
          )}

          {/* Support Warning */}
          {!ttsSupported && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-apple">
              <p className="text-yellow-500 text-sm">
                ⚠️ Text-to-speech is not supported in your browser. Translation will still work, but audio output will be unavailable.
              </p>
            </div>
          )}
        </div>

        {/* Transcript History */}
        <div className="apple-card p-6">
          <h2 className="text-lg font-semibold mb-4 tracking-apple-tight">Translation History</h2>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {transcriptHistory.length === 0 ? (
              <p className="text-white/40 text-center py-8">
                {isConnected ? "Listening for speech..." : "Connecting to transcription service..."}
              </p>
            ) : (
              transcriptHistory.map((item, i) => (
                <div key={i} className="p-4 bg-dark-3/50 rounded-apple space-y-2">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span className="px-2 py-0.5 bg-white/5 rounded">{item.language.toUpperCase()}</span>
                  </div>
                  <p className="text-white/60 text-sm">{item.original}</p>
                  <div className="border-l-2 border-purple-1/30 pl-3">
                    <p className="text-white font-medium">{item.translated}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
