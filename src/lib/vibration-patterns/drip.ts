import { PatternProcessor } from "@/types/vibration";

// sharp impact + exponential decay, secondary drip near end of cycle
export const drip: PatternProcessor = ({ elapsed }) => {
  const cycle = elapsed % 2.2;
  if (cycle < 0.06) return 1.0;
  if (cycle < 0.35) return Math.exp(-(cycle - 0.06) * 12);
  if (cycle > 1.8 && cycle < 1.86) return 0.65;
  if (cycle >= 1.86) return Math.exp(-(cycle - 1.86) * 18) * 0.65;
  return 0;
};
