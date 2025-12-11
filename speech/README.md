# Eburon Realtime Speech Service

This directory contains the Docker configuration for the Eburon Realtime Speech/TTS service.

## Prerequisites

⚠️ **Docker Desktop must be installed and running** before using this service.

- [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Ensure Docker Desktop is running (look for the Docker icon in your system tray/menu bar)

## Docker Container

The service runs a Hugging Face Space container that provides real-time text-to-speech capabilities.

**Container**: `registry.hf.space/aitekphsoftware-eburon-realtime:latest`

**Platform**: `linux/amd64`

**Port**: `3456` (mapped to container's internal port 7860)

## Running the Service

### Quick Start (Recommended)

```bash
./speech/start.sh
```

### Using Docker Run Directly

```bash
docker run -it -p 3456:7860 --platform=linux/amd64 \
  registry.hf.space/aitekphsoftware-eburon-realtime:latest python app.py
```

### Running in Background (Detached Mode)

```bash
docker run -d -p 3456:7860 --platform=linux/amd64 \
  --name eburon-speech \
  registry.hf.space/aitekphsoftware-eburon-realtime:latest python app.py
```

### Parameters Explanation

- `-it`: Interactive mode with TTY
- `-d`: Detached mode (runs in background)
- `-p 3456:7860`: Maps host port 3456 to container port 7860
- `--platform=linux/amd64`: Ensures compatibility on ARM-based systems (M1/M2 Macs)
- `--name eburon-speech`: Names the container for easy management
- `python app.py`: Command to run inside the container

## Accessing the Service

Once running, the service will be available at:

```
http://localhost:3456
```

## Usage with Orbitzzz

This service can be integrated with the Orbitzzz meeting platform to provide:
- Real-time text-to-speech conversion
- Voice synthesis for translations
- Audio playback for transcriptions

## Managing the Service

### Check if Container is Running

```bash
docker ps
```

### View Container Logs

```bash
docker logs eburon-speech
```

### Stop the Service

**If running in interactive mode (-it):**
Press `Ctrl+C` in the terminal

**If running in detached mode (-d):**
```bash
docker stop eburon-speech
```

### Remove the Container

```bash
docker rm eburon-speech
```

## Troubleshooting

### Docker Not Running

If you see:
```
docker: failed to connect to the docker API
```

**Solution**: Start Docker Desktop and wait for it to fully initialize.

### Port Already in Use

If port 3456 is already in use, you can change the port mapping:
```bash
docker run -it -p 3457:7860 --platform=linux/amd64 \
  registry.hf.space/aitekphsoftware-eburon-realtime:latest python app.py
```

### Image Pull Issues

First run may take several minutes to download the container image. Ensure you have:
- Active internet connection
- Sufficient disk space (image size can be large)

## Notes

- First run may take longer as Docker pulls the image
- Ensure Docker Desktop is running before starting the service
- The service requires an active internet connection for the initial image pull
- Container runs on `linux/amd64` platform for compatibility with all systems
