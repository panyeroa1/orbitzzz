"use client";

import { useState, useEffect } from "react";
import { useWebSpeech, TranscriptSegment } from "@/hooks/useWebSpeech";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, MicOff, Radio, Trash2 } from "lucide-react";

const LANGUAGES = [
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "es-ES", name: "Spanish" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "it-IT", name: "Italian" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ja-JP", name: "Japanese" },
  { code: "ko-KR", name: "Korean" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "tl-PH", name: "Tagalog (Philippines)" },
];

interface WebSpeechTranscriptionProps {
  sessionId?: string;
  enableBroadcast?: boolean;
  wsUrl?: string;
}

export function WebSpeechTranscription({
  sessionId = "default",
  enableBroadcast = false,
  wsUrl = process.env.NEXT_PUBLIC_WEBSPEECH_WS_URL || "ws://localhost:8001/ws/broadcast",
}: WebSpeechTranscriptionProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [broadcastEnabled, setBroadcastEnabled] = useState(enableBroadcast);
  const [receivedTranscripts, setReceivedTranscripts] = useState<any[]>([]);

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    segments,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setLanguage,
  } = useWebSpeech({
    language: selectedLanguage,
    continuous: true,
    interimResults: true,
  });

  const { isConnected, sendMessage } = useWebSocket({
    url: wsUrl,
    sessionId,
    enabled: broadcastEnabled,
    onMessage: (data) => {
      if (data.type === "history") {
        setReceivedTranscripts(data.messages || []);
      } else if (data.type === "transcription" && data.text) {
        setReceivedTranscripts((prev) => [...prev, data]);
      }
    },
  });

  // Broadcast final segments to WebSocket
  useEffect(() => {
    if (!broadcastEnabled || !isConnected || segments.length === 0) return;

    const lastSegment = segments[segments.length - 1];
    if (lastSegment.isFinal) {
      sendMessage({
        type: "transcription",
        text: lastSegment.text,
        language: lastSegment.language,
        confidence: lastSegment.confidence,
        isFinal: true,
        timestamp: lastSegment.timestamp,
      });
    }
  }, [segments, broadcastEnabled, isConnected, sendMessage]);

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setLanguage(lang);
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleClearTranscript = () => {
    resetTranscript();
    setReceivedTranscripts([]);
  };

  if (!isSupported) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center text-destructive">
          <MicOff className="mr-2 h-5 w-5" />
          <p>
            Web Speech API is not supported in your browser. Please use Chrome or Edge.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Start/Stop Button */}
          <Button
            onClick={handleToggleListening}
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className="gap-2"
          >
            {isListening ? (
              <>
                <MicOff className="h-5 w-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                Start Recording
              </>
            )}
          </Button>

          {/* Language Selector */}
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Broadcast Toggle */}
          <Button
            onClick={() => setBroadcastEnabled(!broadcastEnabled)}
            variant={broadcastEnabled ? "default" : "outline"}
            size="default"
            className="gap-2"
          >
            <Radio className="h-4 w-4" />
            Broadcast: {broadcastEnabled ? "On" : "Off"}
          </Button>

          {/* Clear Button */}
          <Button
            onClick={handleClearTranscript}
            variant="outline"
            size="default"
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>

          {/* Status Indicators */}
          <div className="ml-auto flex items-center gap-4 text-sm">
            {isListening && (
              <div className="flex items-center gap-2 text-green-600">
                <div className="h-3 w-3 animate-pulse rounded-full bg-green-600" />
                Listening
              </div>
            )}
            {broadcastEnabled && (
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isConnected ? "bg-green-600" : "bg-red-600"
                  }`}
                />
                {isConnected ? "Connected" : "Disconnected"}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </Card>

      {/* Live Transcription */}
      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold">Live Transcription</h3>
        <div className="min-h-[100px] rounded-md bg-muted p-4">
          <p className="text-base leading-relaxed">
            {transcript}
            {interimTranscript && (
              <span className="italic opacity-60">{interimTranscript}</span>
            )}
            {!transcript && !interimTranscript && (
              <span className="text-muted-foreground">
                {isListening
                  ? "Listening... Start speaking."
                  : "Click 'Start Recording' to begin."}
              </span>
            )}
          </p>
        </div>
      </Card>

      {/* Transcript History */}
      {segments.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold">Transcript History</h3>
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {segments.map((segment, index) => (
              <div
                key={index}
                className="rounded-md border p-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1">{segment.text}</p>
                  <div className="text-xs text-muted-foreground">
                    {segment.confidence &&
                      `${Math.round(segment.confidence * 100)}%`}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(segment.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Received Broadcasts */}
      {broadcastEnabled && receivedTranscripts.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold">
            Received Broadcasts (Session: {sessionId})
          </h3>
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {receivedTranscripts.map((msg, index) => (
              <div
                key={index}
                className="rounded-md border border-blue-200 bg-blue-50 p-2 text-sm dark:border-blue-800 dark:bg-blue-950"
              >
                <p>{msg.text}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{msg.language}</span>
                  {msg.timestamp && (
                    <span>• {new Date(msg.timestamp).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
