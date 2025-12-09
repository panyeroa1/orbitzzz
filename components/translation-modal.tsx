"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { useTranslationPlayback } from "@/hooks/useTranslationPlayback";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TranslationModalProps {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LANGUAGES = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "tl", label: "Tagalog" },
];

export function TranslationModal({ meetingId, open, onOpenChange }: TranslationModalProps) {
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [isEnabled, setIsEnabled] = useState(false);
  const { history, status, isPlaying } = useTranslationPlayback({
    meetingId,
    targetLanguage,
    enabled: open && isEnabled,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Live Translation & Read-Aloud
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Language Selector & Start Button */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Target Language:</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-700 bg-gray-900 text-white"
              aria-label="Select target language"
              disabled={isEnabled}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
            
            {/* Start/Stop Button */}
            {!isEnabled ? (
              <button
                onClick={() => setIsEnabled(true)}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                Start Translation
              </button>
            ) : (
              <button
                onClick={() => setIsEnabled(false)}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
              >
                Stop
              </button>
            )}
            
            <div className="ml-auto flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                status === "connected" ? "bg-green-500" : 
                status === "error" ? "bg-red-500" : "bg-yellow-500"
              }`} />
              <span className="text-sm text-gray-400">{status}</span>
              {isPlaying && <span className="text-xs text-blue-400">🔊 Speaking...</span>}
            </div>
          </div>

          {/* Transcript History */}
          <div className="flex-1 overflow-y-auto border border-gray-700 rounded-md p-4 bg-gray-900/50 space-y-3">
            {history.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Waiting for transcriptions...
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="border-b border-gray-800 pb-3 last:border-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                    {item.speaker && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300">
                        {item.speaker}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-300 mb-1">
                    <span className="font-medium text-gray-400">Original:</span> {item.original}
                  </div>
                  <div className="text-sm text-white">
                    <span className="font-medium text-blue-400">Translation:</span>{" "}
                    {item.translated || "..."}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-xs text-gray-500 text-center">
            Translations are automatically read aloud using Text-to-Speech
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
