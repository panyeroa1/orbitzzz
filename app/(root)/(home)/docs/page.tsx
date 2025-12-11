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
    <section className="flex size-full flex-col gap-6 px-4 py-6 text-white sm:gap-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-apple-tight sm:text-3xl">
          Live Transcription
        </h1>
        <p className="text-sm tracking-apple-normal text-white/60 sm:text-base">
          Real-time speech-to-text powered by Web Speech API - works everywhere,
          no server required.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="apple-card p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-apple bg-purple-1/20 p-2">
              <Globe size={20} className="text-purple-1" />
            </div>
            <h3 className="text-base font-semibold sm:text-lg">
              Works in Production
            </h3>
          </div>
          <p className="text-sm text-white/60">
            No backend server required. Runs entirely in the browser using the
            Web Speech API.
          </p>
        </div>

        <div className="apple-card p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-apple bg-green-500/20 p-2">
              <Zap size={20} className="text-green-500" />
            </div>
            <h3 className="text-base font-semibold sm:text-lg">Real-time</h3>
          </div>
          <p className="text-sm text-white/60">
            Instant transcription with interim results as you speak. Low latency
            and highly accurate.
          </p>
        </div>

        <div className="apple-card p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-apple bg-blue-500/20 p-2">
              <Mic size={20} className="text-blue-500" />
            </div>
            <h3 className="text-base font-semibold sm:text-lg">
              Multi-language
            </h3>
          </div>
          <p className="text-sm text-white/60">
            Support for 10+ languages including English, Spanish, French,
            German, Japanese, and more.
          </p>
        </div>

        <div className="apple-card p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-apple bg-orange-500/20 p-2">
              <Shield size={20} className="text-orange-500" />
            </div>
            <h3 className="text-base font-semibold sm:text-lg">
              Privacy First
            </h3>
          </div>
          <p className="text-sm text-white/60">
            Audio processed locally in your browser. No data sent to external
            servers.
          </p>
        </div>
      </div>

      {/* Supported Languages */}
      <div className="apple-card p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-apple-tight sm:text-xl">
          Supported Languages
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              className={`cursor-pointer rounded-apple border p-3 transition-all ${
                selectedLanguage === lang.code
                  ? "border-purple-1 bg-purple-1/20"
                  : "border-white/5 bg-dark-3/50 hover:border-white/10"
              }`}
              onClick={() => setSelectedLanguage(lang.code)}
            >
              <div className="text-sm font-medium">{lang.name}</div>
              <div className="mt-1 text-xs text-white/40">{lang.code}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How to Use */}
      <div className="apple-card p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-apple-tight sm:text-xl">
          How to Use
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-1 text-sm font-bold">
              1
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium text-white/90 sm:text-base">
                Join a Meeting
              </h3>
              <p className="text-xs text-white/60 sm:text-sm">
                Start or join any video meeting in Orbitzzz.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-1 text-sm font-bold">
              2
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium text-white/90 sm:text-base">
                Enable Transcription
              </h3>
              <p className="text-xs text-white/60 sm:text-sm">
                Click the message icon in the meeting controls to start live
                transcription.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-1 text-sm font-bold">
              3
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium text-white/90 sm:text-base">
                View Transcript
              </h3>
              <p className="text-xs text-white/60 sm:text-sm">
                See real-time captions on screen and access the full transcript
                panel.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Browser Support */}
      <div className="apple-card p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-apple-tight sm:text-xl">
          Browser Support
        </h2>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-apple bg-dark-3/50 p-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🌐</div>
              <span className="text-sm sm:text-base">Chrome / Edge</span>
            </div>
            <span className="text-xs font-medium text-green-500 sm:text-sm">
              ✓ Fully Supported
            </span>
          </div>

          <div className="flex items-center justify-between rounded-apple bg-dark-3/50 p-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🧭</div>
              <span className="text-sm sm:text-base">Safari (iOS 14.5+)</span>
            </div>
            <span className="text-xs font-medium text-green-500 sm:text-sm">
              ✓ Supported
            </span>
          </div>

          <div className="flex items-center justify-between rounded-apple bg-dark-3/50 p-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🦊</div>
              <span className="text-sm sm:text-base">Firefox</span>
            </div>
            <span className="text-xs font-medium text-orange-500 sm:text-sm">
              ⚠ Limited Support
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-apple border border-blue-500/30 bg-blue-500/10 p-3">
          <p className="text-xs text-blue-400 sm:text-sm">
            💡 <strong>Note:</strong> HTTPS is required in production. Localhost
            works for development.
          </p>
        </div>
      </div>
    </section>
  );
}
