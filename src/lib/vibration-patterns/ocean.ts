import { PatternProcessor } from "@/types/vibration";

export const ocean: PatternProcessor = ({ elapsed }) => {
  const primary = (Math.sin(elapsed * 0.35) + 1) / 2;
  const secondary = (Math.sin(elapsed * 0.6 + 0.8) + 1) / 2 * 0.3;
  return Math.min(1, primary * 0.75 + secondary);
};
