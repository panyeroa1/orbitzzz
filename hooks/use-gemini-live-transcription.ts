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
    // ...
    
    const connect = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, isKeyActive: true }));

            const wsUrl = `ws://localhost:8001?mode=transcription&session_id=${sessionId}&user_id=${userId}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = async () => {
                console.log('Connected to Gemini Transcription Server');
                setState(prev => ({ ...prev, isConnected: true, error: null }));
                
                // Start Audio
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        audio: { sampleRate: 16000, channelCount: 1 } 
                    });
                    streamRef.current = stream;
                    
                    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                    mediaRecorderRef.current = mediaRecorder;

                    mediaRecorder.ondataavailable = async (event) => {
                        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                            const buffer = await event.data.arrayBuffer();
                            ws.send(buffer);
                        }
                    };

                    mediaRecorder.start(100); // Send chunk every 100ms
                } catch (err: any) {
                    console.error("Microphone Error:", err);
                    setState(prev => ({ ...prev, error: `Microphone Error: ${err.message}` }));
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
    }, []);

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
