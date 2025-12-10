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
 * Generates a friendly cyber-themed ID like "neon-pulse"
 */
export function generateFriendlyId(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  
  return `${adj}-${noun}`;
}
