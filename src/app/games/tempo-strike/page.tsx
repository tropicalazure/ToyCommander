
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Trophy, Zap, Music2 } from "lucide-react";
import Link from "next/link";
import { applyVibrationSafe, stopAllDevices } from "@/lib/buttplug/toy-client";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { cn } from "@/lib/utils";

const GAME_DURATION = 30;
const INITIAL_BPM = 72;
const MAX_BPM = 126;
const PERFECT_MS = 55;
const GOOD_MS = 110;
const OK_MS = 200;

type GamePhase = 'idle' | 'playing' | 'complete';
type FeedbackLabel = 'PERFECT' | 'GOOD' | 'OK' | 'MISS' | null;

const FEEDBACK_COLORS: Record<NonNullable<FeedbackLabel>, string> = {
  PERFECT: 'text-primary',
  GOOD: 'text-green-400',
  OK: 'text-yellow-400',
  MISS: 'text-red-400',
};

export default function TempoStrikePage() {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bpm, setBpm] = useState(INITIAL_BPM);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [beatCount, setBeatCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackLabel>(null);
  const [totalStrikes, setTotalStrikes] = useState(0);
  const [perfectStrikes, setPerfectStrikes] = useState(0);

  const gameStartRef = useRef<number>(0);
  const nextBeatRef = useRef<number>(0);
  const beatPeriodRef = useRef<number>(60000 / INITIAL_BPM);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const vibTimerRef = useRef<NodeJS.Timeout | null>(null);

  useWakeLock(true);

  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const stopGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    if (vibTimerRef.current) clearTimeout(vibTimerRef.current);
    applyVibrationSafe(0);
    stopAllDevices();
  }, []);

  const showFeedback = useCallback((label: FeedbackLabel, intensity: number, duration: number) => {
    setFeedback(label);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 700);
    applyVibrationSafe(intensity);
    if (vibTimerRef.current) clearTimeout(vibTimerRef.current);
    vibTimerRef.current = setTimeout(() => applyVibrationSafe(0), duration);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setCombo(0);
    setBpm(INITIAL_BPM);
    setTimeLeft(GAME_DURATION);
    setBeatCount(0);
    setFeedback(null);
    setTotalStrikes(0);
    setPerfectStrikes(0);
    comboRef.current = 0;
    scoreRef.current = 0;

    const now = performance.now();
    gameStartRef.current = now;
    beatPeriodRef.current = 60000 / INITIAL_BPM;
    nextBeatRef.current = now + beatPeriodRef.current;

    setPhase('playing');

    const tick = () => {
      const now = performance.now();
      const elapsed = now - gameStartRef.current;
      const remaining = Math.max(0, GAME_DURATION * 1000 - elapsed);

      setTimeLeft(Math.ceil(remaining / 1000));

      // Escalate BPM linearly
      const t = elapsed / (GAME_DURATION * 1000);
      const currentBpm = INITIAL_BPM + (MAX_BPM - INITIAL_BPM) * Math.min(t, 1);
      beatPeriodRef.current = 60000 / currentBpm;
      setBpm(Math.round(currentBpm));

      // Fire beat
      if (now >= nextBeatRef.current) {
        setBeatCount(c => c + 1);
        nextBeatRef.current += beatPeriodRef.current;
        // Drift correction: if we fell multiple beats behind, fast-forward
        if (nextBeatRef.current < now) nextBeatRef.current = now + beatPeriodRef.current;
      }

      if (remaining <= 0) {
        stopGame();
        setPhase('complete');
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stopGame]);

  const handleStrike = useCallback(() => {
    if (phase !== 'playing') return;

    const now = performance.now();
    const period = beatPeriodRef.current;
    const distToNext = nextBeatRef.current - now;
    const distToPrev = period - distToNext;
    const closestMs = Math.min(Math.abs(distToNext), Math.abs(distToPrev));

    let label: NonNullable<FeedbackLabel>;
    let intensity: number;
    let dur: number;
    let pts: number;

    // Resolve the next combo synchronously so scoring uses the up-to-date
    // multiplier (reading comboRef inside a setCombo updater would lag by one).
    let nextCombo: number;
    if (closestMs <= PERFECT_MS) {
      label = 'PERFECT'; intensity = 1.0; dur = 280; pts = 30;
      nextCombo = Math.min(comboRef.current + 1, 8);
      setPerfectStrikes(s => s + 1);
    } else if (closestMs <= GOOD_MS) {
      label = 'GOOD'; intensity = 0.7; dur = 200; pts = 20;
      nextCombo = Math.min(comboRef.current + 1, 8);
    } else if (closestMs <= OK_MS) {
      label = 'OK'; intensity = 0.4; dur = 130; pts = 10;
      nextCombo = Math.min(comboRef.current + 1, 8);
    } else {
      label = 'MISS'; intensity = 0.06; dur = 80; pts = 0;
      nextCombo = 0;
    }

    comboRef.current = nextCombo;
    setCombo(nextCombo);
    setScore(s => s + pts * nextCombo);
    setTotalStrikes(s => s + 1);
    showFeedback(label, intensity, dur);
  }, [phase, showFeedback]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleStrike(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleStrike]);

  useEffect(() => {
    return () => stopGame();
  }, [stopGame]);

  const accuracy = totalStrikes > 0 ? Math.round((perfectStrikes / totalStrikes) * 100) : 0;
  const grade = accuracy >= 90 ? 'S' : accuracy >= 75 ? 'A' : accuracy >= 55 ? 'B' : accuracy >= 35 ? 'C' : 'D';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12 select-none">
      <div className="max-w-md w-full space-y-8">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <Link href="/games"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="text-right">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Tempo <span className="text-primary">Strike</span></h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Beat Reaction</p>
          </div>
        </header>

        <AnimatePresence mode="wait">

          {/* IDLE */}
          {phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="bg-card/40 border border-primary/20 rounded-3xl p-8 space-y-6 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <Music2 className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Hit the Beat</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">A circle pulses to the rhythm. Press <kbd className="px-1.5 py-0.5 bg-muted/30 rounded text-xs font-mono">SPACE</kbd> or tap <strong>STRIKE</strong> exactly on the beat. Accuracy drives intensity. BPM escalates from {INITIAL_BPM} → {MAX_BPM}.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[['PERFECT', '±55ms', 'text-primary'], ['GOOD', '±110ms', 'text-green-400'], ['MISS', '>200ms', 'text-red-400']].map(([label, range, color]) => (
                    <div key={label} className="bg-muted/10 rounded-xl p-3">
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", color)}>{label}</p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{range}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={startGame} className="w-full h-16 font-black uppercase tracking-widest text-lg rounded-2xl gap-3 shadow-xl shadow-primary/20">
                <Zap className="w-6 h-6" /> Start Game
              </Button>
            </motion.div>
          )}

          {/* PLAYING */}
          {phase === 'playing' && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6">
              <div className="flex justify-between w-full text-center">
                <div className="bg-card/40 border border-border/30 rounded-2xl px-4 py-3 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Score</p>
                  <p className="text-2xl font-black text-white tabular-nums">{score}</p>
                </div>
                <div className="bg-card/40 border border-border/30 rounded-2xl px-4 py-3 flex-1 mx-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Time</p>
                  <p className={cn("text-2xl font-black tabular-nums", timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white")}>{timeLeft}s</p>
                </div>
                <div className="bg-card/40 border border-border/30 rounded-2xl px-4 py-3 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Combo</p>
                  <p className="text-2xl font-black text-primary tabular-nums">{combo > 1 ? `×${combo}` : combo}</p>
                </div>
              </div>

              <div className="relative flex items-center justify-center w-56 h-56">
                {/* Beat pulse ring */}
                <motion.div
                  key={beatCount}
                  initial={{ scale: 1.4, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 0 }}
                  transition={{ duration: (60 / bpm) * 0.85, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full border-4 border-primary"
                />
                {/* Static outer ring */}
                <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                {/* Core circle */}
                <motion.div
                  key={`core-${beatCount}`}
                  initial={{ scale: 1.15 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: (60 / bpm) * 0.3, ease: "easeOut" }}
                  className="w-36 h-36 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center"
                >
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">BPM</p>
                    <p className="text-3xl font-black text-white tabular-nums">{bpm}</p>
                  </div>
                </motion.div>

                {/* Feedback overlay */}
                <AnimatePresence>
                  {feedback && (
                    <motion.div
                      key={feedback + Date.now()}
                      initial={{ opacity: 1, y: 0, scale: 1 }}
                      animate={{ opacity: 0, y: -30, scale: 1.2 }}
                      transition={{ duration: 0.6 }}
                      className={cn("absolute -top-8 font-black text-2xl uppercase tracking-widest pointer-events-none", FEEDBACK_COLORS[feedback])}
                    >
                      {feedback}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                onPointerDown={handleStrike}
                className="w-full h-20 font-black uppercase tracking-widest text-xl rounded-2xl gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-transform touch-none"
              >
                <Zap className="w-7 h-7" /> STRIKE
              </Button>

              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                Space bar also works · BPM escalates to {MAX_BPM}
              </p>
            </motion.div>
          )}

          {/* COMPLETE */}
          {phase === 'complete' && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="bg-card/40 border border-primary/20 rounded-3xl p-8 text-center space-y-6">
                <Trophy className="w-16 h-16 text-primary mx-auto animate-bounce" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Session Complete</p>
                  <h3 className="text-5xl font-black text-white uppercase tracking-tighter">{grade}</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[['Score', score.toString(), 'text-primary'], ['Accuracy', `${accuracy}%`, 'text-white'], ['Strikes', totalStrikes.toString(), 'text-white']].map(([label, val, color]) => (
                    <div key={label} className="bg-muted/10 rounded-xl p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                      <p className={cn("text-xl font-black tabular-nums", color)}>{val}</p>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {perfectStrikes} perfect strikes · Max BPM {MAX_BPM}
                </div>
              </div>
              <Button onClick={startGame} className="w-full h-14 font-black uppercase tracking-widest rounded-2xl gap-2">
                <Zap className="w-5 h-5" /> Play Again
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
