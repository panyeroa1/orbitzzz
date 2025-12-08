"use client";

import { use, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe, ArrowLeft, Volume2, VolumeX, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslationPlayback } from "@/hooks/useTranslationPlayback";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Albanian" },
  { code: "am", name: "Amharic" },
  { code: "ar", name: "Arabic" },
  { code: "ar-SA", name: "Arabic (Saudi Arabia)" },
  { code: "ar-EG", name: "Arabic (Egypt)" },
  { code: "ar-AE", name: "Arabic (UAE)" },
  { code: "hy", name: "Armenian" },
  { code: "az", name: "Azerbaijani" },
  { code: "eu", name: "Basque" },
  { code: "be", name: "Belarusian" },
  { code: "bn", name: "Bengali" },
  { code: "bn-BD", name: "Bengali (Bangladesh)" },
  { code: "bn-IN", name: "Bengali (India)" },
  { code: "bs", name: "Bosnian" },
  { code: "bg", name: "Bulgarian" },
  { code: "ca", name: "Catalan" },
  { code: "ceb", name: "Cebuano" },
  { code: "ny", name: "Chichewa" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "zh-CN", name: "Chinese (Simplified, China)" },
  { code: "zh-TW", name: "Chinese (Traditional, Taiwan)" },
  { code: "zh-HK", name: "Chinese (Traditional, Hong Kong)" },
  { code: "co", name: "Corsican" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "en-US", name: "English (United States)" },
  { code: "nl-NL", name: "Dutch (Netherlands)" },
  { code: "en", name: "English" },
  { code: "en-US", name: "English (United States)" },
  { code: "en-GB", name: "English (United Kingdom)" },
  { code: "en-AU", name: "English (Australia)" },
  { code: "en-CA", name: "English (Canada)" },
  { code: "en-IN", name: "English (India)" },
  { code: "en-IE", name: "English (Ireland)" },
  { code: "en-NZ", name: "English (New Zealand)" },
  { code: "en-ZA", name: "English (South Africa)" },
  { code: "eo", name: "Esperanto" },
  { code: "et", name: "Estonian" },
  { code: "tl", name: "Filipino (Tagalog)" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "fr-FR", name: "French (France)" },
  { code: "fr-CA", name: "French (Canada)" },
  { code: "fr-BE", name: "French (Belgium)" },
  { code: "fr-CH", name: "French (Switzerland)" },
  { code: "fy", name: "Frisian" },
  { code: "gl", name: "Galician" },
  { code: "ka", name: "Georgian" },
  { code: "de", name: "German" },
  { code: "de-DE", name: "German (Germany)" },
  { code: "de-AT", name: "German (Austria)" },
  { code: "de-CH", name: "German (Switzerland)" },
  { code: "el", name: "Greek" },
  { code: "gu", name: "Gujarati" },
  { code: "ht", name: "Haitian Creole" },
  { code: "ha", name: "Hausa" },
  { code: "haw", name: "Hawaiian" },
  { code: "iw", name: "Hebrew" },
  { code: "he", name: "Hebrew (Modern)" },
  { code: "hi", name: "Hindi" },
  { code: "hi-IN", name: "Hindi (India)" },
  { code: "hmn", name: "Hmong" },
  { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" },
  { code: "ig", name: "Igbo" },
  { code: "id", name: "Indonesian" },
  { code: "ga", name: "Irish" },
  { code: "it", name: "Italian" },
  { code: "it-IT", name: "Italian (Italy)" },
  { code: "it-CH", name: "Italian (Switzerland)" },
  { code: "ja", name: "Japanese" },
  { code: "ja-JP", name: "Japanese (Japan)" },
  { code: "jw", name: "Javanese" },
  { code: "kn", name: "Kannada" },
  { code: "kn-IN", name: "Kannada (India)" },
  { code: "kk", name: "Kazakh" },
  { code: "km", name: "Khmer" },
  { code: "ko", name: "Korean" },
  { code: "ko-KR", name: "Korean (South Korea)" },
  { code: "ku", name: "Kurdish (Kurmanji)" },
  { code: "ky", name: "Kyrgyz" },
  { code: "lo", name: "Lao" },
  { code: "la", name: "Latin" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "lb", name: "Luxembourgish" },
  { code: "mk", name: "Macedonian" },
  { code: "mg", name: "Malagasy" },
  { code: "ms", name: "Malay" },
  { code: "ms-MY", name: "Malay (Malaysia)" },
  { code: "ml", name: "Malayalam" },
  { code: "ml-IN", name: "Malayalam (India)" },
  { code: "mt", name: "Maltese" },
  { code: "mi", name: "Maori" },
  { code: "mr", name: "Marathi" },
  { code: "mr-IN", name: "Marathi (India)" },
  { code: "mn", name: "Mongolian" },
  { code: "my", name: "Myanmar (Burmese)" },
  { code: "ne", name: "Nepali" },
  { code: "no", name: "Norwegian" },
  { code: "nb", name: "Norwegian (Bokmål)" },
  { code: "nn", name: "Norwegian (Nynorsk)" },
  { code: "ps", name: "Pashto" },
  { code: "fa", name: "Persian" },
  { code: "fa-IR", name: "Persian (Iran)" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "pt-PT", name: "Portuguese (Portugal)" },
  { code: "pa", name: "Punjabi" },
  { code: "pa-IN", name: "Punjabi (India)" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "ru-RU", name: "Russian (Russia)" },
  { code: "sm", name: "Samoan" },
  { code: "gd", name: "Scots Gaelic" },
  { code: "sr", name: "Serbian" },
  { code: "sr-RS", name: "Serbian (Serbia)" },
  { code: "st", name: "Sesotho" },
  { code: "sn", name: "Shona" },
  { code: "sd", name: "Sindhi" },
  { code: "si", name: "Sinhala" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "so", name: "Somali" },
  { code: "es", name: "Spanish" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "es-MX", name: "Spanish (Mexico)" },
  { code: "es-AR", name: "Spanish (Argentina)" },
  { code: "es-CO", name: "Spanish (Colombia)" },
  { code: "es-CL", name: "Spanish (Chile)" },
  { code: "es-US", name: "Spanish (United States)" },
  { code: "su", name: "Sundanese" },
  { code: "sw", name: "Swahili" },
  { code: "sw-KE", name: "Swahili (Kenya)" },
  { code: "sw-TZ", name: "Swahili (Tanzania)" },
  { code: "sv", name: "Swedish" },
  { code: "sv-SE", name: "Swedish (Sweden)" },
  { code: "tg", name: "Tajik" },
  { code: "ta", name: "Tamil" },
  { code: "ta-IN", name: "Tamil (India)" },
  { code: "ta-LK", name: "Tamil (Sri Lanka)" },
  { code: "te", name: "Telugu" },
  { code: "te-IN", name: "Telugu (India)" },
  { code: "th", name: "Thai" },
  { code: "th-TH", name: "Thai (Thailand)" },
  { code: "tr", name: "Turkish" },
  { code: "tr-TR", name: "Turkish (Turkey)" },
  { code: "uk", name: "Ukrainian" },
  { code: "uk-UA", name: "Ukrainian (Ukraine)" },
  { code: "ur", name: "Urdu" },
  { code: "ur-PK", name: "Urdu (Pakistan)" },
  { code: "ur-IN", name: "Urdu (India)" },
  { code: "uz", name: "Uzbek" },
  { code: "vi", name: "Vietnamese" },
  { code: "vi-VN", name: "Vietnamese (Vietnam)" },
  { code: "cy", name: "Welsh" },
  { code: "xh", name: "Xhosa" },
  { code: "yi", name: "Yiddish" },
  { code: "yo", name: "Yoruba" },
  { code: "zu", name: "Zulu" },
].sort((a, b) => a.name.localeCompare(b.name));

type TranslatePageProps = {
  params: Promise<{ id: string }>;
};

export default function TranslatePage({ params }: TranslatePageProps) {
  const { id: meetingId } = use(params);
  const router = useRouter();

  const [targetLanguage, setTargetLanguage] = useState("es");
  const [enabled, setEnabled] = useState(true);

  // Use the playback hook
  const { history, status, isPlaying } = useTranslationPlayback({
      meetingId,
      targetLanguage,
      enabled
  });

  // Auto-scroll logic
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

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
               <div className={cn("w-2 h-2 rounded-full", 
                   status === "connected" ? "bg-green-500 animate-pulse" : 
                   status === "connecting" ? "bg-yellow-500" : "bg-red-500"
               )} />
               <span className="text-sm font-medium text-white/60">
                   {status === "connected" ? "Live Connected" : status === "connecting" ? "Connecting..." : "Error"}
               </span>
           </div>
         </div>

         {/* Main Card */}
         <div className="apple-card p-6 mb-6">
           <div className="flex items-center gap-3 mb-6">
             <div className="p-3 rounded-full bg-purple-1/20">
               <Globe size={24} className="text-purple-1" />
             </div>
             <div className="flex-1">
               <h1 className="text-2xl font-bold tracking-apple-tight">Eburon Translator</h1>
               <p className="text-white/60 text-sm">Meeting: {meetingId}</p>
             </div>

             <div className="flex items-center gap-2">
                 {isPlaying && (
                     <div className="px-3 py-1 bg-purple-1/20 rounded-full text-purple-1 text-xs font-bold animate-pulse flex items-center gap-2">
                         <Volume2 size={12} /> Speaking
                     </div>
                 )}
                 <button
                    onClick={() => setEnabled(!enabled)}
                    className={cn(
                        "p-3 rounded-full transition-all",
                        enabled ? "bg-purple-1 text-white" : "bg-dark-3 text-white/40 hover:text-white"
                    )}
                 >
                     {enabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                 </button>
             </div>
           </div>

           <div className="flex flex-col gap-4">
               <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                   <SelectTrigger className="w-full bg-dark-3 border-white/10">
                       <SelectValue placeholder="Select Language" />
                   </SelectTrigger>
                   <SelectContent className="bg-dark-1 border-white/10 max-h-[300px]">
                       {LANGUAGES.map(lang => (
                           <SelectItem key={lang.code} value={lang.code} className="text-white">
                               {lang.name}
                           </SelectItem>
                       ))}
                   </SelectContent>
               </Select>
           </div>
         </div>

         {/* History */}
         <div className="apple-card p-6 min-h-[400px]">
            <h2 className="text-lg font-semibold mb-4 tracking-apple-tight">Translation History</h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/20">
                        <Globe size={48} className="mb-4 opacity-50" />
                        <p>Waiting for broadcast...</p>
                    </div>
                ) : (
                    history.map((item) => (
                        <div key={item.id} className="p-4 bg-dark-3/50 rounded-apple space-y-2 border border-white/5 animate-fade-in group hover:bg-dark-3/80 transition-colors">
                             <div className="flex justify-between text-xs text-white/40">
                                 <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                 <span>{item.speaker || "Speaker"}</span>
                             </div>
                             <p className="text-white/60 text-sm italic">"{item.original}"</p>
                             <div className="border-l-2 border-purple-1/50 pl-4 py-1">
                                 <p className="text-white font-medium text-lg leading-relaxed text-purple-100">
                                     {item.translated}
                                 </p>
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
