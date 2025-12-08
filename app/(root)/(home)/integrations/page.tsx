"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Mic, MicOff, Loader2, CheckCircle, Info } from "lucide-react";
import { useWebSpeech } from "@/hooks/useWebSpeech";

const IntegrationsPage = () => {
  const [detectedLanguage, setDetectedLanguage] = useState<string>("en-US");
  
  const {
    isListening,
    startListening,
    stopListening,
    segments,
    interimTranscript,
    isSupported,
    error,
    resetTranscript
  } = useWebSpeech({
    language: detectedLanguage,
    continuous: true,
    interimResults: true,
  });

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

  return (
    <section className="flex size-full flex-col gap-8 text-white animate-fade-in">
      <h1 className="text-3xl font-semibold tracking-apple-tight">Integrations</h1>

      {/* Connection Status Card */}
      <div className="apple-card flex w-full items-center justify-between p-5 sm:max-w-[400px]">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-apple bg-gradient-to-br from-purple-1 to-blue-1">
            <Image 
              src="/icons/add-personal.svg"
              alt="Eburon Speech"
              width={24}
              height={24}
            />
          </div>
          <div className="flex flex-col">
            <p className="text-lg font-semibold tracking-apple-tight">Eburon Speech</p>
            <p className="text-sm text-white/50 tracking-apple-normal">Browser-based Recognition</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isSupported ? (
            <>
              <CheckCircle size={16} className="text-green-400" />
              <p className="text-sm font-medium text-green-400">Available</p>
            </>
          ) : (
            <>
              <Info size={16} className="text-yellow-400" />
              <p className="text-sm font-medium text-yellow-400">Not Supported</p>
            </>
          )}
        </div>
      </div>

      {/* Live Transcription Section */}
      <div className="apple-card p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-apple-tight">Live Transcription</h2>
          
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

        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-apple text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Transcription output */}
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto bg-dark-3/50 rounded-apple p-4 border border-white/5">
          {segments.length === 0 && !interimTranscript ? (
            <p className="text-white/30 text-center py-8">
              {isSupported 
                ? "Click 'Start Recording' to begin live transcription" 
                : "Web Speech API is not supported in this browser. Please use Chrome."}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {segments.map((segment, index) => (
                <div 
                  key={index} 
                  className="p-3 bg-dark-4/50 rounded-apple animate-slide-up"
                >
                  <p className="text-white/90 leading-relaxed">{segment.text}</p>
                  <p className="text-xs text-white/30 mt-1">{segment.timestamp}</p>
                </div>
              ))}
              {interimTranscript && (
                <div className="flex items-center gap-2 text-white/50 p-3">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm italic">{interimTranscript}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-white/40 space-y-1">
          <p>• Uses your browser's built-in speech recognition (no server required)</p>
          <p>• Works best in Chrome for maximum language support</p>
          <p>• Speak clearly for best transcription results</p>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsPage;
