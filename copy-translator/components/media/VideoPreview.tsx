/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

export type VideoPreviewProps = {
  active: boolean;
  onStreamCreated?: (stream: MediaStream) => void;
};

export default function VideoPreview({ active, onStreamCreated }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { client, connected } = useLiveAPIContext();
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (active) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((s) => {
          setStream(s);
          if (onStreamCreated) onStreamCreated(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((e) => console.error("Error accessing webcam:", e));
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [active]);

  useEffect(() => {
    if (!connected || !stream || !active) return;

    const intervalId = setInterval(() => {
      if (videoRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          const base64 = canvas.toDataURL("image/jpeg").split(",")[1];
          client.sendRealtimeInput([{ mimeType: "image/jpeg", data: base64 }]);
        }
      }
    }, 1000); // Send frame every 1 second (adjust as needed for "live" feel vs bandwidth)

    return () => clearInterval(intervalId);
  }, [connected, stream, active, client]);

  return (
    <div className={`video-preview ${active ? "visible" : "hidden"}`}>
       <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)" // Mirror effect
        }}
      />
    </div>
  );
}
