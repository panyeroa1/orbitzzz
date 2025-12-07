"use client";

import { useRouter } from "next/navigation";
import { use, useState, useRef, useEffect } from "react";
import { Globe, Volume2, VolumeX, ArrowLeft, Loader2, Mic, MicOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Removed old hooks: useTTS, useTranslation (replaced by Gemini API)
import { useWebSpeech } from "@/hooks/useWebSpeech"; 
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

type TranslatePageProps = {
  params: Promise<{ id: string }>;
};

export default function TranslatePage({ params }: TranslatePageProps) {
  const { id: meetingId } = use(params);
  const router = useRouter();

  const [targetLanguage, setTargetLanguage] = useState("es");
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ original: string; translated: string; language: string }>>([]);
  const [currentOriginal, setCurrentOriginal] = useState("");
  const [currentTranslated, setCurrentTranslated] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Web Speech for Input
  const {
    isListening,
    startListening,
    stopListening,
    segments,
    interimTranscript,
    isSupported,
    error: webSpeechError
  } = useWebSpeech({
    language: "en-US", // Default input language
    continuous: true,
    interimResults: true,
  });

  const processedSegmentCount = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptHistory, interimTranscript]);

  // Process new segments
  useEffect(() => {
    const processSegments = async () => {
      // Check if we have new FINAL segments
      if (segments.length > processedSegmentCount.current) {
        const newSegment = segments[processedSegmentCount.current];
        processedSegmentCount.current = segments.length; // Update pointer

        if (!newSegment || !newSegment.text.trim()) return;

        setCurrentOriginal(newSegment.text);
        setProcessing(true);

        try {
          // Call Gemini API
          const response = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: newSegment.text,
              targetLanguage: LANGUAGES.find(l => l.code === targetLanguage)?.name || "Spanish",
            }),
          });

          if (!response.ok) throw new Error("Translation failed");

          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);

          // Assume the API does not return text (audio-only), or we assume text from somewhere?
          // The API currently returns only audio/wav. 
          // For display, we might want to ask API for JSON (text + audio), but current API logic returns raw WAV.
          // We will just display "Translated Audio" or similar, OR rely on a separate translation call if text is needed.
          // But user said "read aloud... translate...".
          // I will display "Audio Generated" for now.
          
          const translatedTextDisplay = "(Audio Playing...)"; // Placeholder as we prioritize Audio

          setTranscriptHistory(prev => [
            ...prev,
            {
              original: newSegment.text,
              translated: translatedTextDisplay, 
              language: "en", 
            }
          ]);
          
          setCurrentTranslated(translatedTextDisplay);

          if (autoSpeak) {
            await audio.play();
          }
          
        } catch (err) {
          console.error("Translation Error:", err);
        } finally {
          setProcessing(false);
          // Clear "current" display after a delay
          setTimeout(() => {
             if (currentOriginal === newSegment.text) setCurrentOriginal("");
             if (currentTranslated === "(Audio Playing...)") setCurrentTranslated("");
          }, 5000);
        }
      }
    };

    processSegments();
  }, [segments, targetLanguage, autoSpeak]);

  // Handle Interim
  useEffect(() => {
    if (interimTranscript) {
        setCurrentOriginal(interimTranscript);
    }
  }, [interimTranscript]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-1 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Meeting
          </button>

          <div className="flex items-center gap-2">
            {isListening ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Listening (Web Speech)
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <div className="h-2 w-2 rounded-full bg-white/20" />
                Idle
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
              <h1 className="text-2xl font-bold tracking-apple-tight">Live Translation</h1>
              <p className="text-white/60 text-sm">Meeting: {meetingId}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Start/Stop Mic */}
             <button
                onClick={toggleListening}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all",
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                    : "bg-blue-1 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                )}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                {isListening ? "Stop Listening" : "Start Listening"}
              </button>

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

            <button
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-apple transition-all",
                  autoSpeak
                    ? "bg-purple-1 text-white"
                    : "bg-dark-3 text-white/60 hover:text-white"
                )}
            >
                {autoSpeak ? <Volume2 size={20} /> : <VolumeX size={20} />}
                <span className="text-sm font-medium">Auto-speak</span>
            </button>
          </div>
          
           {webSpeechError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-apple text-red-400 text-sm">
                  Error: {webSpeechError}
              </div>
           )}

          {/* Display Current Turn */}
          {(currentOriginal || currentTranslated) && (
            <div className="mb-6 p-4 bg-dark-3 rounded-apple space-y-3 animate-fade-in border border-white/5">
              {currentOriginal && (
                <div>
                  <div className="text-xs text-white/40 mb-1">Detected Speech</div>
                  <p className="text-white/90 text-lg leading-relaxed">{currentOriginal}</p>
                </div>
              )}
              {currentTranslated && (
                <div className="pt-2 border-t border-white/5">
                  <div className="text-xs text-purple-1 mb-1 flex items-center gap-2">
                    Gemini Translation
                    {processing && <Loader2 size={12} className="animate-spin" />}
                  </div>
                  <p className="text-white font-medium text-xl text-purple-200">{currentTranslated}</p>
                </div>
              )}
            </div>
          )}
          
           {!isSupported && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-apple text-yellow-500 text-sm">
                Web Speech API is not supported in this browser. Please use Chrome.
            </div>
           )}
        </div>

        {/* History */}
        <div className="apple-card p-6">
          <h2 className="text-lg font-semibold mb-4 tracking-apple-tight">Translation History</h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {transcriptHistory.length === 0 ? (
              <p className="text-white/40 text-center py-8">
                History is empty. Start speaking to see translations.
              </p>
            ) : (
              transcriptHistory.map((item, i) => (
                <div key={i} className="p-4 bg-dark-3/50 rounded-apple space-y-2 border border-white/5 hover:border-white/10 transition-colors">
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
