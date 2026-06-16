import { PatternProcessor } from "@/types/vibration";

// Sparse, unpredictable bursts that hold their intensity until the next event.
// Speed controls frequency — low = rare surprises, high = frenetic.
export const erratic: PatternProcessor = ({ speed }) => {
  const burstChance = 0.03 + speed * 0.12;   // 3% → 15% per frame
  const silenceChance = 0.015 + speed * 0.035; // 1.5% → 5% per frame

  const r = Math.random();
  if (r < silenceChance) return 0;
  if (r < silenceChance + burstChance) {
    // 75% strong hit (55–100%), 25% soft nudge (20–55%) for texture
    return Math.random() > 0.25
      ? 0.55 + Math.random() * 0.45
      : 0.20 + Math.random() * 0.35;
  }
  return undefined; // hold current intensity
};
