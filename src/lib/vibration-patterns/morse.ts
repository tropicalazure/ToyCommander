import { PatternProcessor } from "@/types/vibration";

// SOS: ... --- ... with 2.4s word pause, 7.8s total cycle
const SEGMENTS: [number, number][] = [
  [0.0, 0.2], [0.4, 0.6], [0.8, 1.0],   // S ...
  [1.6, 2.2], [2.4, 3.0], [3.2, 3.8],   // O ---
  [4.4, 4.6], [4.8, 5.0], [5.2, 5.4],   // S ...
];

export const morse: PatternProcessor = ({ elapsed }) => {
  const t = elapsed % 7.8;
  return SEGMENTS.some(([s, e]) => t >= s && t < e) ? 1.0 : 0;
};
