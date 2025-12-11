import { useEffect, useRef, useState, useCallback } from 'react';

interface GeminiTranscriptionState {
    transcript: string;
    isConnected: boolean;
    isKeyActive: boolean;
    error: string | null;
}

interface UseGeminiTranscriptionProps {
    sessionId: string;
    userId: string;
}

export const useGeminiLiveTranscription = ({ sessionId, userId }: UseGeminiTranscriptionProps) => {
    const [state, setState] = useState<GeminiTranscriptionState>({
        transcript: '',
        isConnected: false,
        isKeyActive: false,
        error: null,
    });

    const wsRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const connect = useCallback(async (externalStream?: MediaStream) => {
        try {
            // Check for API Key indirectly by checking if server connects (Server validates key)
            // Ideally we check if NEXT_PUBLIC_GEMINI_API_KEY exists if we were connecting directly, 
            // but here we connect to our local relay server.
            
            setState(prev => ({ ...prev, isKeyActive: true })); // Assume active if we try to connect

            const wsUrl = `ws://localhost:8001?mode=transcription&session_id=${sessionId}&user_id=${userId}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = async () => {
                console.log('Connected to Gemini Transcription Server');
                setState(prev => ({ ...prev, isConnected: true, error: null }));
                
                // Start Audio
                try {
                    let stream = externalStream;
                    
                    if (!stream) {
                         stream = await navigator.mediaDevices.getUserMedia({ 
                            audio: { sampleRate: 16000, channelCount: 1 } 
                        });
                    }
                    
                    streamRef.current = stream;
                    
                    // MimeType fallback for different browsers
                    let mimeType = 'audio/webm';
                    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                        mimeType = 'audio/webm;codecs=opus';
                    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                         mimeType = 'audio/mp4';
                    }

                    const mediaRecorder = new MediaRecorder(stream, { mimeType });
                    mediaRecorderRef.current = mediaRecorder;

                    mediaRecorder.ondataavailable = async (event) => {
                        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                            const buffer = await event.data.arrayBuffer();
                            ws.send(buffer);
                        }
                    };

                    mediaRecorder.start(100); // Send chunk every 100ms
                } catch (err: any) {
                    console.error("Audio Capture Error:", err);
                    setState(prev => ({ ...prev, error: `Audio Capture Error: ${err.message}` }));
                    ws.close();
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'text') {
                        setState(prev => ({ 
                            ...prev, 
                            transcript: prev.transcript + (prev.transcript ? ' ' : '') + data.text 
                        }));
                    } else if (data.type === 'error') {
                        setState(prev => ({ ...prev, error: data.message }));
                    }
                } catch (e) {
                    console.error("Parse Error:", e);
                }
            };

            ws.onclose = () => {
                console.log('Disconnected from Gemini Transcription Server');
                setState(prev => ({ ...prev, isConnected: false }));
                stopRecording();
            };

            ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setState(prev => ({ ...prev, error: 'WebSocket Connection Failed' }));
            };

        } catch (error: any) {
            setState(prev => ({ ...prev, error: error.message }));
        }
    }, [sessionId, userId]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        stopRecording();
    }, []);

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        ...state,
        startTranscription: connect,
        stopTranscription: disconnect,
    };
};
