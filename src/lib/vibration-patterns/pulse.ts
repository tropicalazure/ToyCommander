import { PatternProcessor } from "@/types/vibration";

/**
 * A smooth, oscillating pulse.
 */
export const pulse: PatternProcessor = ({ elapsed, speed }) => {
  const freq = 0.2 + (speed * 1.8);
  return (Math.sin(elapsed * freq * Math.PI * 2) + 1) / 2;
};
