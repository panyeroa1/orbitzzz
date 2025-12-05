"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const IntegrationsPage = () => {
  const [status, setStatus] = useState<"Connected" | "Disconnected">("Disconnected");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check connection to local python server
    const checkConnection = async () => {
      try {
        const socket = new WebSocket("ws://localhost:8000/ws/status");
        
        socket.onopen = () => {
          setStatus("Connected");
          setError(null);
          socket.close(); // Just checking availability
        };

        socket.onerror = () => {
           setStatus("Disconnected");
        }
      } catch (e) {
        setStatus("Disconnected");
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="flex size-full flex-col gap-10 text-white animate-fade-in">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-1 bg-clip-text text-transparent">Integrations</h1>

      <div className="flex flex-col gap-5">
        <div className="premium-card flex w-full items-center justify-between rounded-[20px] p-5 sm:max-w-[400px]">
          <div className="flex items-center gap-3">
             <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-1 to-blue-1">
                <Image 
                    src="/icons/add-personal.svg"
                    alt="Fast Whisper"
                    width={24}
                    height={24}
                />
             </div>
             <div className="flex flex-col">
                <p className="text-lg font-bold">Fast Whisper</p>
                <p className="text-sm text-sky-1/70">Real-time Transcription</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`size-3 rounded-full ${status === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <p className={`font-semibold ${status === 'Connected' ? 'text-green-400' : 'text-red-400'}`}>{status}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsPage;
