import { PatternProcessor } from "@/types/vibration";

/**
 * Alternates between high-frequency buzzing and slow swells.
 */
export const surge: PatternProcessor = ({ elapsed }) => {
  const cycle = elapsed % 4;
  return cycle < 2 
    ? ((Math.sin(elapsed * 30) > 0) ? 0.9 : 0.05) 
    : ((Math.sin((elapsed - 2) * Math.PI * 0.5) + 1) / 2);
};
