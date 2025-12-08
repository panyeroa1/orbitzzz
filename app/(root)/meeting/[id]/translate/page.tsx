"use client";

import { useRouter } from "next/navigation";
import { use, useState, useRef, useEffect } from "react";
import { Globe, Volume2, VolumeX, ArrowLeft, Loader2, Mic, MicOff, Monitor, Laptop, Ear, Radio } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWebSpeech } from "@/hooks/useWebSpeech"; 
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

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

export default function TranslatePage({ params }: TranslatePageProps) {
  const { id: meetingId } = use(params);
  const router = useRouter();

  // Mode: 'broadcaster' (Mic -> Supabase) | 'receiver' (Supabase -> Speaker)
  const [mode, setMode] = useState<"broadcaster" | "receiver">("broadcaster");
  const [targetLanguage, setTargetLanguage] = useState("es");
  
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ original: string; translated: string; language: string }>>([]);
  const [currentOriginal, setCurrentOriginal] = useState("");
  const [currentTranslated, setCurrentTranslated] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // Audio Input/Output
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState("");

  // --- Web Speech (Broadcaster) ---
  const {
    isListening: isMicListening,
    startListening: startMic,
    stopListening: stopMic,
    segments,
    interimTranscript,
    error: webSpeechError
  } = useWebSpeech({
    language: "en-US",
    continuous: true,
    interimResults: true,
  });

  // --- Device Enumeration ---
  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }); // Request permission
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputDevices(devices.filter(d => d.kind === "audioinput"));
        setAudioOutputDevices(devices.filter(d => d.kind === "audiooutput"));
      } catch (e) {
        console.error("Device Error:", e);
      }
    };
    getDevices();
  }, []);

  // --- Broadcaster Logic: Send to Supabase ---
  const processedSegmentCount = useRef(0);

  useEffect(() => {
    if (mode === 'broadcaster') {
      const processSegments = async () => {
        if (segments.length > processedSegmentCount.current) {
          const newSegment = segments[processedSegmentCount.current];
          processedSegmentCount.current = segments.length;

          if (!newSegment || !newSegment.text.trim()) return;

          setCurrentOriginal(newSegment.text);
          setProcessing(true);

          try {
            // Call API to Translate & Save to DB
            const response = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: newSegment.text,
                targetLanguage: LANGUAGES.find(l => l.code === targetLanguage)?.name || "Spanish",
                meetingId,
              }),
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setTranscriptHistory(prev => [
              ...prev,
              {
                original: newSegment.text,
                translated: data.translatedText, 
                language: targetLanguage, 
              }
            ]);
            
            // Broadcaster sees text immediately
            setCurrentTranslated(data.translatedText);
            
          } catch (err) {
            console.error("Broadcaster Error:", err);
          } finally {
            setProcessing(false);
            setTimeout(() => {
               if (currentOriginal === newSegment.text) setCurrentOriginal("");
               // Dont clear translated immediately so they can read it
            }, 5000);
          }
        }
      };
      processSegments();
    }
  }, [segments, mode, targetLanguage, meetingId]);

  // --- Receiver Logic: Listen to Supabase & Play Audio ---
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (mode === 'receiver') {
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'translations',
            filter: `meeting_id=eq.${meetingId}`,
          },
          async (payload) => {
            const newRow = payload.new as any;
            
            // Only process if language matches context or we want all? 
            // Assuming this receiver wants hear what's been broadcasted.
            
            setCurrentOriginal(newRow.original_text);
            const textToRead = newRow.translated_text; 
            setCurrentTranslated(`READ THIS: ${textToRead}`);

            try {
                // Generate TTS
                const response = await fetch("/api/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: textToRead }),
                });
                
                if (!response.ok) throw new Error("TTS Failed");
                
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                
                audioQueueRef.current.push(url);
                if (!isPlayingRef.current) playNext();
 
            } catch (e) {
                console.error("TTS Error:", e);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [mode, meetingId]);

  const playNext = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const url = audioQueueRef.current.shift();
    if (!url) return;

    const audio = new Audio(url);
    
    // Set Output Device if selected (Chrome only)
    if (selectedAudioOutput && (audio as any).setSinkId) {
        try {
            await (audio as any).setSinkId(selectedAudioOutput);
        } catch (e) {
            console.error("Sink ID Error:", e);
        }
    }

    audio.onended = () => playNext();
    audio.onerror = () => playNext();
    
    try {
        await audio.play();
    } catch(e) {
        console.error("Play Error:", e);
        playNext();
    }
  };

  const toggleBroadcaster = () => {
    if (isMicListening) stopMic();
    else startMic();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-1 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-white/60 hover:text-white">
            <ArrowLeft size={20} /> Back
          </button>
          <div className="flex items-center gap-4">
              <div className="flex bg-dark-3 rounded-full p-1">
                  <button 
                    onClick={() => { setMode('broadcaster'); if(!isMicListening) stopMic(); }}
                    className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2", mode === 'broadcaster' ? "bg-purple-1 text-white" : "text-white/60")}
                  >
                      <Radio size={14} /> Broadcaster
                  </button>
                  <button 
                    onClick={() => { setMode('receiver'); if(isMicListening) stopMic(); }}
                    className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2", mode === 'receiver' ? "bg-green-500 text-white" : "text-white/60")}
                  >
                      <Ear size={14} /> Receiver
                  </button>
              </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="apple-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-full ${mode === 'broadcaster' ? 'bg-purple-1/20 text-purple-1' : 'bg-green-500/20 text-green-500'}`}>
              <Globe size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-apple-tight">
                  {mode === 'broadcaster' ? "Live Broadcaster" : "Live Receiver"}
              </h1>
              <p className="text-white/60 text-sm">Meeting: {meetingId}</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
             {/* Controls */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {mode === 'broadcaster' && (
                     <>
                        <div className="flex flex-col gap-2">
                             <label className="text-xs text-white/40 uppercase font-semibold">Microphone</label>
                             <Select value={selectedAudioInput} onValueChange={setSelectedAudioInput}>
                                <SelectTrigger className="bg-dark-3 border-white/10"><SelectValue placeholder="System Default" /></SelectTrigger>
                                <SelectContent>
                                    {audioInputDevices.map(d => <SelectItem key={d.deviceId} value={d.deviceId}>{d.label}</SelectItem>)}
                                </SelectContent>
                             </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                             <label className="text-xs text-white/40 uppercase font-semibold">Target Language</label>
                             <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                                <SelectTrigger className="bg-dark-3 border-white/10"><SelectValue placeholder="Select Language" /></SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}
                                </SelectContent>
                             </Select>
                        </div>
                     </>
                 )}
                 
                 {mode === 'receiver' && (
                     <div className="flex flex-col gap-2 md:col-span-2">
                         <label className="text-xs text-white/40 uppercase font-semibold">Audio Output (Speaker)</label>
                         <Select value={selectedAudioOutput} onValueChange={setSelectedAudioOutput}>
                            <SelectTrigger className="bg-dark-3 border-white/10"><SelectValue placeholder="System Default" /></SelectTrigger>
                            <SelectContent>
                                {audioOutputDevices.map(d => <SelectItem key={d.deviceId} value={d.deviceId}>{d.label}</SelectItem>)}
                            </SelectContent>
                         </Select>
                         <p className="text-xs text-white/40 mt-1">Select headphones to isolate audio from potential microphones.</p>
                     </div>
                 )}
             </div>

             {/* Action Button */}
             <div className="flex justify-center mt-4">
                 {mode === 'broadcaster' ? (
                     <button
                        onClick={toggleBroadcaster}
                        className={cn("flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg shadow-xl transition-all hover:scale-105 active:scale-95", isMicListening ? "bg-red-500 shadow-red-500/20" : "bg-white text-black shadow-white/20")}
                     >
                         {isMicListening ? <><MicOff /> Stop Broadcasting</> : <><Mic /> Start Broadcasting</>}
                     </button>
                 ) : (
                     <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-6 py-3 rounded-full border border-green-400/20 animate-pulse">
                         <Radio size={18} /> Listening for translations...
                     </div>
                 )}
             </div>
          </div>
          
          {/* Live Display */}
          {(currentOriginal || currentTranslated) && (
            <div className="mt-8 p-6 bg-dark-3 rounded-2xl border border-white/5 space-y-4">
                {currentOriginal && (
                    <div>
                        <div className="text-xs text-white/40 uppercase tracking-widest mb-2 font-semibold">Original Audio</div>
                        <p className="text-white/80 text-xl font-light leading-relaxed">{currentOriginal}</p>
                    </div>
                )}
                {currentTranslated && (
                    <div className="pt-4 border-t border-white/5">
                        <div className="text-xs text-purple-1 uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                            {mode === 'receiver' && <Volume2 size={12} />} READ THIS:
                        </div>
                        <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-white leading-tight">
                            {currentTranslated.replace("READ THIS: ", "")}
                        </p>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
