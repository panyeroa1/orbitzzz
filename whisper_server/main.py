from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import uvicorn
import asyncio
import os
import tempfile

app = FastAPI(
    title="Eburon STT",
    description="Eburon Speech-to-Text Server powered by Whisper",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model (tiny for speed on CPU)
# valid sizes: tiny, base, small, medium, large-v2
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "tiny")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

@app.get("/")
def read_root():
    return {
        "service": "Eburon STT",
        "status": "online",
        "model": MODEL_SIZE,
        "version": "1.0.0"
    }

@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[Eburon STT] Client connected")
    
    try:
        while True:
            # Receive audio data (blob)
            data = await websocket.receive_bytes()
            
            # Save to temp file because faster-whisper expects a file path or file-like object
            # For real streaming we might use a buffer, but tempfile is safer for MVP
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
                tmp.write(data)
                tmp_path = tmp.name

            try:
                # Transcribe
                segments, info = model.transcribe(tmp_path, beam_size=5)
                
                transcription = " ".join([segment.text for segment in segments])
                
                if transcription.strip():
                    print(f"[Eburon STT] Transcription: {transcription}")
                    await websocket.send_text(transcription)
            except Exception as e:
                print(f"[Eburon STT] Error processing audio: {e}")
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

    except WebSocketDisconnect:
        print("[Eburon STT] Client disconnected")
    except Exception as e:
        print(f"[Eburon STT] Connection error: {e}")

@app.websocket("/ws/status")
async def status_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Just accept and close to prove connection
    await websocket.close()

if __name__ == "__main__":
    print("\n🎤 Eburon STT Server starting...")
    print(f"   Model: {MODEL_SIZE}")
    print(f"   Endpoint: http://0.0.0.0:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
