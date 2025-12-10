/**
 * @fileOverview Types for the modular vibration engine.
 */

export interface PatternContext {
  /** The seconds elapsed since the pattern started. */
  elapsed: number;
  /** The user-defined speed multiplier (0-1). */
  speed: number;
}

/**
 * A pattern processor function.
 * Returns a vibration intensity (0-1) or undefined to skip the current frame update.
 */
export type PatternProcessor = (ctx: PatternContext) => number | undefined;
