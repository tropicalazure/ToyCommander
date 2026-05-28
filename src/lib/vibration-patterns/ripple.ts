import { PatternProcessor } from "@/types/vibration";

export const ripple: PatternProcessor = ({ elapsed }) => {
  const w1 = (Math.sin(elapsed * 1.4) + 1) / 2 * 0.5;
  const w2 = (Math.sin(elapsed * 2.5 + 0.8) + 1) / 2 * 0.35;
  const w3 = (Math.sin(elapsed * 4.1 + 1.5) + 1) / 2 * 0.2;
  return Math.min(1, w1 + w2 + w3);
};
