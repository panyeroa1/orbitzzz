"use client";

import {
  DeviceSettings,
  useCall,
} from "@stream-io/video-react-sdk";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

// Dynamic import with SSR disabled to prevent hydration errors
const VideoPreview = dynamic(
  () => import("@stream-io/video-react-sdk").then((mod) => mod.VideoPreview),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] w-[400px] items-center justify-center rounded-lg bg-gray-800">
        <span className="text-gray-400">Loading camera...</span>
      </div>
    ),
  }
);

type MeetingSetupProps = {
  setIsSetupComplete: (isSetupComplete: boolean) => void;
};

export const MeetingSetup = ({ setIsSetupComplete }: MeetingSetupProps) => {
  const [isMicCamToggledOn, setIsMicCamToggledOn] = useState(false);

  const call = useCall();

  if (!call)
    throw new Error("useCall must be used within StreamCall component.");

  useEffect(() => {
    if (isMicCamToggledOn) {
      call?.camera.disable();
      call?.microphone.disable();
    } else {
      call?.camera.enable();
      call?.microphone.enable();
    }
  }, [isMicCamToggledOn, call?.camera, call?.microphone]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 text-white">
      <h1 className="text-2xl font-bold">Setup</h1>

      <VideoPreview />

      <div className="flex h-16 items-center justify-center gap-3">
        <label className="flex items-center justify-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={isMicCamToggledOn}
            onChange={(e) => setIsMicCamToggledOn(e.target.checked)}
          />
          Join with mic and camera off
        </label>

        <DeviceSettings />
      </div>

      <Button
        className="rounded-md bg-green-500 px-4 py-2.5"
        onClick={() => {
          call.join();

          setIsSetupComplete(true);
        }}
      >
        Join meeting
      </Button>
    </div>
  );
};
