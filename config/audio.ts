/**
 * Audio Device Separation Configuration
 * 
 * CRITICAL: This config prevents feedback loops by ensuring STT input
 * and TTS output use different audio paths.
 * 
 * DO NOT route TTS output back into STT input.
 */

export const audioConfig = {
  // ============================================================
  // DEVICE IDS (from environment or runtime)
  // ============================================================
  
  // STT Input: Audio source for transcription (mic/system capture)
  // Set via env or dynamically from navigator.mediaDevices
  sttInputDeviceId: process.env.STT_INPUT_DEVICE_ID || '',

  // TTS Output: Audio destination for speech synthesis
  // Set via env or dynamically from navigator.mediaDevices
  ttsOutputDeviceId: process.env.TTS_OUTPUT_DEVICE_ID || '',

  // ============================================================
  // SUPPORTED SOURCES
  // ============================================================
  supportedSources: [
    'microphone',      // User's microphone
    'system-audio',    // System audio capture (via getDisplayMedia)
    'browser-tab',     // Specific browser tab audio
    'zoom-sdk',        // Zoom meeting audio (if integrated)
  ] as const,

  // ============================================================
  // SAFETY CHECKS
  // ============================================================
  
  /**
   * Validates that STT input and TTS output are not the same device.
   * This prevents feedback loops where TTS output gets transcribed.
   * 
   * @returns true if configuration is safe, false if potential feedback loop
   */
  validateSeparation(): { valid: boolean; error?: string } {
    const { sttInputDeviceId, ttsOutputDeviceId } = this;

    // If either is empty (default), we can't validate - allow but warn
    if (!sttInputDeviceId || !ttsOutputDeviceId) {
      console.warn('[Audio Config] Device IDs not set - cannot validate separation');
      return { valid: true };
    }

    // Check for same device ID
    if (sttInputDeviceId === ttsOutputDeviceId) {
      return {
        valid: false,
        error: 'CRITICAL: STT input and TTS output are the same device! This will cause feedback loops.',
      };
    }

    return { valid: true };
  },
};

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type AudioSource = (typeof audioConfig.supportedSources)[number];

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get available audio input devices.
 * Must be called from client-side code.
 */
export async function getAudioInputDevices(): Promise<AudioDeviceInfo[]> {
  if (typeof navigator === 'undefined') return [];
  
  try {
    // Request permission first to get labels
    await navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => stream.getTracks().forEach(t => t.stop()))
      .catch(() => {});

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'audioinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
        kind: 'audioinput' as const,
      }));
  } catch {
    return [];
  }
}

/**
 * Get available audio output devices.
 * Must be called from client-side code.
 */
export async function getAudioOutputDevices(): Promise<AudioDeviceInfo[]> {
  if (typeof navigator === 'undefined') return [];
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'audiooutput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Speaker ${i + 1}`,
        kind: 'audiooutput' as const,
      }));
  } catch {
    return [];
  }
}

/**
 * Set audio output device for an HTMLMediaElement.
 * Only works in browsers that support setSinkId (Chrome, Edge).
 */
export async function setAudioOutput(
  element: HTMLMediaElement,
  deviceId: string,
): Promise<boolean> {
  if (!('setSinkId' in element)) {
    console.warn('[Audio] setSinkId not supported in this browser');
    return false;
  }

  try {
    // TypeScript doesn't know about setSinkId
    await (element as any).setSinkId(deviceId);
    return true;
  } catch (err) {
    console.error('[Audio] Failed to set output device:', err);
    return false;
  }
}
