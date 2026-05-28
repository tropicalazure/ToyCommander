import { PatternProcessor } from "@/types/vibration";

export const flutter: PatternProcessor = ({ elapsed, speed }) => {
  const freq = 12 + speed * 20;
  const envelope = (Math.sin(elapsed * 0.8) + 1) / 2;
  return ((Math.sin(elapsed * freq * Math.PI * 2) + 1) / 2) * (0.2 + envelope * 0.8);
};
