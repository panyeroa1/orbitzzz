"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Mic, MicOff, Globe, Zap } from "lucide-react";
import { useWebSpeech } from "@/hooks/useWebSpeech";

const IntegrationsPage = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Web Speech API for transcription
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

  // Auto-scroll to latest transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [segments]);

  // Toggle recording
  const toggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Clear transcription
  const clearTranscription = () => {
    resetTranscript();
  };

  // Change language
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setLanguage(lang);
  };

  const SUPPORTED_LANGUAGES = [
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

  return (
    <section className="flex size-full flex-col gap-8 text-white animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-apple-tight">Integrations</h1>
        <p className="text-white/60">Test and configure real-time transcription powered by Web Speech API</p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="apple-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-1/20 rounded-apple">
              <Globe size={20} className="text-purple-1" />
            </div>
            <h3 className="font-semibold text-lg">Browser-based</h3>
          </div>
          <p className="text-sm text-white/60">
            No server required. Runs entirely in your browser using native Web Speech API.
          </p>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-apple">
              <Zap size={20} className="text-green-500" />
            </div>
            <h3 className="font-semibold text-lg">Real-time</h3>
          </div>
          <p className="text-sm text-white/60">
            Instant transcription with low latency. See results as you speak.
          </p>
        </div>
      </div>

      {/* Browser Support Status */}
      <div className="apple-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-apple bg-gradient-to-br from-purple-1 to-blue-1">
              <Mic size={24} />
            </div>
            <div className="flex flex-col">
              <p className="text-lg font-semibold tracking-apple-tight">Web Speech API</p>
              <p className="text-sm text-white/50 tracking-apple-normal">Real-time Transcription</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`size-2.5 rounded-full ${isSupported ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <p className={`text-sm font-medium ${isSupported ? 'text-green-400' : 'text-red-400'}`}>
              {isSupported ? 'Supported' : 'Not Supported'}
            </p>
          </div>
        </div>
        
        {!isSupported && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-apple">
            <p className="text-sm text-red-400">
              Your browser doesn't support Web Speech API. Please use Chrome, Edge, or Safari.
            </p>
          </div>
        )}
      </div>

      {/* Language Selection */}
      <div className="apple-card p-5">
        <h2 className="text-xl font-semibold tracking-apple-tight mb-4">Select Language</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              disabled={!isSupported}
              className={`p-3 rounded-apple border transition-all ${
                selectedLanguage === lang.code
                  ? "bg-purple-1/20 border-purple-1"
                  : "bg-dark-3/50 border-white/5 hover:border-white/10"
              } ${!isSupported ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="text-2xl mb-1">{lang.flag}</div>
              <div className="text-xs font-medium truncate">{lang.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Live Transcription Section */}
      <div className="apple-card p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-apple-tight">Live Transcription Test</h2>
          
          <div className="flex items-center gap-3">
            {segments.length > 0 && (
              <button
                onClick={clearTranscription}
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
          <div className="flex items-center gap-2 text-red-400">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium">Listening...</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-apple">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Interim transcript (live preview) */}
        {interimTranscript && (
          <div className="p-3 bg-blue-500/20 rounded-apple">
            <p className="text-white/70 italic text-sm">{interimTranscript}</p>
          </div>
        )}

        {/* Transcription output */}
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto bg-dark-3/50 rounded-apple p-4 border border-white/5">
          {segments.length === 0 ? (
            <p className="text-white/30 text-center py-8">
              {isSupported 
                ? "Click 'Start Recording' to begin live transcription" 
                : "Web Speech API is not supported in your browser"}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {segments.map((segment, index) => (
                <div 
                  key={index} 
                  className="p-3 bg-dark-4/50 rounded-apple animate-slide-up"
                >
                  <p className="text-white/90 leading-relaxed">{segment.text}</p>
                  <div className="flex items-center justify-between mt-1 text-xs text-white/40">
                    <span>{new Date(segment.timestamp).toLocaleTimeString()}</span>
                    {segment.confidence && (
                      <span>{Math.round(segment.confidence * 100)}% confident</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-white/40 space-y-1">
          <p>• Works in Chrome, Edge, and Safari (requires HTTPS in production)</p>
          <p>• Speak clearly in the selected language for best results</p>
          <p>• Real-time transcription appears as you speak</p>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsPage;
