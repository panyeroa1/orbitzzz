"use client";

import { useState, useEffect } from "react";
import { Copy, Key, Plus, ExternalLink, Check } from "lucide-react";

interface APIKey {
  key_preview: string;
  name: string;
  description: string | null;
  created_at: string;
  last_used: string | null;
  requests: number;
}

const WHISPER_URL = process.env.NEXT_PUBLIC_WHISPER_SERVER_URL || "http://localhost:8000";

export default function DocsPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDescription, setNewKeyDescription] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch(`${WHISPER_URL}/api/keys`);
      const data = await res.json();
      setApiKeys(data.keys || []);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${WHISPER_URL}/api/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          description: newKeyDescription || null
        })
      });
      const data = await res.json();
      setCreatedKey(data.api_key);
      setNewKeyName("");
      setNewKeyDescription("");
      fetchApiKeys();
    } catch (error) {
      console.error("Failed to create API key:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="flex size-full flex-col gap-6 text-white px-4 py-6 sm:px-6 sm:gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-apple-tight">Eburon STT API</h1>
        <p className="text-sm sm:text-base text-white/60 tracking-apple-normal">
          Generate API keys for real-time speech-to-text transcription.
        </p>
      </div>

      {/* Create API Key Section */}
      <div className="apple-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold tracking-apple-tight mb-4 flex items-center gap-2">
          <Key size={18} className="text-purple-1" />
          Create New API Key
        </h2>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60">Key Name *</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="My Application"
              className="bg-dark-3 border border-white/10 rounded-apple px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-1/50 transition-colors text-sm sm:text-base"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60">Description (optional)</label>
            <input
              type="text"
              value={newKeyDescription}
              onChange={(e) => setNewKeyDescription(e.target.value)}
              placeholder="Used for mobile app"
              className="bg-dark-3 border border-white/10 rounded-apple px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-1/50 transition-colors text-sm sm:text-base"
            />
          </div>

          <button
            onClick={createApiKey}
            disabled={!newKeyName.trim() || loading}
            className="flex items-center justify-center gap-2 bg-purple-1 hover:bg-purple-1/90 disabled:bg-purple-1/50 text-white font-medium py-3 px-6 rounded-apple transition-all duration-apple text-sm sm:text-base"
          >
            <Plus size={18} />
            {loading ? "Creating..." : "Create API Key"}
          </button>
        </div>

        {/* Show newly created key */}
        {createdKey && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-apple">
            <p className="text-green-400 text-xs sm:text-sm mb-2 font-medium">
              ✓ API Key Created! Copy it now - you won&apos;t see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-dark-3 px-3 py-2 rounded text-xs sm:text-sm font-mono text-white/90 overflow-x-auto break-all">
                {createdKey}
              </code>
              <button
                onClick={() => copyToClipboard(createdKey)}
                className="p-2 bg-dark-3 hover:bg-dark-4 rounded-apple transition-colors shrink-0"
                title="Copy API key"
              >
                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* API Keys List */}
      <div className="apple-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold tracking-apple-tight mb-4">Your API Keys</h2>
        
        {apiKeys.length === 0 ? (
          <p className="text-white/40 text-center py-6 sm:py-8 text-sm">No API keys yet. Create one above.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {apiKeys.map((key, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-dark-3/50 rounded-apple border border-white/5 gap-2 sm:gap-4"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-medium text-sm sm:text-base">{key.name}</span>
                  <span className="text-xs sm:text-sm text-white/40 font-mono truncate">{key.key_preview}</span>
                  {key.description && (
                    <span className="text-xs sm:text-sm text-white/50 truncate">{key.description}</span>
                  )}
                </div>
                <div className="flex items-center text-xs sm:text-sm text-white/40 shrink-0">
                  <span>{key.requests} requests</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Start Guide */}
      <div className="apple-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold tracking-apple-tight mb-4">Quick Start</h2>
        
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-white/80 font-medium mb-2 text-sm sm:text-base">WebSocket Connection</h3>
            <code className="block bg-dark-3 p-3 sm:p-4 rounded-apple text-xs sm:text-sm font-mono text-white/80 overflow-x-auto break-all">
              ws://{WHISPER_URL.replace("http://", "").replace("https://", "")}/ws/transcribe?api_key=YOUR_KEY
            </code>
          </div>

          <div>
            <h3 className="text-white/80 font-medium mb-2 text-sm sm:text-base">JavaScript Example</h3>
            <pre className="bg-dark-3 p-3 sm:p-4 rounded-apple text-xs sm:text-sm font-mono text-white/80 overflow-x-auto">
{`const ws = new WebSocket(
  "${WHISPER_URL.replace("http", "ws")}/ws/transcribe?api_key=KEY"
);

ws.send(audioBlob);
ws.onmessage = (e) => console.log(e.data);`}
            </pre>
          </div>

          <a
            href={`${WHISPER_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-purple-1 hover:text-purple-1/80 transition-colors text-sm sm:text-base"
          >
            <ExternalLink size={16} />
            View Full API Documentation
          </a>
        </div>
      </div>
    </section>
  );
}
