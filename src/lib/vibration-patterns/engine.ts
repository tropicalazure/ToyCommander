import { PatternProcessor } from "@/types/vibration";

export const engine: PatternProcessor = ({ elapsed, speed }) => {
  const rpm = 2 + speed * 6;
  const thump = Math.sin(elapsed * rpm * Math.PI * 2) > 0.3 ? 0.8 : 0.15;
  const rattle = ((Math.sin(elapsed * rpm * Math.PI * 10) + 1) / 2) * 0.12;
  return Math.min(1, thump + rattle);
};
