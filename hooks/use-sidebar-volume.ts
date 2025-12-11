"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseSidebarVolumeOptions {
  reducedVolume?: number; // Default 0.08 (8%)
}

interface UseSidebarVolumeReturn {
  isReduced: boolean;
  reduceVolume: () => void;
  restoreVolume: () => void;
  originalVolume: number;
}

/**
 * Hook to manage main audio volume when translator is active.
 * Reduces system audio to 8% to prevent interference with translation audio.
 */
export function useSidebarVolume(
  options: UseSidebarVolumeOptions = {}
): UseSidebarVolumeReturn {
  const { reducedVolume = 0.08 } = options;

  const [isReduced, setIsReduced] = useState(false);
  const originalVolumeRef = useRef(1);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const videoElementsRef = useRef<HTMLVideoElement[]>([]);

  // Find all audio/video elements in the document
  const collectMediaElements = useCallback(() => {
    const audioElements = Array.from(
      document.querySelectorAll("audio")
    ) as HTMLAudioElement[];
    const videoElements = Array.from(
      document.querySelectorAll("video")
    ) as HTMLVideoElement[];

    audioElementsRef.current = audioElements;
    videoElementsRef.current = videoElements;

    return { audioElements, videoElements };
  }, []);

  // Store original volumes
  const storeOriginalVolumes = useCallback(() => {
    const { audioElements, videoElements } = collectMediaElements();

    // Calculate average volume as "original"
    const allVolumes = [
      ...audioElements.map((el) => el.volume),
      ...videoElements.map((el) => el.volume),
    ];

    if (allVolumes.length > 0) {
      originalVolumeRef.current =
        allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length;
    } else {
      originalVolumeRef.current = 1;
    }
  }, [collectMediaElements]);

  // Reduce volume on all media elements
  const reduceVolume = useCallback(() => {
    if (isReduced) return;

    storeOriginalVolumes();

    const { audioElements, videoElements } = collectMediaElements();

    // Reduce volume on all media elements
    audioElements.forEach((el) => {
      el.volume = reducedVolume;
    });
    videoElements.forEach((el) => {
      el.volume = reducedVolume;
    });

    setIsReduced(true);

    console.log(`[Volume] Reduced to ${reducedVolume * 100}%`);
  }, [isReduced, reducedVolume, storeOriginalVolumes, collectMediaElements]);

  // Restore original volume on all media elements
  const restoreVolume = useCallback(() => {
    if (!isReduced) return;

    const { audioElements, videoElements } = collectMediaElements();

    // Restore volume on all media elements
    audioElements.forEach((el) => {
      el.volume = originalVolumeRef.current;
    });
    videoElements.forEach((el) => {
      el.volume = originalVolumeRef.current;
    });

    setIsReduced(false);

    console.log(`[Volume] Restored to ${originalVolumeRef.current * 100}%`);
  }, [isReduced, collectMediaElements]);

  // Auto-apply reduced volume to new media elements
  useEffect(() => {
    if (!isReduced) return;

    const observer = new MutationObserver(() => {
      const { audioElements, videoElements } = collectMediaElements();

      audioElements.forEach((el) => {
        if (el.volume !== reducedVolume) {
          el.volume = reducedVolume;
        }
      });
      videoElements.forEach((el) => {
        if (el.volume !== reducedVolume) {
          el.volume = reducedVolume;
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [isReduced, reducedVolume, collectMediaElements]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isReduced) {
        restoreVolume();
      }
    };
  }, []);

  return {
    isReduced,
    reduceVolume,
    restoreVolume,
    originalVolume: originalVolumeRef.current,
  };
}
