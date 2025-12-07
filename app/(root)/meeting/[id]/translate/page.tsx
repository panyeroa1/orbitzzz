"use client";

import { useRouter } from "next/navigation";
import { use, useState, useRef, useEffect } from "react";
import { Globe, Volume2, VolumeX, ArrowLeft, Loader2, Mic, MicOff, Monitor, Laptop } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWebSpeech } from "@/hooks/useWebSpeech"; 
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "af", name: "Afrikaans" },
  { code: "ar", name: "Arabic" },
  { code: "bn", name: "Bengali" },
  { code: "bg", name: "Bulgarian" },
  { code: "ca", name: "Catalan" },
  { code: "zh", name: "Chinese (Mandarin)" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "en", name: "English" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "gu", name: "Gujarati" },
  { code: "hi", name: "Hindi" },
  { code: "hu", name: "Hungarian" },
  { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "kn", name: "Kannada" },
  { code: "ko", name: "Korean" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "ms", name: "Malay" },
  { code: "ml", name: "Malayalam" },
  { code: "mr", name: "Marathi" },
  { code: "no", name: "Norwegian" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "sr", name: "Serbian" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "es", name: "Spanish" },
  { code: "sw", name: "Swahili" },
  { code: "sv", name: "Swedish" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "th", name: "Thai" },
  { code: "tl", name: "Tagalog (Filipino)" },
  { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },
  { code: "ur", name: "Urdu" },
  { code: "vi", name: "Vietnamese" },
].sort((a, b) => a.name.localeCompare(b.name));

type TranslatePageProps = {
  params: Promise<{ id: string }>;
};

// Helper: Float32 to Int16 PCM
function floatTo16BitPCM(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output.buffer;
}

export default function TranslatePage({ params }: TranslatePageProps) {
  const { id: meetingId } = use(params);
  const router = useRouter();

  const [targetLanguage, setTargetLanguage] = useState("es");
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ original: string; translated: string; language: string }>>([]);
  const [currentOriginal, setCurrentOriginal] = useState("");
  const [currentTranslated, setCurrentTranslated] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Audio Source: 'mic' | 'system'
  const [audioSource, setAudioSource] = useState<"mic" | "system">("mic");
  const [systemAudioStatus, setSystemAudioStatus] = useState<"idle" | "connected" | "error">("idle");

  // --- Web Speech (Mic) ---
  const {
    isListening: isMicListening,
    startListening: startMic,
    stopListening: stopMic,
    segments,
    interimTranscript,
    isSupported,
    error: webSpeechError
  } = useWebSpeech({
    language: "en-US",
    continuous: true,
    interimResults: true,
  });

  // --- System Audio Logic ---
  const systemWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startSystemAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            sampleRate: 16000,
        }
      });
      
      streamRef.current = stream;

      // Detect if user shared audio
      if (stream.getAudioTracks().length === 0) {
        alert("No audio track detected. Please share a Tab/Screen with 'Share system audio' checked.");
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      // Initialize Audio Context (16kHz for Gemini)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Connect to Gemini Backend with Target Language
      const langName = LANGUAGES.find(l => l.code === targetLanguage)?.name || "Spanish";
      // Encode language safely
      const wsUrl = `ws://localhost:8000?lang=${encodeURIComponent(langName)}`;
      const ws = new WebSocket(wsUrl); 
      systemWsRef.current = ws;

      ws.onopen = () => {
        console.log("Connected to System Audio Translation backend");
        setSystemAudioStatus("connected");
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'audio') {
            // Decode Base64 to Binary
            const binaryString = window.atob(msg.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create WAV header for PCM data (16-bit, 24kHz/16kHz mono - adjust as needed)
            // Gemini Live typically returns 24kHz, 16-bit PCM
            const sampleRate = 24000;
            const numChannels = 1;
            const bitsPerSample = 16;
            const byteRate = sampleRate * numChannels * bitsPerSample / 8;
            const blockAlign = numChannels * bitsPerSample / 8;
            const dataSize = bytes.length;
            const wavHeaderSize = 44;
            const wavBuffer = new ArrayBuffer(wavHeaderSize + dataSize);
            const view = new DataView(wavBuffer);
            
            // RIFF header
            view.setUint32(0, 0x52494646, false); // "RIFF"
            view.setUint32(4, 36 + dataSize, true); // file size - 8
            view.setUint32(8, 0x57415645, false); // "WAVE"
            // fmt subchunk
            view.setUint32(12, 0x666d7420, false); // "fmt "
            view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
            view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, byteRate, true);
            view.setUint16(32, blockAlign, true);
            view.setUint16(34, bitsPerSample, true);
            // data subchunk
            view.setUint32(36, 0x64617461, false); // "data"
            view.setUint32(40, dataSize, true);
            
            // Copy PCM data
            const wavBytes = new Uint8Array(wavBuffer);
            wavBytes.set(bytes, wavHeaderSize);
            
            // Create Blob and queue for playback
            const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            if (autoSpeak) {
              audioQueueRef.current.push(audioUrl);
              if (!isPlayingRef.current) {
                playNext();
              }
            }
            
            setCurrentTranslated("(Playing Translation...)");
          } else if (msg.type === 'error') {
            console.error("Backend Error:", msg.message);
          }
        } catch (e) {
            console.error("WS Message Error", e);
        }
      };
      
      ws.onerror = (e) => {
          console.error("WS Error", e);
          setSystemAudioStatus("error");
      };

      ws.onclose = () => {
          setSystemAudioStatus("idle");
      };

      // Stream Audio to Backend
      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = floatTo16BitPCM(inputData);
          ws.send(pcm16);
        }
      };

      // Handle stream stop (user clicks "Stop sharing" in browser UI)
      stream.getVideoTracks()[0].onended = () => {
        stopSystemAudio();
      };

    } catch (err) {
      console.error("System Audio Setup Error:", err);
      setSystemAudioStatus("error");
    }
  };

  const stopSystemAudio = () => {
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
    }
    if (systemWsRef.current) {
        systemWsRef.current.close();
    }
    setSystemAudioStatus("idle");
  };

  const toggleListening = () => {
    if (audioSource === 'mic') {
        if (isMicListening) stopMic();
        else startMic();
    } else {
        if (systemAudioStatus === 'connected') stopSystemAudio();
        else startSystemAudio();
    }
  };

  // --- Effects for Mic Logic (Existing) ---
  // Audio Queue
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Function to process queue
  const playNext = () => {
    if (audioQueueRef.current.length === 0) {
        isPlayingRef.current = false;
        return;
    }

    isPlayingRef.current = true;
    const audioUrl = audioQueueRef.current.shift();
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.onended = () => {
        playNext();
    };
    audio.onerror = (e) => {
        console.error("Audio Playback Error:", e);
        playNext();
    };
    
    audio.play().catch(e => {
        console.error("Audio Play Promise Error:", e);
        playNext();
    });
  };

  // Auto-scroll transcript
  const processedSegmentCount = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptHistory, interimTranscript]);

  // Process new segments
  useEffect(() => {
    const processSegments = async () => {
      // Check if we have new FINAL segments
      if (segments.length > processedSegmentCount.current) {
        const newSegment = segments[processedSegmentCount.current];
        processedSegmentCount.current = segments.length; // Update pointer

        if (!newSegment || !newSegment.text.trim()) return;

        setCurrentOriginal(newSegment.text);
        setProcessing(true);

        try {
          // Call Gemini API
          const response = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: newSegment.text,
              targetLanguage: LANGUAGES.find(l => l.code === targetLanguage)?.name || "Spanish",
            }),
          });

          if (!response.ok) throw new Error("Translation failed");

          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          
          const translatedTextDisplay = "(Audio Queued...)";

          setTranscriptHistory(prev => [
            ...prev,
            {
              original: newSegment.text,
              translated: "(Audio playing...)", 
              language: "en", 
            }
          ]);
          
          setCurrentTranslated(translatedTextDisplay);

          if (autoSpeak) {
            audioQueueRef.current.push(audioUrl);
            if (!isPlayingRef.current) {
                playNext();
            }
          }
          
        } catch (err) {
          console.error("Translation Error:", err);
        } finally {
          setProcessing(false);
          // Clear "current" display after a delay
          setTimeout(() => {
             if (currentOriginal === newSegment.text) setCurrentOriginal("");
             if (currentTranslated === "(Audio Queued...)") setCurrentTranslated("");
          }, 5000);
        }
      }
    };

    processSegments();
  }, [segments, targetLanguage, autoSpeak, audioSource]);

  useEffect(() => {
    if (audioSource === 'mic' && interimTranscript) {
        setCurrentOriginal(interimTranscript);
    }
    // For System Audio, we don't have text transcripts yet (Gemini Live Audio->Audio)
    // We update UI based on WS events
  }, [interimTranscript, audioSource]);

  const isListening = audioSource === 'mic' ? isMicListening : systemAudioStatus === 'connected';

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
            {isListening ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Listening ({audioSource === 'mic' ? 'Mic' : 'System'})
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <div className="h-2 w-2 rounded-full bg-white/20" />
                Idle
              </div>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className="apple-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-purple-1/20">
              <Globe size={24} className="text-purple-1" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-apple-tight">Live Translation</h1>
              <p className="text-white/60 text-sm">Meeting: {meetingId}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4 mb-6">
             {/* Source Toggle */}
             <div className="flex gap-2 p-1 bg-dark-3 rounded-full w-fit">
                <button
                    onClick={() => { setAudioSource('mic'); if(systemAudioStatus === 'connected') stopSystemAudio(); }}
                    className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                        audioSource === 'mic' ? "bg-purple-1 text-white" : "text-white/60 hover:text-white"
                    )}
                >
                    <Mic size={16} /> Microphone
                </button>
                <button
                    onClick={() => { setAudioSource('system'); if(isMicListening) stopMic(); }}
                    className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                        audioSource === 'system' ? "bg-purple-1 text-white" : "text-white/60 hover:text-white"
                    )}
                >
                    <Monitor size={16} /> Share Tab Audio
                </button>
             </div>

             <div className="flex flex-wrap items-center gap-4">
                <button
                    onClick={toggleListening}
                    className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-lg",
                    isListening
                        ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
                        : "bg-blue-1 hover:bg-blue-600 text-white shadow-blue-500/20"
                    )}
                >
                    {isListening ? <MicOff size={20} /> : (audioSource === 'mic' ? <Mic size={20} /> : <Laptop size={20} />)}
                    {isListening ? "Stop" : (audioSource === 'mic' ? "Start Listening" : "Start Sharing")}
                </button>

                <div className="flex-1 min-w-[200px]">
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger className="w-full bg-dark-3 border-white/10">
                    <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className="bg-dark-1 border-white/10">
                    {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="text-white">
                        {lang.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>

                <button
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-apple transition-all",
                    autoSpeak
                        ? "bg-purple-1 text-white"
                        : "bg-dark-3 text-white/60 hover:text-white"
                    )}
                >
                    {autoSpeak ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    <span className="text-sm font-medium">Auto-speak</span>
                </button>
            </div>
          </div>
          
           {webSpeechError && audioSource === 'mic' && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-apple text-red-400 text-sm">
                  Error: {webSpeechError}
              </div>
           )}

          {/* Display Current Turn */}
          {(currentOriginal || currentTranslated) && (
            <div className="mb-6 p-4 bg-dark-3 rounded-apple space-y-3 animate-fade-in border border-white/5">
              {currentOriginal && audioSource === 'mic' && (
                <div>
                  <div className="text-xs text-white/40 mb-1">Detected Speech</div>
                  <p className="text-white/90 text-lg leading-relaxed">{currentOriginal}</p>
                </div>
              )}
              {currentTranslated && (
                <div className="pt-2 border-t border-white/5">
                  <div className="text-xs text-purple-1 mb-1 flex items-center gap-2">
                    Live Translation {processing && <Loader2 size={12} className="animate-spin" />}
                  </div>
                  <p className="text-white font-medium text-xl text-purple-200">{currentTranslated}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* History */}
        <div className="apple-card p-6">
          <h2 className="text-lg font-semibold mb-4 tracking-apple-tight">Translation History</h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
             {/* History logic remains same for Mic flow */}
             {transcriptHistory.length === 0 ? (
                 <p className="text-white/40 text-center py-8">
                     {audioSource === 'mic' ? "History is empty." : "System Audio mode active. Translations will be spoken."}
                 </p>
             ) : (
                transcriptHistory.map((item, i) => (
                    <div key={i} className="p-4 bg-dark-3/50 rounded-apple space-y-2 border border-white/5">
                        <p className="text-white/60 text-sm">{item.original}</p>
                        <div className="border-l-2 border-purple-1/30 pl-3">
                            <p className="text-white font-medium">{item.translated}</p>
                        </div>
                    </div>
                ))
             )}
              <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
