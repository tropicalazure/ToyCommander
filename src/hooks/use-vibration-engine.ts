
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { registry } from "@/lib/vibration-patterns";

/**
 * Hook to manage the vibration generation logic.
 * Handles patterns, manual values, and audio analysis.
 */

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

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pulseSpeedRef = useRef(pulseSpeed);
  
  useEffect(() => { pulseSpeedRef.current = pulseSpeed; }, [pulseSpeed]);

  // Sync with registry in case new plugins are added at runtime
  useEffect(() => {
    return registry.subscribe(() => {
      setAvailablePatterns(registry.getAllIds());
    });
  }, []);

  const throttledEmit = useCallback((val: number) => {
    if (disabled) return;
    setVibration(val);
    onValueChange(val);
  }, [disabled, onValueChange]);

  const stopAll = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current) audioContextRef.current.suspend().catch(() => {});
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    
    animationRef.current = null;
    setIsAudioActive(false);
    setIsSystemRunning(false);
    setPatternType(null);
    setVibration(0);
    onValueChange(0);
  }, [onValueChange]);

  const runPattern = useCallback((type: string | null) => {
    if (disabled || !type) {
      if (!type) stopAll();
      return;
    }
    
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    setPatternType(type);
    setIsSystemRunning(true);
    startTimeRef.current = performance.now();

    const loop = (time: number) => {
      const elapsed = (time - startTimeRef.current) / 1000;
      
      const processor = registry.get(type);
      const val = processor 
        ? processor({ elapsed, speed: pulseSpeedRef.current }) 
        : undefined;

      if (val !== undefined) {
        throttledEmit(val);
      }
      
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
  }, [disabled, throttledEmit, stopAll]);

  const toggleAudio = async () => {
    if (disabled) return;
    if (isAudioActive) {
      stopAll();
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
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const normalized = Math.min((sum / dataArray.length) / 40, 1);
        setAudioLevel(normalized);
        throttledEmit(normalized);
        animationRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (err) {
      console.error("[useVibrationEngine] Mic access denied", err);
    }
  };

  const handleModeChange = (newMode: string) => {
    if (disabled) return;
    stopAll();
    setMode(newMode);
    if (newMode === 'manual') throttledEmit(manualValue);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  return {
    mode,
    setMode: handleModeChange,
    manualValue,
    setManualValue: (val: number) => {
      setManualValue(val);
      if (mode === 'manual') throttledEmit(val);
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
