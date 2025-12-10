import { PatternProcessor } from "@/types/vibration";

/**
 * Random, sharp bursts of intensity.
 */
export const erratic: PatternProcessor = () => {
  if (Math.random() > 0.95) return Math.random();
  return undefined; // Skip emission to maintain current state
};
