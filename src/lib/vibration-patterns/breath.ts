import { PatternProcessor } from "@/types/vibration";

// inhale 2s → hold 0.5s → exhale 1.5s → pause 1s
export const breath: PatternProcessor = ({ elapsed }) => {
  const cycle = elapsed % 5;
  if (cycle < 2) return cycle / 2;
  if (cycle < 2.5) return 1;
  if (cycle < 4) return 1 - (cycle - 2.5) / 1.5;
  return 0;
};
