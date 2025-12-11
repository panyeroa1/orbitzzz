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
    <div className="min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-1 p-6 text-white">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft size={20} />
            Back to Meeting
          </button>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isActive ? "animate-pulse bg-green-500" : "bg-gray-500"
              )}
            />
            <span className="text-sm font-medium text-white/60">
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="apple-card mb-6 p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-purple-1/20 p-3">
              <Globe size={24} className="text-purple-1" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-apple-tight">
                Eburon Translator
              </h1>
              <p className="text-sm text-white/60">Meeting: {meetingId}</p>
            </div>

            <div className="flex items-center gap-2">
              {isSpeaking && (
                <div className="flex animate-pulse items-center gap-2 rounded-full bg-purple-1/20 px-3 py-1 text-xs font-bold text-purple-1">
                  <Volume2 size={12} /> Speaking
                </div>
              )}
              {queueSize > 0 && (
                <div className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-400">
                  Queue: {queueSize}
                </div>
              )}
              <button
                onClick={() => setEnabled(!enabled)}
                className={cn(
                  "rounded-full p-3 transition-all",
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
              <SelectTrigger className="w-full border-white/10 bg-dark-3">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] border-white/10 bg-dark-1">
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
        <div className="apple-card min-h-[400px] p-6">
          <h2 className="mb-4 text-lg font-semibold tracking-apple-tight">
            Live Translation
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              Error: {error}
            </div>
          )}

          <div className="custom-scrollbar max-h-[500px] space-y-4 overflow-y-auto pr-2">
            {!enabled ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/20">
                <VolumeX size={48} className="mb-4 opacity-50" />
                <p>Click the volume button to start translation</p>
              </div>
            ) : !lastTranslation ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/40">
                <Loader2 size={48} className="mb-4 animate-spin opacity-50" />
                <p>Waiting for broadcast...</p>
                <p className="mt-2 text-sm text-white/20">
                  Make sure broadcaster is active
                </p>
              </div>
            ) : (
              <div className="animate-fade-in rounded-apple border border-purple-1/20 bg-gradient-to-br from-purple-1/10 to-blue-1/10 p-6">
                <div className="mb-3 flex justify-between text-xs text-white/40">
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
                <p className="text-xl font-medium leading-relaxed text-white">
                  {lastTranslation}
                </p>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 rounded-lg border border-white/5 bg-dark-3/30 p-4">
          <h3 className="mb-2 text-sm font-semibold text-white/80">
            How it works:
          </h3>
          <ul className="space-y-1 text-xs text-white/50">
            <li>• Polls Supabase every 5 seconds for new transcriptions</li>
            <li>• Translates using Gemini Flash 2.0</li>
            <li>• Reads aloud in native accent using Web Speech API</li>
            <li>• TTS queue ensures audio doesn&apos;t overlap</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
