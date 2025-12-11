#!/bin/bash

# Eburon Realtime Speech Service - Docker Runner
# This script starts the Eburon TTS/Speech Docker container

echo "🚀 Starting Eburon Realtime Speech Service..."
echo "📍 Service will be available at: http://localhost:3456"
echo ""

docker run -it -p 3456:7860 --platform=linux/amd64 \
  registry.hf.space/aitekphsoftware-eburon-realtime:latest python app.py
