import { PatternProcessor } from "@/types/vibration";

// slow build over 4s then sudden cliff drop
export const avalanche: PatternProcessor = ({ elapsed }) => {
  const cycle = elapsed % 6;
  if (cycle < 4) return cycle / 4;
  if (cycle < 4.4) return 1 - (cycle - 4) / 0.4;
  return 0;
};
