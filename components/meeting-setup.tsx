"use client";

import {
  DeviceSettings,
  VideoPreview,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type MeetingSetupProps = {
  setIsSetupComplete: (isSetupComplete: boolean) => void;
};

export const MeetingSetup = ({ setIsSetupComplete }: MeetingSetupProps) => {
  const [isMicCamToggledOn, setIsMicCamToggledOn] = useState(false);

  const call = useCall();
  const { useCameraState } = useCallStateHooks();
  const { camera, hasBrowserPermission } = useCameraState();

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

  // Wait for call and camera to be fully ready before showing VideoPreview
  const [isCallReady, setIsCallReady] = useState(false);

  useEffect(() => {
    // Only set ready when call exists, camera is available, and we have browser permission
    // or if we've waited long enough for the permission check to complete
    if (call && camera) {
      // Small delay to ensure SDK internals are fully initialized
      const timer = setTimeout(() => {
        setIsCallReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [call, camera]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 text-white">
      <h1 className="text-2xl font-bold">Setup</h1>

      {isCallReady ? (
        <VideoPreview />
      ) : (
        <div className="flex h-[300px] w-[400px] items-center justify-center bg-dark-3 rounded-lg">
          <p className="text-white/50">Loading camera...</p>
        </div>
      )}

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
