"use client";

import { useState, useEffect, useRef, useCallback } from "react";


interface UseWebSocketOptions {
  url: string;
  sessionId?: string;
  apiKey?: string;
  enabled?: boolean;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useWebSocket(
  options: UseWebSocketOptions
): UseWebSocketReturn {
  const {
    url,
    sessionId = "default",
    apiKey,
    enabled = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(enabled);

  const connect = useCallback(() => {
    if (!enabled || !shouldConnectRef.current) return;

    try {
      // Build WebSocket URL with params
      const wsUrl = new URL(url);
      wsUrl.searchParams.set("session_id", sessionId);
      if (apiKey) {
        wsUrl.searchParams.set("api_key", apiKey);
      }

      console.log("[WebSocket] Connecting to:", wsUrl.toString());
      const ws = new WebSocket(wsUrl.toString());

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (err) {
          console.error("[WebSocket] Error parsing message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setIsConnected(false);
        onDisconnect?.();

        // Auto-reconnect after 3 seconds if still enabled
        if (shouldConnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("[WebSocket] Reconnecting...");
            connect();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("[WebSocket] Connection error:", err);
    }
  }, [url, sessionId, apiKey, enabled, onMessage, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    shouldConnectRef.current = true;
    setTimeout(() => connect(), 100);
  }, [connect, disconnect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("[WebSocket] Cannot send message - not connected");
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    shouldConnectRef.current = enabled;
    if (enabled) {
      connect();
    }

    return () => {
      shouldConnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enabled, connect]);

  return {
    isConnected,
    sendMessage,
    disconnect,
    reconnect,
  };
}
