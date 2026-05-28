
import { PatternProcessor } from "@/types/vibration";
import { pulse } from "./pulse";
import { heartbeat } from "./heartbeat";
import { waves } from "./waves";
import { erratic } from "./erratic";
import { surge } from "./surge";
import { fireworks } from "./fireworks";
import { breath } from "./breath";
import { flutter } from "./flutter";
import { avalanche } from "./avalanche";
import { morse } from "./morse";
import { engine } from "./engine";
import { earthquake } from "./earthquake";
import { ocean } from "./ocean";
import { drip } from "./drip";
import { climb } from "./climb";
import { throb } from "./throb";
import { ripple } from "./ripple";

/**
 * The Dynamic Pattern Registry.
 * Allows for runtime "plugin" registration of new vibration sensations.
 */
class PatternRegistry {
  private patterns: Map<string, PatternProcessor> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Register Default System Patterns (silent=true to batch the notify at the end)
    this.register('pulse', pulse, true);
    this.register('heartbeat', heartbeat, true);
    this.register('waves', waves, true);
    this.register('erratic', erratic, true);
    this.register('surge', surge, true);
    this.register('fireworks', fireworks, true);
    this.register('breath', breath, true);
    this.register('flutter', flutter, true);
    this.register('avalanche', avalanche, true);
    this.register('morse', morse, true);
    this.register('engine', engine, true);
    this.register('earthquake', earthquake, true);
    this.register('ocean', ocean, true);
    this.register('drip', drip, true);
    this.register('climb', climb, true);
    this.register('throb', throb, true);
    this.register('ripple', ripple, true);
    this.notify();
  }

  /**
   * Registers a new vibration pattern.
   * This is the "Plugin API" that can be called at runtime.
   * Pass silent=true to suppress the subscriber notification (used for bulk init).
   */
  register(id: string, processor: PatternProcessor, silent = false) {
    this.patterns.set(id, processor);
    if (!silent) this.notify();
  }

  get(id: string): PatternProcessor | undefined {
    return this.patterns.get(id);
  }

  getAllIds(): string[] {
    return Array.from(this.patterns.keys());
  }

  // Simple observable pattern so the UI can refresh when new plugins are added
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const registry = new PatternRegistry();

// Export the Map version for backward compatibility where needed
export const VIBRATION_PATTERNS = registry;
