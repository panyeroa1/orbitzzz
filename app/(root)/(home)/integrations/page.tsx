"use client";

import { useState } from "react";
import { Mic, MicOff, CheckCircle2, XCircle } from "lucide-react";
import { useDeepgramTranscription } from "@/hooks/useDeepgramTranscription";
import { getSpeakerLabel, getSpeakerColor } from "@/lib/speaker-utils";


const IntegrationsPage = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("");
  
  // Get Deepgram API key from environment
  const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || "";
  
  // Primary: Eburon Deep Speech
  const deepgram = useDeepgramTranscription({
    apiKey: deepgramApiKey,
    language: selectedLanguage || "auto",
    enableFallback: true,
    meetingId: "integration-test",
  });

  // Fallback: Web Speech API (Removed)
  // Only using Deepgram now
  const transcriptionService = deepgram;

  const {
    isListening,
    transcript,
    interimTranscript,
    segments,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = transcriptionService;

  const detectedLanguage = deepgram.detectedLanguage;

  const isSupported = true; // Deepgram is supported via WebSocket

  const LANGUAGES = [
    { code: "", name: "Auto-Detect", flag: "🌍" },
    { code: "en-US", name: "English (US)", flag: "🇺🇸" },
    { code: "en-GB", name: "English (UK)", flag: "🇬🇧" },
    { code: "es-ES", name: "Spanish", flag: "🇪🇸" },
    { code: "fr-FR", name: "French", flag: "🇫🇷" },
    { code: "de-DE", name: "German", flag: "🇩🇪" },
    { code: "it-IT", name: "Italian", flag: "🇮🇹" },
    { code: "pt-BR", name: "Portuguese", flag: "🇧🇷" },
    { code: "ja-JP", name: "Japanese", flag: "🇯🇵" },
    { code: "ko-KR", name: "Korean", flag: "🇰🇷" },
    { code: "zh-CN", name: "Chinese", flag: "🇨🇳" },
  ];

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setSelectedLanguage(lang);
  };

  const toggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <section className="flex size-full flex-col gap-8 text-white animate-fade-in">
      <h1 className="text-3xl font-semibold tracking-apple-tight">Integrations</h1>

      {/* Connection Status Card - Primary Service */}
      <div className="apple-card flex w-full items-center justify-between p-5 sm:max-w-[500px]">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-apple bg-gradient-to-br from-purple-1 to-blue-1">
            <Mic size={24} className="text-white" />
          </div>
          <div className="flex flex-col">
            <p className="text-lg font-semibold tracking-apple-tight">
              🎙️ Eburon Deep Speech
            </p>
            <p className="text-sm text-white/50 tracking-apple-normal">
              AI-Powered Transcription with Auto Language Detection
            </p>
            {detectedLanguage && (
              <p className="text-xs text-blue-400 mt-1">
                Detected: {detectedLanguage.toUpperCase()}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isSupported ? (
            <>
              <CheckCircle2 size={20} className="text-green-500" />
              <p className="text-sm font-medium text-green-400">Active</p>
            </>
          ) : (
            <>
              <XCircle size={20} className="text-red-500" />
              <p className="text-sm font-medium text-red-400">Not Available</p>
            </>
          )}
        </div>
      </div>

      {/* Language Selection */}
      <div className="apple-card p-6">
        <h2 className="text-xl font-semibold tracking-apple-tight mb-4">Transcription Language</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`p-3 rounded-apple border transition-all ${
                selectedLanguage === lang.code
                  ? "bg-purple-1/20 border-purple-1"
                  : "bg-dark-3/50 border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{lang.flag}</span>
                <div className="text-sm font-medium">{lang.name}</div>
              </div>
              {lang.code && <div className="text-xs text-white/40 mt-1">{lang.code}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Live Transcription Section */}
      <div className="apple-card p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-apple-tight">Live Transcription</h2>
          
          <div className="flex items-center gap-3">
            {segments.length > 0 && (
              <button
                onClick={resetTranscript}
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
            
            <button
              onClick={toggleRecording}
              disabled={!isSupported}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-apple font-medium transition-all duration-apple ${
                isListening 
                  ? "bg-red-500 hover:bg-red-600 text-white" 
                  : isSupported
                    ? "bg-purple-1 hover:bg-purple-1/90 text-white"
                    : "bg-dark-3 text-white/30 cursor-not-allowed"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff size={18} />
                  Stop
                </>
              ) : (
                <>
                  <Mic size={18} />
                  Start Recording
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recording indicator */}
        {isListening && (
          <div className="flex items-center gap-2 text-green-400">
            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Listening...</span>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-apple text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Transcription output */}
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto bg-dark-3/50 rounded-apple p-4 border border-white/5">
          {segments.length === 0 && !interimTranscript ? (
            <p className="text-white/30 text-center py-8">
              {isSupported
                ? `Click 'Start Recording' to begin live transcription with Eburon Deep Speech` 
                : "Transcription is not available. Please check your browser or API configuration."}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {segments.map((segment, index) => (
                <div 
                  key={index} 
                  className="p-3 bg-dark-4/50 rounded-apple animate-slide-up"
                >
                  <p className="text-white/90 leading-relaxed">{segment.text}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                    <div className="flex items-center gap-2">
                      <span>{new Date(segment.timestamp).toLocaleTimeString()}</span>
                      {segment.speaker !== undefined && (
                        <span 
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: getSpeakerColor(segment.speaker) + '20',
                            color: getSpeakerColor(segment.speaker),
                            border: `1px solid ${getSpeakerColor(segment.speaker)}40`
                          }}
                        >
                          👤 {getSpeakerLabel(segment.speaker)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {segment.language && (
                        <span className="text-blue-400">{segment.language.toUpperCase()}</span>
                      )}
                      {segment.confidence && (
                        <span>{Math.round(segment.confidence * 100)}% confident</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {interimTranscript && (
                <div className="p-3 bg-blue-500/10 rounded-apple">
                  <p className="text-white/70 leading-relaxed italic">{interimTranscript}</p>
                  <span className="text-xs text-white/40">Speaking...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-white/40 space-y-1">
          <p>• Powered by Eburon Deep Speech AI for accurate transcription</p>
          <p>• Automatic language detection for 30+ languages</p>
          <p>• Speak clearly for best transcription results</p>
          <p>• Transcription happens in real-time as you speak</p>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsPage;
