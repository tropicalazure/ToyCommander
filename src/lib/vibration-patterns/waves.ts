import { PatternProcessor } from "@/types/vibration";

/**
 * Gentle, rolling wave transitions.
 */
export const waves: PatternProcessor = ({ elapsed }) => {
  return (Math.sin(elapsed * 2) * Math.sin(elapsed * 0.5) + 1) / 2;
};
