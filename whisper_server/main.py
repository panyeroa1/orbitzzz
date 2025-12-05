from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import uvicorn
import asyncio
import os
import tempfile

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model (tiny for speed on CPU)
# valid sizes: tiny, base, small, medium, large-v2
MODEL_SIZE = "tiny" 
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

@app.get("/")
def read_root():
    return {"status": "online", "message": "Whisper Server is Running"}

@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected")
    
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
                    print(f"Transcription: {transcription}")
                    await websocket.send_text(transcription)
            except Exception as e:
                print(f"Error processing audio: {e}")
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Connection error: {e}")

@app.websocket("/ws/status")
async def status_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Just accept and close to prove connection
    await websocket.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
