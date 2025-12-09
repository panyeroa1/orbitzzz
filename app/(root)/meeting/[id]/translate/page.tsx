"use client";

import { use, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe, ArrowLeft, Volume2, VolumeX, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslationListener } from "@/hooks/useTranslationListener";
import { LANGUAGES, getLanguageName } from "@/lib/languages";
import { cn } from "@/lib/utils";

type TranslatePageProps = {
  params: Promise<{ id: string }>;
};

export default function TranslatePage({ params }: TranslatePageProps) {
  const { id: meetingId } = use(params);
  const router = useRouter();

  const [targetLanguage, setTargetLanguage] = useState("es");
  const [enabled, setEnabled] = useState(false);

  // Use the translation listener hook
  const {
    isActive,
    lastTranslation,
    error,
    transcriptionCount,
    isSpeaking,
    queueSize,
  } = useTranslationListener({
    meetingId,
    targetLanguage,
    enabled,
  });

  // Auto-scroll logic
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastTranslation]);

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
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isActive
                  ? "bg-green-500 animate-pulse"
                  : "bg-gray-500"
              )}
            />
            <span className="text-sm font-medium text-white/60">
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="apple-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-purple-1/20">
              <Globe size={24} className="text-purple-1" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-apple-tight">
                Eburon Translator
              </h1>
              <p className="text-white/60 text-sm">Meeting: {meetingId}</p>
            </div>

            <div className="flex items-center gap-2">
              {isSpeaking && (
                <div className="px-3 py-1 bg-purple-1/20 rounded-full text-purple-1 text-xs font-bold animate-pulse flex items-center gap-2">
                  <Volume2 size={12} /> Speaking
                </div>
              )}
              {queueSize > 0 && (
                <div className="px-3 py-1 bg-blue-500/20 rounded-full text-blue-400 text-xs font-bold">
                  Queue: {queueSize}
                </div>
              )}
              <button
                onClick={() => setEnabled(!enabled)}
                className={cn(
                  "p-3 rounded-full transition-all",
                  enabled
                    ? "bg-purple-1 text-white"
                    : "bg-dark-3 text-white/40 hover:text-white"
                )}
                title={enabled ? "Stop Translation" : "Start Translation"}
              >
                {enabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="w-full bg-dark-3 border-white/10">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent className="bg-dark-1 border-white/10 max-h-[300px]">
                {LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="text-white"
                  >
                    {lang.native}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-white/60">
              <samp>Transcriptions: {transcriptionCount}</samp>
              <span>•</span>
              <span>Language: {getLanguageName(targetLanguage)}</span>
            </div>
          </div>
        </div>

        {/* Translation Display */}
        <div className="apple-card p-6 min-h-[400px]">
          <h2 className="text-lg font-semibold mb-4 tracking-apple-tight">
            Live Translation
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              Error: {error}
            </div>
          )}

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {!enabled ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/20">
                <VolumeX size={48} className="mb-4 opacity-50" />
                <p>Click the volume button to start translation</p>
              </div>
            ) : !lastTranslation ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/40">
                <Loader2 size={48} className="mb-4 opacity-50 animate-spin" />
                <p>Waiting for broadcast...</p>
                <p className="text-sm text-white/20 mt-2">
                  Make sure broadcaster is active
                </p>
              </div>
            ) : (
              <div className="p-6 bg-gradient-to-br from-purple-1/10 to-blue-1/10 rounded-apple border border-purple-1/20 animate-fade-in">
                <div className="flex justify-between text-xs text-white/40 mb-3">
                  <span>{new Date().toLocaleTimeString()}</span>
                  <span className="flex items-center gap-2">
                    {isSpeaking && (
                      <span className="inline-flex items-center gap-1">
                        <Volume2 size={12} className="animate-pulse" />
                        Speaking
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-white font-medium text-xl leading-relaxed">
                  {lastTranslation}
                </p>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-4 bg-dark-3/30 rounded-lg border border-white/5">
          <h3 className="text-sm font-semibold text-white/80 mb-2">
            How it works:
          </h3>
          <ul className="text-xs text-white/50 space-y-1">
            <li>
              • Polls Supabase every 5 seconds for new transcriptions
            </li>
            <li>
              • Translates using Gemini Flash 2.0
            </li>
            <li>
              • Reads aloud in native accent using Web Speech API
            </li>
            <li>
              • TTS queue ensures audio doesn't overlap
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
