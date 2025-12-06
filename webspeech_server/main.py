from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Set, Optional
import uvicorn
import json
import asyncio
from datetime import datetime
import os


app = FastAPI(
    title="Eburon WebSpeech Relay",
    description="WebSocket relay server for real-time Web Speech API transcriptions",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session management
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.session_history: Dict[str, list] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """Connect a client to a session"""
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
            self.session_history[session_id] = []
        self.active_connections[session_id].add(websocket)
        print(f"[WebSpeech Relay] Client connected to session: {session_id} (Total: {len(self.active_connections[session_id])})")
    
    def disconnect(self, websocket: WebSocket, session_id: str):
        """Disconnect a client from a session"""
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
                # Clean up old history after 1 hour (optional)
        print(f"[WebSpeech Relay] Client disconnected from session: {session_id}")
    
    async def broadcast(self, message: dict, session_id: str, sender: Optional[WebSocket] = None):
        """Broadcast message to all clients in a session except sender"""
        if session_id not in self.active_connections:
            return
        
        # Store in history
        self.session_history[session_id].append({
            **message,
            "stored_at": datetime.now().isoformat()
        })
        
        # Keep only last 100 messages per session
        if len(self.session_history[session_id]) > 100:
            self.session_history[session_id] = self.session_history[session_id][-100:]
        
        # Broadcast to all clients in session
        disconnected = set()
        for connection in self.active_connections[session_id]:
            # Skip sender if specified (optional)
            # if connection == sender:
            #     continue
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                print(f"[WebSpeech Relay] Error sending to client: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection, session_id)
    
    def get_history(self, session_id: str, limit: int = 50) -> list:
        """Get recent messages for a session"""
        if session_id not in self.session_history:
            return []
        return self.session_history[session_id][-limit:]


manager = ConnectionManager()


# ============ REST API Endpoints ============

@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Eburon WebSpeech Relay",
        "version": "1.0.0",
        "active_sessions": len(manager.active_connections),
        "total_connections": sum(len(conns) for conns in manager.active_connections.values())
    }


@app.get("/sessions")
def list_sessions():
    """List all active sessions"""
    return {
        "sessions": [
            {
                "session_id": session_id,
                "connections": len(connections),
                "messages": len(manager.session_history.get(session_id, []))
            }
            for session_id, connections in manager.active_connections.items()
        ]
    }


@app.get("/history/{session_id}")
def get_session_history(session_id: str, limit: int = Query(50, ge=1, le=100)):
    """Get message history for a session"""
    return {
        "session_id": session_id,
        "messages": manager.get_history(session_id, limit)
    }


# ============ WebSocket Endpoints ============

@app.websocket("/ws/broadcast")
async def websocket_broadcast_endpoint(
    websocket: WebSocket,
    session_id: str = Query("default", description="Session ID for grouping connections"),
    api_key: Optional[str] = Query(None, description="Optional API key for authentication")
):
    """
    WebSocket endpoint for broadcasting transcriptions.
    
    Connect with: ws://host:8001/ws/broadcast?session_id=SESSION_ID&api_key=API_KEY
    
    Send JSON messages:
    {
        "type": "transcription",
        "text": "transcribed text",
        "language": "en-US",
        "confidence": 0.95,
        "isFinal": true,
        "timestamp": "2025-12-06T12:00:00"
    }
    
    Receive: Same message format broadcasted to all clients in the session
    """
    # TODO: Add API key validation if needed
    # if api_key and not validate_api_key(api_key):
    #     await websocket.close(code=4001, reason="Invalid API key")
    #     return
    
    await manager.connect(websocket, session_id)
    
    # Send session history to new client
    history = manager.get_history(session_id, limit=10)
    if history:
        try:
            await websocket.send_text(json.dumps({
                "type": "history",
                "messages": history
            }))
        except Exception as e:
            print(f"[WebSpeech Relay] Error sending history: {e}")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                # Add server timestamp if not present
                if "timestamp" not in message:
                    message["timestamp"] = datetime.now().isoformat()
                
                # Add session_id to message
                message["session_id"] = session_id
                
                print(f"[WebSpeech Relay] [{session_id}] {message.get('type', 'unknown')}: {message.get('text', '')[:50]}")
                
                # Broadcast to all clients in session
                await manager.broadcast(message, session_id, sender=websocket)
                
            except json.JSONDecodeError:
                print(f"[WebSpeech Relay] Invalid JSON received: {data[:100]}")
            except Exception as e:
                print(f"[WebSpeech Relay] Error processing message: {e}")
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
    except Exception as e:
        print(f"[WebSpeech Relay] Connection error: {e}")
        manager.disconnect(websocket, session_id)


@app.websocket("/ws/status")
async def status_endpoint(websocket: WebSocket):
    """Simple status check endpoint"""
    await websocket.accept()
    await websocket.send_text(json.dumps({"status": "ok"}))
    await websocket.close()


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    print("\n🎤 Eburon WebSpeech Relay Server starting...")
    print(f"   Port: {port}")
    print(f"   API Docs: http://0.0.0.0:{port}/docs")
    print(f"   Endpoint: http://0.0.0.0:{port}")
    print(f"   WebSocket: ws://0.0.0.0:{port}/ws/broadcast?session_id=YOUR_SESSION\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
