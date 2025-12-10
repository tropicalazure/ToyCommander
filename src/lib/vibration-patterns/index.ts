
import { PatternProcessor } from "@/types/vibration";
import { pulse } from "./pulse";
import { heartbeat } from "./heartbeat";
import { waves } from "./waves";
import { erratic } from "./erratic";
import { surge } from "./surge";
import { fireworks } from "./fireworks";

/**
 * The Dynamic Pattern Registry.
 * Allows for runtime "plugin" registration of new vibration sensations.
 */
class PatternRegistry {
  private patterns: Map<string, PatternProcessor> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Register Default System Patterns
    this.register('pulse', pulse);
    this.register('heartbeat', heartbeat);
    this.register('waves', waves);
    this.register('erratic', erratic);
    this.register('surge', surge);
    this.register('fireworks', fireworks);
  }

  /**
   * Registers a new vibration pattern.
   * This is the "Plugin API" that can be called at runtime.
   */
  register(id: string, processor: PatternProcessor) {
    this.patterns.set(id, processor);
    this.notify();
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
