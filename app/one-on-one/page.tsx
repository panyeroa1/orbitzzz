"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Mic, MicOff, Globe, Activity, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Languages supported (matching the previous HTML list + common ones)
const LANGUAGES = [
  { code: "auto", name: "✨ Auto Detect" },
  { code: "en-US", name: "English" },
  { code: "es-ES", name: "Spanish" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "it-IT", name: "Italian" },
  { code: "ja-JP", name: "Japanese" },
  { code: "zh-CN", name: "Chinese" },
  { code: "pt-PT", name: "Portuguese" },
  { code: "ru-RU", name: "Russian" },
  { code: "hi-IN", name: "Hindi" },
  { code: "fil-PH", name: "Filipino" },
  { code: "ko-KR", name: "Korean" },
];

interface TranscriptMessage {
  id: string;
  text: string;
  translation?: string;
  isLocal: boolean;
  timestamp: Date;
  senderId: string;
}

export default function OneOnOnePage() {
  const searchParams = useSearchParams();
  const bindingId = searchParams.get("bindingId") || "demo-room";
  
  // State
  const [isListening, setIsListening] = useState(false);
  const [myLanguage, setMyLanguage] = useState("auto"); // Input language & Target language
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [status, setStatus] = useState("Ready to connect.");
  const [permissionError, setPermissionError] = useState(false);
  const [myId] = useState(() => Math.random().toString(36).substring(7)); // Random session ID for this tab

  // Refs
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Setup Supabase Subscription
  useEffect(() => {
    console.log(`[1:1] Subscribing to meeting: ${bindingId}`);
    
    // Fetch recent history?
    // For now, just listen to new events
    
    const channel = supabase
      .channel(`meeting-${bindingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transcriptions",
          filter: `meeting_id=eq.${bindingId}`,
        },
        async (payload) => {
          const newRow = payload.new as any;
          
          // Ignore our own messages (we add them optimistically)
          if (newRow.speaker_label === myId) return;

          console.log("[1:1] Received remote message:", newRow);
          
          // Translate incoming message
          const originalText = newRow.text_original;
          const sourceLang = newRow.source_language;
          
          let translatedText = originalText;
          
          if (myLanguage !== "auto" && sourceLang !== myLanguage) {
             // Perform Translation
             try {
                const res = await fetch("/api/translate/text", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({
                      text: originalText,
                      targetLanguage: myLanguage
                   })
                });
                const data = await res.json();
                if (data.translatedText) {
                   translatedText = data.translatedText;
                }
             } catch (err) {
                console.error("Translation error:", err);
             }
          }

          setMessages((prev) => [
            ...prev,
            {
              id: newRow.id,
              text: originalText,
              translation: translatedText !== originalText ? translatedText : undefined,
              isLocal: false,
              timestamp: new Date(newRow.created_at),
              senderId: newRow.speaker_label
            },
          ]);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setStatus("Connected to secure channel.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bindingId, myId, myLanguage]);

  // 2. Setup Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setStatus("Browser does not support Speech Recognition.");
        setPermissionError(true);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = myLanguage === "auto" ? "en-US" : myLanguage; // Default to en-US if auto

      recognition.onstart = () => {
        setIsListening(true);
        setStatus("Listening...");
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Error:", event.error);
        if (event.error === "not-allowed") {
           setPermissionError(true);
           setStatus("Microphone permission denied.");
           setIsListening(false);
        }
      };

      recognition.onend = () => {
         if (isListening) {
            // Attempt restart if supposedly listening (handling silence timeouts)
            try { recognition.start(); } catch {}
         } else {
            setIsListening(false);
            setStatus("Microphone stopped.");
         }
      };

      recognition.onresult = async (event: any) => {
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          }
        }

        if (final) {
          final = final.trim();
          console.log("[1:1] You said:", final);
          
          // 1. Add to local UI
          const tempId = Math.random().toString();
          setMessages((prev) => [
             ...prev,
             {
               id: tempId,
               text: final,
               isLocal: true,
               timestamp: new Date(),
               senderId: myId
             }
          ]);

          // 2. Send to Supabase
          try {
             await supabase.from("transcriptions").insert({
                meeting_id: bindingId,
                text_original: final,
                source_language: myLanguage === "auto" ? "en-US" : myLanguage, // Best guess
                speaker_label: myId,
                chunk_index: Date.now() // timestamp as index
             });
          } catch (err) {
             console.error("Failed to send transcript:", err);
             setStatus("Failed to send message.");
          }
        }
      };

      recognitionRef.current = recognition;
    }
  }, [myLanguage, bindingId, myId]);

  // Toggle Mic
  const toggleMic = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      setIsListening(false); // Flag first to prevent auto-restart
      recognitionRef.current.stop();
    } else {
       // Update lang before starting
       recognitionRef.current.lang = myLanguage === "auto" ? "en-US" : myLanguage;
       try {
         recognitionRef.current.start();
         // setIsListening(true); // handled by onstart
       } catch (e) {
         console.error("Start error:", e);
       }
    }
  };

  // Change Language
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
     setMyLanguage(e.target.value);
     // If listening, we need to restart to apply language? 
     // The useEffect dependency [myLanguage] will re-create recognition.
     // But we need to make sure we stop the old one first?
     // Actually React useEffect cleanup runs before the new effect. 
     // However, `recognition.stop()` is async. 
     // Let's trust the user to restart mic if needed, or simple restart:
     if (isListening) {
        setIsListening(false);
        recognitionRef.current?.stop();
        setTimeout(() => {
           // It's tricky to auto-restart because of async events. 
           // Better to let the user restart or rely on the new useEffect to setup a NEW recognition instance.
        }, 100);
     }
  };

  return (
    <div className="flex flex-col h-full bg-[#05060a] text-white p-4 font-sans max-w-md mx-auto relative overflow-hidden">
      
      {/* Header */}
      <div className="text-center mb-4 z-10">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent flex justify-center items-center gap-2">
           <ArrowRightLeft size={20} className="text-cyan-400"/>
           1:1 Translator
        </h1>
        <p className="text-xs text-white/40 font-mono mt-1">ID: {bindingId}</p>
      </div>

      {/* Language Selector */}
      <div className="mb-4 z-10">
         <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1 block">My Language</label>
         <div className="relative">
            <select 
               value={myLanguage} 
               onChange={handleLanguageChange}
               title="Select Language"
               className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 appearance-none text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
            >
               {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} className="bg-[#0b0f18]">{l.name}</option>
               ))}
            </select>
            <Globe className="absolute right-3 top-3 text-white/30 pointer-events-none" size={16} />
         </div>
         <p className="text-[10px] text-white/30 mt-1.5 px-1">
            * Selected language is used for your speech recognition AND translating incoming messages.
         </p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto mb-4 rounded-2xl bg-white/5 border border-white/5 p-4 space-y-4 z-10 shadow-inner">
         {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-white/20 text-sm gap-2">
               <Activity size={24} className="opacity-50" />
               <p>No messages yet. Start speaking!</p>
            </div>
         )}
         
         {messages.map((msg) => (
            <div key={msg.id} className={cn("flex flex-col gap-1", msg.isLocal ? "items-end" : "items-start")}>
               <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.isLocal 
                     ? "bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tr-none" 
                     : "bg-white/10 border border-white/10 text-gray-100 rounded-tl-none"
               )}>
                  {msg.translation && (
                     <div className="font-semibold text-cyan-300 mb-1 pb-1 border-b border-white/10">
                        {msg.translation}
                     </div>
                  )}
                  <div className={msg.translation ? "text-white/60 text-xs italic" : ""}>
                     {msg.text}
                  </div>
               </div>
               <span className="text-[10px] text-white/20 px-1">
                  {msg.isLocal ? "You" : "Remote"} • {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
               </span>
            </div>
         ))}
         <div ref={messagesEndRef} />
      </div>

      {/* Status & Mic */}
      <div className="mt-auto z-10 shrink-0">
         <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold flex items-center gap-1.5">
               <span className={cn("w-1.5 h-1.5 rounded-full", isListening ? "bg-red-500 animate-pulse" : "bg-white/20")} />
               {status}
            </span>
         </div>
      
         <button
            onClick={toggleMic}
            disabled={permissionError}
            className={cn(
               "w-full h-14 rounded-2xl font-bold tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-3 shadow-lg",
               isListening 
                  ? "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-red-500/25 hover:shadow-red-500/40 translate-y-[1px]" 
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-1",
               permissionError && "opacity-50 cursor-not-allowed grayscale"
            )}
         >
            {isListening ? (
               <>
                  <MicOff size={20} className="animate-pulse" />
                  Stop Microphone
               </>
            ) : (
               <>
                  <Mic size={20} />
                  Open Microphone
               </>
            )}
         </button>
      </div>

      {/* Visualizer Background Effect */}
      {isListening && (
         <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center gap-1 z-0">
             {[...Array(10)].map((_, i) => (
                <div key={i} className="w-4 bg-gradient-to-t from-transparent via-cyan-500 to-transparent rounded-full animate-pulse" 
                     style={{ 
                        height: `${Math.random() * 60 + 20}%`, 
                        animationDuration: `${Math.random() * 0.5 + 0.5}s` 
                     }} 
                />
             ))}
         </div>
      )}
    </div>
  );
}
