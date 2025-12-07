from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from faster_whisper import WhisperModel
from pydantic import BaseModel
from typing import Optional
import uvicorn
import asyncio
import os
import tempfile
import secrets
import json
import subprocess
from datetime import datetime

app = FastAPI(
    title="Eburon STT",
    description="Eburon Speech-to-Text Server powered by Whisper",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Keys storage (in production, use a database)
API_KEYS_FILE = os.path.join(os.path.dirname(__file__), "api_keys.json")

def load_api_keys() -> dict:
    """Load API keys from file"""
    if os.path.exists(API_KEYS_FILE):
        with open(API_KEYS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_api_keys(keys: dict):
    """Save API keys to file"""
    with open(API_KEYS_FILE, "w") as f:
        json.dump(keys, f, indent=2)

def generate_api_key() -> str:
    """Generate a secure API key"""
    return f"eburon_stt_{secrets.token_urlsafe(32)}"

def validate_api_key(api_key: str) -> bool:
    """Validate an API key"""
    keys = load_api_keys()
    if api_key in keys:
        # Update last used timestamp
        keys[api_key]["last_used"] = datetime.now().isoformat()
        keys[api_key]["requests"] = keys[api_key].get("requests", 0) + 1
        save_api_keys(keys)
        return True
    return False

# Load model (tiny for speed on CPU)
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "tiny")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

# Pydantic models
class APIKeyCreate(BaseModel):
    name: str
    description: Optional[str] = None

class APIKeyResponse(BaseModel):
    api_key: str
    name: str
    description: Optional[str]
    created_at: str

class APIKeyInfo(BaseModel):
    name: str
    description: Optional[str]
    created_at: str
    last_used: Optional[str]
    requests: int

# ============ REST API Endpoints ============

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Eburon STT is Running"
    }

@app.post("/api/keys", response_model=APIKeyResponse)
def create_api_key(key_data: APIKeyCreate):
    """Create a new API key for accessing the transcription service"""
    api_key = generate_api_key()
    keys = load_api_keys()
    
    keys[api_key] = {
        "name": key_data.name,
        "description": key_data.description,
        "created_at": datetime.now().isoformat(),
        "last_used": None,
        "requests": 0
    }
    save_api_keys(keys)
    
    return APIKeyResponse(
        api_key=api_key,
        name=key_data.name,
        description=key_data.description,
        created_at=keys[api_key]["created_at"]
    )

@app.get("/api/keys")
def list_api_keys():
    """List all API keys (without exposing the full key)"""
    keys = load_api_keys()
    result = []
    for key, data in keys.items():
        # Only show first and last 4 characters of the key
        masked_key = f"{key[:12]}...{key[-4:]}"
        result.append({
            "key_preview": masked_key,
            "name": data["name"],
            "description": data.get("description"),
            "created_at": data["created_at"],
            "last_used": data.get("last_used"),
            "requests": data.get("requests", 0)
        })
    return {"keys": result}

@app.delete("/api/keys/{api_key}")
def delete_api_key(api_key: str):
    """Delete an API key"""
    keys = load_api_keys()
    if api_key not in keys:
        raise HTTPException(status_code=404, detail="API key not found")
    
    del keys[api_key]
    save_api_keys(keys)
    return {"message": "API key deleted"}

@app.get("/api/validate")
def validate_key(api_key: str = Query(..., description="API key to validate")):
    """Validate an API key"""
    if validate_api_key(api_key):
        return {"valid": True}
    raise HTTPException(status_code=401, detail="Invalid API key")

# ============ WebSocket Endpoints ============

@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket, api_key: str = Query(None)):
    """
    WebSocket endpoint for real-time transcription with auto language detection.
    
    Connect with: ws://host:8000/ws/transcribe?api_key=YOUR_API_KEY
    Send audio data as binary blobs (webm format recommended)
    Receive JSON: {"text": "transcription", "language": "en", "confidence": 0.95}
    """
    # Validate API key if provided (optional for backward compatibility)
    if api_key and not validate_api_key(api_key):
        await websocket.close(code=4001, reason="Invalid API key")
        return
    
    await websocket.accept()
    key_info = f" (API Key: ...{api_key[-4:]})" if api_key else " (No API Key)"
    print(f"[Eburon STT] Client connected{key_info}")
    
    try:
        while True:
            # Receive audio data (blob)
            data = await websocket.receive_bytes()
            
            # Save to temp file
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
                tmp.write(data)
                tmp_path = tmp.name

            wav_path = tmp_path + ".wav"

            try:
                # Convert to WAV using system FFmpeg (robust against container issues)
                subprocess.run([
                    "ffmpeg", "-y", "-i", tmp_path,
                    "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
                    wav_path
                ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                # Transcribe with auto language detection
                segments, info = model.transcribe(wav_path, beam_size=5)
                transcription = " ".join([segment.text for segment in segments])
                
                if transcription.strip():
                    # Get detected language
                    detected_lang = info.language if info.language else "unknown"
                    lang_prob = info.language_probability if info.language_probability else 0.0
                    
                    print(f"[Eburon STT] [{detected_lang}] {transcription}")
                    
                    # Send JSON response with language info
                    response = json.dumps({
                        "text": transcription.strip(),
                        "language": detected_lang,
                        "confidence": round(lang_prob, 2)
                    })
                    await websocket.send_text(response)
            except Exception as e:
                print(f"[Eburon STT] Error processing audio: {e}")
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                if os.path.exists(wav_path):
                    os.unlink(wav_path)

    except WebSocketDisconnect:
        print("[Eburon STT] Client disconnected")
    except Exception as e:
        print(f"[Eburon STT] Connection error: {e}")

@app.websocket("/ws/status")
async def status_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.close()

if __name__ == "__main__":
    print("\n🎤 Eburon STT Server starting...")
    print(f"   Model: {MODEL_SIZE}")
    print(f"   API Docs: http://0.0.0.0:8000/docs")
    print(f"   Endpoint: http://0.0.0.0:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
