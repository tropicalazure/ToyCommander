
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Trophy, Flame, Shield, Activity, Zap } from "lucide-react";
import Link from "next/link";
import { applyVibrationSafe, stopAllDevices } from "@/lib/buttplug/toy-client";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { cn } from "@/lib/utils";

const LEVELS = [
  { intensity: 0.20, duration: 12, label: "THRESHOLD", color: "#74B9FF" },
  { intensity: 0.30, duration: 15, label: "WARMUP",    color: "#55EFC4" },
  { intensity: 0.45, duration: 15, label: "RISING",    color: "#FDCB6E" },
  { intensity: 0.55, duration: 20, label: "SUSTAINED", color: "#FFA500" },
  { intensity: 0.65, duration: 20, label: "PRESSURE",  color: "#FF7675" },
  { intensity: 0.75, duration: 25, label: "INTENSE",   color: "#FF4757" },
  { intensity: 0.85, duration: 25, label: "EXTREME",   color: "#D63031" },
  { intensity: 1.00, duration: 30, label: "MAXIMUM",   color: "#6C5CE7" },
];

const REST_DURATION = 5;
const COUNTDOWN_DURATION = 3;
const CIRCUMFERENCE = 2 * Math.PI * 42;

type Phase = 'idle' | 'countdown' | 'active' | 'rest' | 'complete' | 'tapped_out';

export default function EnduranceChallengePage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [levelIndex, setLevelIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDuration, setTotalDuration] = useState(1);
  const [levelsCompleted, setLevelsCompleted] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const levelRef = useRef(0);

  useWakeLock(true);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { levelRef.current = levelIndex; }, [levelIndex]);

  const clearTick = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const endGame = useCallback((reason: 'complete' | 'tapped_out') => {
    clearTick();
    applyVibrationSafe(0);
    stopAllDevices();
    if (reason === 'complete') {
      setLevelsCompleted(LEVELS.length);
    }
    setPhase(reason);
  }, []);

  const startLevel = useCallback((idx: number) => {
    const lvl = LEVELS[idx];
    setLevelIndex(idx);
    setPhase('countdown');
    setTimeLeft(COUNTDOWN_DURATION);
    setTotalDuration(COUNTDOWN_DURATION);
    applyVibrationSafe(0);

    clearTick();
    let remaining = COUNTDOWN_DURATION;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearTick();
        setPhase('active');
        setTimeLeft(lvl.duration);
        setTotalDuration(lvl.duration);
        applyVibrationSafe(lvl.intensity);

        let activeRemaining = lvl.duration;
        intervalRef.current = setInterval(() => {
          activeRemaining -= 1;
          setTimeLeft(activeRemaining);
          if (activeRemaining <= 0) {
            clearTick();
            setLevelsCompleted(idx + 1);
            if (idx + 1 >= LEVELS.length) {
              endGame('complete');
              return;
            }
            setPhase('rest');
            setTimeLeft(REST_DURATION);
            setTotalDuration(REST_DURATION);
            applyVibrationSafe(0);
            let restRemaining = REST_DURATION;
            intervalRef.current = setInterval(() => {
              restRemaining -= 1;
              setTimeLeft(restRemaining);
              if (restRemaining <= 0) {
                clearTick();
                startLevel(idx + 1);
              }
            }, 1000);
          }
        }, 1000);
      }
    }, 1000);
  }, [endGame]);

  const handleStart = () => {
    setLevelsCompleted(0);
    startLevel(0);
  };

  const handleTapOut = () => {
    clearTick();
    endGame('tapped_out');
  };

  const handleRestart = () => {
    setLevelsCompleted(0);
    setLevelIndex(0);
    setPhase('idle');
  };

  useEffect(() => {
    return () => { clearTick(); stopAllDevices(); };
  }, []);

  const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const currentLevel = LEVELS[levelIndex];
  const accentColor = currentLevel?.color ?? '#FF6B9D';

  const scorePercent = Math.round((levelsCompleted / LEVELS.length) * 100);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12">
      <div className="max-w-md w-full space-y-8">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <Link href="/games"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="text-right">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Endurance <span className="text-primary">Challenge</span></h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Test Your Limits</p>
          </div>
        </header>

        <AnimatePresence mode="wait">

          {/* IDLE */}
          {phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="bg-card/40 border border-primary/20 rounded-3xl p-8 space-y-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mx-auto">
                  <Flame className="w-10 h-10 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">8 Levels Await</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Endure each escalating wave to advance. Tap Out at any time. How far can you go?</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {LEVELS.map((lvl, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/10 border border-border/20">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lvl.color }} />
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{lvl.label}</p>
                      <p className="text-[10px] font-black text-white">{Math.round(lvl.intensity * 100)}%</p>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={handleStart} className="w-full h-16 font-black uppercase tracking-widest text-lg rounded-2xl gap-3 shadow-xl shadow-primary/20">
                <Activity className="w-6 h-6" /> Begin Challenge
              </Button>
            </motion.div>
          )}

          {/* COUNTDOWN */}
          {phase === 'countdown' && (
            <motion.div key="countdown" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-8">
              <div className="text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Level {levelIndex + 1} of {LEVELS.length}</p>
                <h3 className="text-4xl font-black text-white uppercase tracking-tighter" style={{ color: accentColor }}>{currentLevel?.label}</h3>
                <p className="text-sm text-muted-foreground">{Math.round((currentLevel?.intensity ?? 0) * 100)}% intensity · {currentLevel?.duration}s duration</p>
              </div>
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6" strokeLinecap="round"
                    stroke={accentColor}
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">GET READY</p>
                  <p className="text-6xl font-black text-white tabular-nums">{timeLeft}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ACTIVE */}
          {phase === 'active' && (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-8">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Level {levelIndex + 1} of {LEVELS.length}</p>
                <h3 className="text-5xl font-black uppercase tracking-tighter mt-1" style={{ color: accentColor }}>{currentLevel?.label}</h3>
              </div>

              <div className="relative w-52 h-52">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                    stroke={accentColor}
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ENDURE</p>
                  <p className="text-5xl font-black text-white tabular-nums leading-none">{timeLeft}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">seconds</p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.3, 0.15] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full"
                  style={{ background: `radial-gradient(circle, ${accentColor}40, transparent 70%)` }}
                />
              </div>

              <div className="w-full bg-card/40 border border-border/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Intensity</p>
                  <p className="text-3xl font-black text-white">{Math.round((currentLevel?.intensity ?? 0) * 100)}<span className="text-lg text-muted-foreground">%</span></p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Levels Left</p>
                  <p className="text-3xl font-black text-white">{LEVELS.length - levelIndex - 1}</p>
                </div>
              </div>

              <Button variant="destructive" onClick={handleTapOut} className="w-full h-14 font-black uppercase tracking-widest text-sm rounded-2xl gap-2 shadow-lg shadow-destructive/20">
                <Shield className="w-5 h-5" /> Tap Out
              </Button>
            </motion.div>
          )}

          {/* REST */}
          {phase === 'rest' && (
            <motion.div key="rest" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-8">
              <div className="text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Level {levelIndex} Complete</p>
                <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Rest</h3>
                <p className="text-sm text-muted-foreground">Next: {LEVELS[levelIndex + 1]?.label} at {Math.round((LEVELS[levelIndex + 1]?.intensity ?? 0) * 100)}%</p>
              </div>
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6" strokeLinecap="round"
                    stroke="#55EFC4"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">NEXT IN</p>
                  <p className="text-6xl font-black text-white tabular-nums">{timeLeft}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* COMPLETE */}
          {(phase === 'complete' || phase === 'tapped_out') && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-8">
              <div className="bg-card/40 border border-primary/20 rounded-3xl p-10 w-full flex flex-col items-center gap-6 text-center">
                {phase === 'complete' ? (
                  <Trophy className="w-20 h-20 text-primary animate-bounce" />
                ) : (
                  <Shield className="w-20 h-20 text-muted-foreground opacity-60" />
                )}
                <div className="space-y-2">
                  <h3 className="text-4xl font-black text-white uppercase tracking-tighter">
                    {phase === 'complete' ? 'Conquered' : 'Tapped Out'}
                  </h3>
                  <p className="text-muted-foreground">
                    {phase === 'complete'
                      ? 'All 8 levels endured. Absolute maximum achieved.'
                      : `Reached Level ${levelsCompleted + 1} of ${LEVELS.length} · ${LEVELS[levelsCompleted]?.label ?? ''}`}
                  </p>
                </div>
                <div className="w-full bg-muted/10 rounded-2xl p-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Score</span>
                    <span className="text-3xl font-black text-primary">{scorePercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${scorePercent}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>{levelsCompleted} / {LEVELS.length} levels</span>
                    <span>
                      {phase === 'complete' ? (
                        <span className="flex items-center gap-1 text-primary"><Zap className="w-3 h-3" /> Perfect</span>
                      ) : (
                        LEVELS[levelsCompleted - 1]?.label ?? 'Started'
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <Button onClick={handleRestart} className="w-full h-14 font-black uppercase tracking-widest rounded-2xl gap-2">
                <Flame className="w-5 h-5" /> Try Again
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
