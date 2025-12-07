"use client";

import { useState } from "react";
import { Mic, Globe, Zap, Shield } from "lucide-react";

export default function DocsPage() {
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");

  const SUPPORTED_LANGUAGES = [
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
    { code: "tl-PH", name: "Tagalog" },
  ];

  return (
    <section className="flex size-full flex-col gap-6 text-white px-4 py-6 sm:px-6 sm:gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-apple-tight">Live Transcription</h1>
        <p className="text-sm sm:text-base text-white/60 tracking-apple-normal">
          Real-time speech-to-text powered by Web Speech API - works everywhere, no server required.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="apple-card p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-1/20 rounded-apple">
              <Globe size={20} className="text-purple-1" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg">Works in Production</h3>
          </div>
          <p className="text-sm text-white/60">
            No backend server required. Runs entirely in the browser using the Web Speech API.
          </p>
        </div>

        <div className="apple-card p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-apple">
              <Zap size={20} className="text-green-500" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg">Real-time</h3>
          </div>
          <p className="text-sm text-white/60">
            Instant transcription with interim results as you speak. Low latency and highly accurate.
          </p>
        </div>

        <div className="apple-card p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-apple">
              <Mic size={20} className="text-blue-500" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg">Multi-language</h3>
          </div>
          <p className="text-sm text-white/60">
            Support for 10+ languages including English, Spanish, French, German, Japanese, and more.
          </p>
        </div>

        <div className="apple-card p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/20 rounded-apple">
              <Shield size={20} className="text-orange-500" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg">Privacy First</h3>
          </div>
          <p className="text-sm text-white/60">
            Audio processed locally in your browser. No data sent to external servers.
          </p>
        </div>
      </div>

      {/* Supported Languages */}
      <div className="apple-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold tracking-apple-tight mb-4">Supported Languages</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              className={`p-3 rounded-apple border transition-all cursor-pointer ${
                selectedLanguage === lang.code
                  ? "bg-purple-1/20 border-purple-1"
                  : "bg-dark-3/50 border-white/5 hover:border-white/10"
              }`}
              onClick={() => setSelectedLanguage(lang.code)}
            >
              <div className="text-sm font-medium">{lang.name}</div>
              <div className="text-xs text-white/40 mt-1">{lang.code}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How to Use */}
      <div className="apple-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold tracking-apple-tight mb-4">How to Use</h2>
        
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-1 flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <h3 className="text-white/90 font-medium mb-1 text-sm sm:text-base">Join a Meeting</h3>
              <p className="text-xs sm:text-sm text-white/60">
                Start or join any video meeting in Orbitzzz.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-1 flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <h3 className="text-white/90 font-medium mb-1 text-sm sm:text-base">Enable Transcription</h3>
              <p className="text-xs sm:text-sm text-white/60">
                Click the message icon in the meeting controls to start live transcription.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-1 flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <h3 className="text-white/90 font-medium mb-1 text-sm sm:text-base">View Transcript</h3>
              <p className="text-xs sm:text-sm text-white/60">
                See real-time captions on screen and access the full transcript panel.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Browser Support */}
      <div className="apple-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold tracking-apple-tight mb-4">Browser Support</h2>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 bg-dark-3/50 rounded-apple">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🌐</div>
              <span className="text-sm sm:text-base">Chrome / Edge</span>
            </div>
            <span className="text-green-500 text-xs sm:text-sm font-medium">✓ Fully Supported</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-dark-3/50 rounded-apple">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🧭</div>
              <span className="text-sm sm:text-base">Safari (iOS 14.5+)</span>
            </div>
            <span className="text-green-500 text-xs sm:text-sm font-medium">✓ Supported</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-dark-3/50 rounded-apple">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🦊</div>
              <span className="text-sm sm:text-base">Firefox</span>
            </div>
            <span className="text-orange-500 text-xs sm:text-sm font-medium">⚠ Limited Support</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-apple">
          <p className="text-xs sm:text-sm text-blue-400">
            💡 <strong>Note:</strong> HTTPS is required in production. Localhost works for development.
          </p>
        </div>
      </div>
    </section>
  );
}
