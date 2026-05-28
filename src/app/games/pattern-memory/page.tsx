
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Trophy, Brain, RefreshCw } from "lucide-react";
import Link from "next/link";
import { applyVibrationSafe, stopAllDevices } from "@/lib/buttplug/toy-client";
import { registry } from "@/lib/vibration-patterns";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { cn } from "@/lib/utils";

const GAME_PATTERNS = [
  { id: 'pulse',     label: 'PULSE',   color: '#FF6B9D', bg: 'bg-pink-500/20   border-pink-500/40'   },
  { id: 'heartbeat', label: 'HEART',   color: '#FF4444', bg: 'bg-red-500/20    border-red-500/40'    },
  { id: 'waves',     label: 'WAVES',   color: '#4ECDC4', bg: 'bg-teal-500/20   border-teal-500/40'   },
  { id: 'surge',     label: 'SURGE',   color: '#FF9500', bg: 'bg-orange-500/20 border-orange-500/40' },
  { id: 'breath',    label: 'BREATHE', color: '#74B9FF', bg: 'bg-blue-400/20   border-blue-400/40'   },
  { id: 'ocean',     label: 'OCEAN',   color: '#00CEC9', bg: 'bg-cyan-500/20   border-cyan-500/40'   },
  { id: 'flutter',   label: 'FLUTTER', color: '#C77DFF', bg: 'bg-purple-500/20 border-purple-500/40' },
  { id: 'earthquake',label: 'QUAKE',   color: '#FDCB6E', bg: 'bg-yellow-500/20 border-yellow-500/40' },
];

const MAX_ROUNDS = 10;
const SHOW_DURATION = 1100; // ms per pattern in sequence
const SHOW_GAP = 250;       // ms gap between patterns

type Phase = 'idle' | 'showing' | 'input' | 'correct' | 'wrong' | 'victory';

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export default function PatternMemoryPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerInput, setPlayerInput] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [wrongPattern, setWrongPattern] = useState<string | null>(null);

  const snippetRef = useRef<number | null>(null);
  const abortRef = useRef(false);

  useWakeLock(true);

  const stopSnippet = useCallback(() => {
    if (snippetRef.current) cancelAnimationFrame(snippetRef.current);
    applyVibrationSafe(0);
  }, []);

  const playSnippet = useCallback((patternId: string, durationMs: number): Promise<void> => {
    return new Promise((resolve) => {
      stopSnippet();
      const processor = registry.get(patternId);
      if (!processor) { resolve(); return; }
      const startMs = performance.now();
      const tick = () => {
        if (abortRef.current) { applyVibrationSafe(0); resolve(); return; }
        const elapsed = (performance.now() - startMs) / 1000;
        if (elapsed * 1000 >= durationMs) { applyVibrationSafe(0); resolve(); return; }
        applyVibrationSafe((processor({ elapsed, speed: 0.55 }) ?? 0));
        snippetRef.current = requestAnimationFrame(tick);
      };
      snippetRef.current = requestAnimationFrame(tick);
    });
  }, [stopSnippet]);

  const showSequence = useCallback(async (seq: string[]) => {
    abortRef.current = false;
    setPhase('showing');
    setPlayerInput([]);
    setHighlighted(null);

    for (const patId of seq) {
      if (abortRef.current) return;
      await delay(SHOW_GAP);
      setHighlighted(patId);
      await playSnippet(patId, SHOW_DURATION);
      setHighlighted(null);
      await delay(SHOW_GAP);
    }

    if (!abortRef.current) {
      setPhase('input');
      setPlayerInput([]);
    }
  }, [playSnippet]);

  const startGame = useCallback(() => {
    abortRef.current = false;
    const firstPat = GAME_PATTERNS[Math.floor(Math.random() * GAME_PATTERNS.length)].id;
    const seq = [firstPat];
    setSequence(seq);
    setRound(1);
    setWrongPattern(null);
    showSequence(seq);
  }, [showSequence]);

  const handleTap = useCallback(async (patId: string) => {
    if (phase !== 'input' || locked) return;
    setLocked(true);

    setHighlighted(patId);
    await playSnippet(patId, 500);
    setHighlighted(null);

    const newInput = [...playerInput, patId];
    const idx = newInput.length - 1;

    if (sequence[idx] !== patId) {
      // Wrong
      setWrongPattern(patId);
      applyVibrationSafe(0.8);
      await delay(600);
      applyVibrationSafe(0);
      setPhase('wrong');
      setLocked(false);
      return;
    }

    setPlayerInput(newInput);

    if (newInput.length === sequence.length) {
      // Round complete
      if (sequence.length >= MAX_ROUNDS) {
        setPhase('victory');
        // Victory burst
        applyVibrationSafe(1.0);
        await delay(300);
        applyVibrationSafe(0.5);
        await delay(300);
        applyVibrationSafe(1.0);
        await delay(300);
        applyVibrationSafe(0);
        setLocked(false);
        return;
      }

      setPhase('correct');
      await delay(700);

      const nextPat = GAME_PATTERNS[Math.floor(Math.random() * GAME_PATTERNS.length)].id;
      const newSeq = [...sequence, nextPat];
      setSequence(newSeq);
      setRound(r => r + 1);
      showSequence(newSeq);
    }

    setLocked(false);
  }, [phase, locked, playerInput, sequence, playSnippet, showSequence]);

  const handleRestart = useCallback(() => {
    abortRef.current = true;
    stopSnippet();
    stopAllDevices();
    setPhase('idle');
    setSequence([]);
    setPlayerInput([]);
    setRound(0);
    setHighlighted(null);
    setLocked(false);
    setWrongPattern(null);
  }, [stopSnippet]);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      stopSnippet();
      stopAllDevices();
    };
  }, [stopSnippet]);

  const phaseLabel: Record<Phase, string> = {
    idle: 'Ready',
    showing: 'Memorize',
    input: 'Your Turn',
    correct: 'Correct!',
    wrong: 'Wrong!',
    victory: 'Completed!',
  };

  const phaseColor: Record<Phase, string> = {
    idle: 'text-muted-foreground',
    showing: 'text-primary',
    input: 'text-white',
    correct: 'text-green-400',
    wrong: 'text-red-400',
    victory: 'text-primary',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12 select-none">
      <div className="max-w-md w-full space-y-6">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <Link href="/games"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="text-right">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Pattern <span className="text-primary">Memory</span></h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Tactile Simon</p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="bg-card/40 border border-primary/20 rounded-3xl p-8 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <Brain className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Remember the Feeling</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The toy plays a sequence of vibration patterns. Repeat them back in order.
                    Each round adds one more. Can you reach all {MAX_ROUNDS}?
                  </p>
                </div>
              </div>
              <Button onClick={startGame} className="w-full h-16 font-black uppercase tracking-widest text-lg rounded-2xl gap-3 shadow-xl shadow-primary/20">
                <Brain className="w-6 h-6" /> Begin
              </Button>
            </motion.div>
          )}

          {(phase !== 'idle') && (
            <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Status bar */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <span className={cn("text-sm font-black uppercase tracking-widest transition-colors", phaseColor[phase])}>
                    {phaseLabel[phase]}
                  </span>
                  {phase === 'showing' && (
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
                      className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Round</span>
                  <span className="text-lg font-black text-white tabular-nums">{round}/{MAX_ROUNDS}</span>
                </div>
              </div>

              {/* Sequence dots */}
              <div className="flex gap-1.5 flex-wrap justify-center px-2">
                {sequence.map((patId, i) => {
                  const pat = GAME_PATTERNS.find(p => p.id === patId);
                  const isPlayed = i < playerInput.length;
                  return (
                    <div key={i} className="w-3 h-3 rounded-full border transition-all"
                      style={{
                        backgroundColor: isPlayed ? (pat?.color ?? '#fff') : 'transparent',
                        borderColor: pat?.color ?? '#fff',
                        opacity: isPlayed ? 1 : 0.3,
                      }}
                    />
                  );
                })}
              </div>

              {/* Pattern buttons */}
              <div className="grid grid-cols-4 gap-3">
                {GAME_PATTERNS.map((pat) => {
                  const isHighlighted = highlighted === pat.id;
                  const isWrong = wrongPattern === pat.id;
                  return (
                    <motion.button
                      key={pat.id}
                      onPointerDown={() => handleTap(pat.id)}
                      disabled={phase !== 'input' || locked}
                      animate={isHighlighted ? { scale: 1.12 } : { scale: 1 }}
                      transition={{ duration: 0.08 }}
                      className={cn(
                        "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                        pat.bg,
                        isHighlighted && "brightness-150 shadow-lg",
                        isWrong && "border-red-500 bg-red-500/30",
                        phase !== 'input' && "opacity-60 cursor-not-allowed",
                        phase === 'input' && !locked && "hover:brightness-125 active:scale-95 cursor-pointer",
                      )}
                      style={isHighlighted ? { boxShadow: `0 0 24px ${pat.color}80` } : undefined}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pat.color }} />
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/80">{pat.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Restart */}
              <div className="flex justify-center pt-2">
                <Button variant="ghost" size="sm" onClick={handleRestart}
                  className="text-muted-foreground hover:text-white gap-2 text-xs font-black uppercase tracking-widest">
                  <RefreshCw className="w-3 h-3" /> Restart
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Victory overlay */}
        <AnimatePresence>
          {phase === 'victory' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 p-8"
            >
              <Trophy className="w-24 h-24 text-primary animate-bounce" />
              <div className="text-center space-y-2">
                <h3 className="text-5xl font-black text-white uppercase tracking-tighter">Perfect Memory</h3>
                <p className="text-muted-foreground">All {MAX_ROUNDS} rounds completed. Flawless.</p>
              </div>
              <Button onClick={handleRestart} className="h-14 px-12 font-black uppercase tracking-widest rounded-2xl gap-2">
                <Brain className="w-5 h-5" /> Play Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wrong overlay */}
        <AnimatePresence>
          {phase === 'wrong' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 p-8"
            >
              <div className="text-center space-y-4">
                <div className="text-8xl font-black text-red-400">✗</div>
                <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Wrong Pattern</h3>
                <p className="text-muted-foreground">You reached round {round} with a sequence of {sequence.length}.</p>
              </div>
              <Button onClick={handleRestart} variant="destructive" className="h-14 px-12 font-black uppercase tracking-widest rounded-2xl gap-2">
                <RefreshCw className="w-5 h-5" /> Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
