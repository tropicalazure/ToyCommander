import { PatternProcessor } from "@/types/vibration";

export const throb: PatternProcessor = ({ elapsed, speed }) => {
  const period = 1.0 / (0.6 + speed * 1.8);
  const phase = elapsed % period;
  return Math.exp((-phase / period) * 4.5);
};
