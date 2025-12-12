import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Mic, MicOff, Send, Volume2, Activity } from 'lucide-react';

const vapi = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY);

const App = () => {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [inputText, setInputText] = useState("");
  const [callStatus, setCallStatus] = useState("Disconnected");
  
  const assistantId = import.meta.env.VITE_ASSISTANT_ID;

  useEffect(() => {
    // Vapi Event Listeners
    vapi.on('call-start', () => {
      setConnecting(false);
      setConnected(true);
      setCallStatus("Live - AI Ready");
      console.log('Call started');
    });

    vapi.on('call-end', () => {
      setConnected(false);
      setConnecting(false);
      setCallStatus("Disconnected");
      console.log('Call ended');
    });

    vapi.on('speech-start', () => {
      setCallStatus("AI Speaking...");
    });

    vapi.on('speech-end', () => {
      setCallStatus("Live - AI Ready");
    });

    vapi.on('error', (e) => {
      console.error(e);
      setCallStatus("Error detected");
      setConnecting(false);
    });

    return () => {
      vapi.stop();
    };
  }, []);

  const toggleCall = async () => {
    if (connected) {
      vapi.stop();
    } else {
      if (!assistantId) {
        alert("Missing Assistant ID. Run 'npm run setup' first!");
        return;
      }
      setConnecting(true);
      setCallStatus("Connecting...");
      try {
        await vapi.start(assistantId);
      } catch (err) {
        console.error("Failed to connect", err);
        setConnecting(false);
        setCallStatus("Connection Failed");
      }
    }
  };

  const handleSpeak = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !connected) return;

    console.log("Sending text:", inputText);

    // Send the text as a user message. 
    // The System Prompt ensures the AI reads this exact text aloud.
    vapi.send({
      type: "add-message",
      message: {
        role: "user",
        content: inputText
      }
    });

    setInputText("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <h1 className="text-xl font-bold text-gray-100">VocalProxy</h1>
          </div>
          <span className="text-xs text-gray-400 font-mono">{callStatus}</span>
        </div>

        {/* Status / Visualizer Area */}
        <div className="h-48 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-900 to-black relative">
            {connected ? (
                <div className="flex flex-col items-center gap-2">
                    <Activity className="w-16 h-16 text-blue-400 animate-bounce" />
                    <p className="text-blue-400 text-sm font-mono">PROXY ACTIVE</p>
                </div>
            ) : (
                <Volume2 className="w-16 h-16 text-gray-700" />
            )}
        </div>

        {/* Controls */}
        <div className="p-6 space-y-4">
            
            {/* Input Area (Only active when connected) */}
            <form onSubmit={handleSpeak} className="relative">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={connected ? "Type here to speak..." : "Connect to start speaking"}
                    disabled={!connected}
                    className="w-full bg-gray-800 text-white rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 border border-gray-700 transition-all"
                    autoFocus
                />
                <button 
                    type="submit" 
                    disabled={!connected || !inputText.trim()}
                    className="absolute right-2 top-2 p-1.5 bg-blue-600 rounded-md hover:bg-blue-500 disabled:bg-gray-700 transition-colors"
                >
                    <Send size={18} />
                </button>
            </form>

            {/* Main Toggle */}
            <button
                onClick={toggleCall}
                disabled={connecting}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                    connected 
                    ? 'bg-red-600 hover:bg-red-500 text-white' 
                    : 'bg-white hover:bg-gray-100 text-black'
                }`}
            >
                {connecting ? (
                    <span>Connecting...</span>
                ) : connected ? (
                    <>
                        <MicOff /> End Proxy
                    </>
                ) : (
                    <>
                        <Mic /> Start Proxy
                    </>
                )}
            </button>
        </div>

      </div>
      
      <div className="mt-8 text-gray-500 text-sm">
        <p>Type text and hit Enter. The AI will speak for you.</p>
      </div>
    </div>
  );
};

export default App;
