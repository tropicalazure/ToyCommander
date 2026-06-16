/**
 * Utility to generate human-readable, cyber-themed session IDs.
 */

const ADJECTIVES = [
  "neon", "electric", "cyber", "cosmic", "nebula", 
  "solar", "lunar", "quantum", "sonic", "digital", 
  "astral", "stellar", "pulsar", "vector", "orbital",
  "plasma", "kinetic", "atomic", "binary", "void"
];

const NOUNS = [
  "pulse", "flow", "link", "core", "wave", 
  "node", "spark", "aura", "flux", "beam", 
  "signal", "trace", "echo", "grid", "vertex",
  "prism", "matrix", "nexus", "portal", "rift"
];

/**
 * Generates a friendly cyber-themed ID like "neon-pulse-4827".
 * The numeric suffix adds ~9000× more entropy than the word pair alone
 * (400 combos → ~3.6M), making accidental collisions between concurrent
 * sessions extremely unlikely. The host side should still treat a collision
 * as possible and avoid clobbering an existing session.
 */
export function generateFriendlyId(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit, 1000–9999

  return `${adj}-${noun}-${suffix}`;
}
