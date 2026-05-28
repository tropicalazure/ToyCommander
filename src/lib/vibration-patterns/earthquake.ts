import { PatternProcessor } from "@/types/vibration";

export const earthquake: PatternProcessor = ({ elapsed }) => {
  const rumble = ((Math.sin(elapsed * 7) + Math.sin(elapsed * 11)) / 4 + 0.5) * 0.4;
  const spike = Math.random() > 0.97 ? Math.random() * 0.7 : 0;
  return Math.min(1, rumble + spike);
};
