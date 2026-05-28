
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { registry } from "@/lib/vibration-patterns";

export interface VibrationEngine {
  mode: string;
  setMode: (mode: string) => void;
  manualValue: number;
  setManualValue: (val: number) => void;
  pulseSpeed: number;
  setPulseSpeed: (speed: number) => void;
  patternType: string | null;
  setPattern: (type: string | null) => void;
  isAudioActive: boolean;
  toggleAudio: () => Promise<void>;
  audioLevel: number;
  isSystemRunning: boolean;
  stopAll: () => void;
  vibration: number;
  availablePatterns: string[];
}

interface UseVibrationEngineProps {
  onValueChange: (val: number) => void;
  disabled?: boolean;
}

const BLEND_DURATION_MS = 250;
// ~30fps for background timer — enough for smooth pattern playback
const BG_TICK_MS = 33;

export function useVibrationEngine({ onValueChange, disabled = false }: UseVibrationEngineProps) {
  const [mode, setMode] = useState<string>("manual");
  const [manualValue, setManualValue] = useState(0);
  const [pulseSpeed, setPulseSpeed] = useState(0.5);
  const [patternType, setPatternType] = useState<string | null>(null);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSystemRunning, setIsSystemRunning] = useState(false);
  const [vibration, setVibration] = useState(0);
  const [availablePatterns, setAvailablePatterns] = useState<string[]>(registry.getAllIds());

  const animationRef = useRef<number | null>(null);   // RAF handle
  const bgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // background timer handle
  const currentLoopFnRef = useRef<(() => void) | null>(null); // current loop fn for visibility switching
  const bgAudioCtxRef = useRef<AudioContext | null>(null);    // keep-alive AudioContext

  const transitionRafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pulseSpeedRef = useRef(pulseSpeed);
  const emittedRef = useRef(0);
  const manualValueRef = useRef(manualValue);

  useEffect(() => { pulseSpeedRef.current = pulseSpeed; }, [pulseSpeed]);
  useEffect(() => { manualValueRef.current = manualValue; }, [manualValue]);

  useEffect(() => {
    return registry.subscribe(() => setAvailablePatterns(registry.getAllIds()));
  }, []);

  // --- Background keep-alive AudioContext ---
  // Browsers throttle setTimeout to ~1000ms on hidden tabs unless audio is processing.
  // A running AudioContext at near-zero output prevents that throttle.

  const startBgAudio = useCallback(() => {
    if (bgAudioCtxRef.current) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // 1 Hz at 0.00001 gain — subsonic frequency, inaudible at any volume
      osc.frequency.value = 1;
      gain.gain.value = 0.00001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      bgAudioCtxRef.current = ctx;
    } catch {}
  }, []);

  const stopBgAudio = useCallback(() => {
    if (!bgAudioCtxRef.current) return;
    try { bgAudioCtxRef.current.close(); } catch {}
    bgAudioCtxRef.current = null;
  }, []);

  // --- Unified timer management ---

  const cancelAllTimers = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (bgTimerRef.current !== null) {
      clearTimeout(bgTimerRef.current);
      bgTimerRef.current = null;
    }
    currentLoopFnRef.current = null;
  }, []);

  // Schedule the next loop tick: RAF when visible, setTimeout when hidden
  const scheduleLoop = useCallback((fn: () => void) => {
    if (document.visibilityState === 'hidden') {
      bgTimerRef.current = setTimeout(fn, BG_TICK_MS);
      animationRef.current = null;
    } else {
      animationRef.current = requestAnimationFrame(fn);
      bgTimerRef.current = null;
    }
  }, []);

  // When the tab goes to background, RAF freezes in place — restart as timer.
  // When returning to foreground, the loop switches back to RAF on its next tick.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (animationRef.current !== null && currentLoopFnRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
          startBgAudio();
          bgTimerRef.current = setTimeout(currentLoopFnRef.current, BG_TICK_MS);
        }
      } else {
        stopBgAudio();
        // Loop reschedules itself as RAF on the next tick automatically
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [startBgAudio, stopBgAudio]);

  // --- Core emit + transition ---

  const throttledEmit = useCallback((val: number) => {
    if (disabled) return;
    emittedRef.current = val;
    setVibration(val);
    onValueChange(val);
  }, [disabled, onValueChange]);

  const cancelTransition = useCallback(() => {
    if (transitionRafRef.current !== null) {
      cancelAnimationFrame(transitionRafRef.current);
      transitionRafRef.current = null;
    }
  }, []);

  const crossfadeTo = useCallback((target: number, durationMs: number, onDone?: () => void) => {
    cancelTransition();
    const from = emittedRef.current;
    if (Math.abs(from - target) < 0.005 || document.visibilityState === 'hidden') {
      emittedRef.current = target;
      setVibration(target);
      onValueChange(target);
      onDone?.();
      return;
    }
    const start = performance.now();
    const loop = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - t) ** 3;
      const val = from + (target - from) * eased;
      emittedRef.current = val;
      setVibration(val);
      onValueChange(val);
      if (t < 1) {
        transitionRafRef.current = requestAnimationFrame(loop);
      } else {
        transitionRafRef.current = null;
        onDone?.();
      }
    };
    transitionRafRef.current = requestAnimationFrame(loop);
  }, [cancelTransition, onValueChange]);

  const stopAll = useCallback(() => {
    cancelAllTimers();
    cancelTransition();
    stopBgAudio();
    if (audioContextRef.current) audioContextRef.current.suspend().catch(() => {});
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setIsAudioActive(false);
    setIsSystemRunning(false);
    setPatternType(null);
    emittedRef.current = 0;
    setVibration(0);
    onValueChange(0);
  }, [cancelAllTimers, cancelTransition, stopBgAudio, onValueChange]);

  const runPattern = useCallback((type: string | null) => {
    if (disabled || !type) {
      if (!type) {
        cancelAllTimers();
        setPatternType(null);
        setIsSystemRunning(false);
        crossfadeTo(0, BLEND_DURATION_MS);
      }
      return;
    }

    cancelAllTimers();
    cancelTransition();

    setPatternType(type);
    setIsSystemRunning(true);
    startTimeRef.current = performance.now();

    const blendFrom = emittedRef.current;

    const loop = () => {
      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      const processor = registry.get(type);
      const patternVal = processor ? processor({ elapsed, speed: pulseSpeedRef.current }) : undefined;

      if (patternVal !== undefined) {
        const blendT = Math.min((now - startTimeRef.current) / BLEND_DURATION_MS, 1);
        const eased = 1 - (1 - blendT) ** 2;
        const val = blendFrom + (patternVal - blendFrom) * eased;
        throttledEmit(val);
      }

      scheduleLoop(loop);
    };

    currentLoopFnRef.current = loop;
    scheduleLoop(loop);
  }, [disabled, throttledEmit, cancelAllTimers, cancelTransition, crossfadeTo, scheduleLoop]);

  const toggleAudio = async () => {
    if (disabled) return;
    if (isAudioActive) {
      cancelAllTimers();
      if (audioContextRef.current) audioContextRef.current.suspend().catch(() => {});
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      setIsAudioActive(false);
      setIsSystemRunning(false);
      crossfadeTo(0, BLEND_DURATION_MS);
      return;
    }
    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        setIsAudioActive(true);
        setIsSystemRunning(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      setIsAudioActive(true);
      setIsSystemRunning(true);
      const loop = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const normalized = Math.min((sum / dataArray.length) / 40, 1);
        setAudioLevel(normalized);
        throttledEmit(normalized);
        scheduleLoop(loop);
      };
      currentLoopFnRef.current = loop;
      scheduleLoop(loop);
    } catch (err) {
      console.error("[useVibrationEngine] Mic access denied", err);
    }
  };

  const handleModeChange = (newMode: string) => {
    if (disabled) return;
    cancelAllTimers();
    if (audioContextRef.current) audioContextRef.current.suspend().catch(() => {});
    setIsAudioActive(false);
    setIsSystemRunning(false);
    setPatternType(null);
    setMode(newMode);
    const target = newMode === 'manual' ? manualValueRef.current : 0;
    crossfadeTo(target, BLEND_DURATION_MS);
  };

  useEffect(() => {
    return () => {
      cancelAllTimers();
      if (transitionRafRef.current) cancelAnimationFrame(transitionRafRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      stopBgAudio();
    };
  }, [cancelAllTimers, stopBgAudio]);

  return {
    mode,
    setMode: handleModeChange,
    manualValue,
    setManualValue: (val: number) => {
      setManualValue(val);
      manualValueRef.current = val;
      if (mode === 'manual') {
        cancelTransition();
        throttledEmit(val);
      }
    },
    pulseSpeed,
    setPulseSpeed,
    patternType,
    setPattern: runPattern,
    isAudioActive,
    toggleAudio,
    audioLevel,
    isSystemRunning,
    stopAll,
    vibration,
    availablePatterns
  };
}
