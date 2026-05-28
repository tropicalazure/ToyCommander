import { PatternProcessor } from "@/types/vibration";

// 8 escalating intensity steps (1s each), then drop over 2s
export const climb: PatternProcessor = ({ elapsed }) => {
  const cycle = elapsed % 10;
  if (cycle < 8) return (Math.floor(cycle) + 1) / 8;
  return Math.max(0, 1 - (cycle - 8) / 2);
};
