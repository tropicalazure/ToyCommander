import { PatternProcessor } from "@/types/vibration";

/**
 * A rhythmic double-thump pattern.
 */
export const heartbeat: PatternProcessor = ({ elapsed }) => {
  const cycle = elapsed % 1.5;
  if (cycle < 0.15) return 0.8;
  if (cycle < 0.3) return 0;
  if (cycle < 0.45) return 1.0;
  return 0;
};
