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
    if (call && camera && hasBrowserPermission !== undefined) {
      // Longer delay to ensure SDK internals are fully initialized
      const timer = setTimeout(() => {
        setIsCallReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [call, camera, hasBrowserPermission]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 text-white">
      <h1 className="text-2xl font-bold">Setup</h1>

      {isCallReady && hasBrowserPermission ? (
        <div className="flex h-[300px] w-[400px] items-center justify-center">
          <VideoPreview />
        </div>
      ) : (
        <div className="flex h-[300px] w-[400px] items-center justify-center bg-dark-3 rounded-lg">
          <p className="text-white/50">
            {hasBrowserPermission === false 
              ? "Camera permission denied. Please allow camera access."
              : "Loading camera..."}
          </p>
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
        onClick={async () => {
          await call.join({
            create: true,
            data: {
              settings_override: {
                waiting_room: {
                  enabled: true,
                  join_policy: "request_to_join",
                }
              } as any
            }
          });

          setIsSetupComplete(true);
        }}
      >
        Join meeting
      </Button>
    </div>
  );
};
