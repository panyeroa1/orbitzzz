/**
 * Maps numeric speaker IDs to predefined speaker labels
 * Alternates between Male and Female based on speaker ID
 */
export function getSpeakerLabel(speakerId: number | undefined): string | null {
  if (speakerId === undefined || speakerId === null) return null;
  
  const speakerLabels = [
    "Male 1",
    "Female 1", 
    "Male 2",
    "Female 2",
  ];
  
  // Cycle through labels if more than 4 speakers
  return speakerLabels[speakerId % speakerLabels.length];
}

/**
 * Gets a color for each speaker for UI differentiation
 */
export function getSpeakerColor(speakerId: number | undefined): string {
  if (speakerId === undefined || speakerId === null) return "#94a3b8"; // slate-400
  
  const colors = [
    "#3b82f6", // blue-500 - Male 1
    "#ec4899", // pink-500 - Female 1
    "#8b5cf6", // violet-500 - Male 2
    "#f97316", // orange-500 - Female 2
  ];
  
  return colors[speakerId % colors.length];
}
