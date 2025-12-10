import { PatternProcessor } from "@/types/vibration";

/**
 * Sharp explosive rise followed by a flickering crackle decay.
 */
export const fireworks: PatternProcessor = ({ elapsed }) => {
  const cycle = elapsed % 2.5; 
  if (cycle < 0.1) return cycle * 10; 
  if (cycle < 0.2) return 1.0; 
  if (cycle < 1.2) return (Math.random() > 0.6 ? (1 - (cycle - 0.2)) : (1 - (cycle - 0.2)) * 0.3);
  return 0;
};
