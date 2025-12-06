# Eburon WebSpeech Relay Server

WebSocket relay server for broadcasting real-time Web Speech API transcriptions to multiple clients.

## Features

- **Session Management**: Group connections by session ID
- **Message Broadcasting**: Real-time broadcast to all clients in a session
- **History Tracking**: Stores last 100 messages per session
- **RESTful API**: List sessions and retrieve message history
- **CORS Support**: Configured for browser clients

## Quick Start

### 1. Install Dependencies

```bash
cd webspeech_server
pip install -r requirements.txt
```

### 2. Start Server

```bash
python main.py
```

Server runs on `http://localhost:8001` by default.

### 3. API Documentation

Visit `http://localhost:8001/docs` for interactive API documentation.

## WebSocket API

### Connect

```javascript
const ws = new WebSocket('ws://localhost:8001/ws/broadcast?session_id=my-session');
```

### Send Transcription

```javascript
ws.send(JSON.stringify({
  type: 'transcription',
  text: 'Hello world',
  language: 'en-US',
  confidence: 0.95,
  isFinal: true,
  timestamp: new Date().toISOString()
}));
```

### Receive Messages

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'history') {
    // Initial message history
    console.log('History:', data.messages);
  } else if (data.type === 'transcription') {
    // Real-time transcription
    console.log('Transcription:', data.text);
  }
};
```

## Message Format

All messages follow this JSON structure:

```typescript
{
  type: 'transcription' | 'history';
  text?: string;              // Transcribed text
  language?: string;          // Language code (e.g., 'en-US')
  confidence?: number;        // Confidence score (0-1)
  isFinal?: boolean;          // Whether this is final or interim
  timestamp?: string;         // ISO 8601 timestamp
  session_id?: string;        // Session ID (added by server)
  stored_at?: string;         // Storage timestamp (added by server)
}
```

## REST API Endpoints

### Health Check

```bash
GET /
```

Returns server status and connection statistics.

### List Sessions

```bash
GET /sessions
```

Returns all active sessions with connection counts.

### Get Session History

```bash
GET /history/{session_id}?limit=50
```

Returns recent messages for a specific session.

## Configuration

Environment variables:

- `PORT`: Server port (default: 8001)
- `CORS_ORIGINS`: Allowed CORS origins (modify in code)

## Integration with Eburon App

Use the provided React hooks and components:

1. `useWebSpeech` hook for Web Speech API integration
2. `WebSpeechTranscription` component for UI
3. Automatic WebSocket connection management

## Example: Broadcasting Transcriptions

```javascript
// Client 1: Transcribes and broadcasts
const recognition = new webkitSpeechRecognition();
const ws = new WebSocket('ws://localhost:8001/ws/broadcast?session_id=meeting-123');

recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript;
  ws.send(JSON.stringify({
    type: 'transcription',
    text: transcript,
    language: 'en-US',
    isFinal: event.results[event.results.length - 1].isFinal
  }));
};

// Client 2: Receives broadcasts
const ws2 = new WebSocket('ws://localhost:8001/ws/broadcast?session_id=meeting-123');
ws2.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data.text);
};
```

## Architecture

```
Browser (Web Speech API)
         ↓
WebSocket Client → WebSpeech Relay Server → Other Clients
                          ↓
                   Session History
```

## Security Notes

- Add API key authentication for production use
- Configure CORS origins properly
- Implement rate limiting
- Add message validation
- Use WSS (secure WebSocket) in production

## Troubleshooting

**Connection refused**
- Ensure server is running
- Check firewall settings
- Verify port is not in use

**Messages not broadcasting**
- Verify all clients use same session_id
- Check browser console for errors
- Ensure JSON format is valid

**History not loading**
- Check session_id matches
- Verify server logs for errors

## License

MIT License - Part of Eburon Development Platform
