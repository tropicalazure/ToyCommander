
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, Trophy, Zap, Music2, Settings2, BluetoothOff,
  Flame, Gauge, Clock, Users, Infinity as InfinityIcon, Heart, Square, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { applyVibrationSafe, stopAllDevices, getClient, getActiveDeviceIndices } from "@/lib/buttplug/toy-client";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

const DIFFS = {
  easy:   { windows: { perfect: 78, good: 150, ok: 250 }, bpmMin: 60, bpmMax: 104 },
  normal: { windows: { perfect: 55, good: 110, ok: 200 }, bpmMin: 72, bpmMax: 126 },
  hard:   { windows: { perfect: 42, good: 85,  ok: 160 }, bpmMin: 92, bpmMax: 168 },
} as const;

const SPICE_MULT = { gentle: 0.6, normal: 1.0, intense: 1.25 } as const;

const LIVES = 3;
const COMBO_CAP = 12;
const TICK_MS = 33;            // ~30fps loop (setTimeout, survives an unfocused window)
const CHARGE_DECAY = 0.07;     // per second — must keep performing to hold the reward
const BOOST_DECAY = 1.6;       // per second — the per-hit spike fades fast
const SURVIVAL_RAMP = 0.6;     // BPM gained per second in survival
const SURVIVAL_BPM_CAP = 220;
const BEST_KEY = "tc_tempo_best_survival";

type Difficulty = keyof typeof DIFFS;
type DiffConfig = (typeof DIFFS)[Difficulty];
type Spice = keyof typeof SPICE_MULT;
type Mode = "classic" | "survival";
type Phase = "idle" | "countdown" | "playing" | "paused" | "handoff" | "result";
type Grade = "PERFECT" | "GOOD" | "OK" | "MISS";

const FEEDBACK_COLORS: Record<Grade, string> = {
  PERFECT: "text-primary",
  GOOD: "text-green-400",
  OK: "text-yellow-400",
  MISS: "text-red-400",
};

interface Beat { time: number; resolved: boolean; flashed: boolean; }

interface ResultData {
  mode: Mode;
  score: number;
  accuracy: number;
  grade: string;
  maxBpm: number;
  maxCombo: number;
  perfect: number;
  total: number;
  duo?: { scores: number[]; winner: number };
  newBest?: boolean;
}

const C46 = 2 * Math.PI * 46;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function chargeColor(c: number) {
  if (c >= 0.66) return "#FF4757";
  if (c >= 0.33) return "#FDCB6E";
  return "#74B9FF";
}

// ---------------------------------------------------------------------------
// Settings controls
// ---------------------------------------------------------------------------

function Pills<T extends string | number>({ value, options, onChange, disabled }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className={cn("flex bg-zinc-900/60 p-1 rounded-xl border border-white/5 gap-1", disabled && "opacity-40 pointer-events-none")}>
      {options.map((o) => (
        <button key={String(o.value)} onClick={() => onChange(o.value)}
          className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", value === o.value ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn("relative w-11 h-6 rounded-full transition-colors shrink-0", on ? "bg-primary" : "bg-zinc-700", disabled && "opacity-40")}>
      <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", on ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

function SettingRow({ icon: Icon, label, hint, children }: { icon: React.ElementType; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-white leading-none">{label}</p>
          {hint && <p className="text-[9px] text-muted-foreground mt-1 truncate">{hint}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TempoStrikePage() {
  // Display state
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bpm, setBpm] = useState<number>(DIFFS.normal.bpmMin);
  const [charge, setChargeState] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [timeLeft, setTimeLeft] = useState(0);
  const [beatCount, setBeatCount] = useState(0);
  const [feedback, setFeedback] = useState<Grade | null>(null);
  const [countNum, setCountNum] = useState(3);
  const [result, setResult] = useState<ResultData | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [armedCount, setArmedCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Settings
  const [mode, setMode] = useState<Mode>("classic");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [length, setLength] = useState<30 | 60>(30);
  const [spice, setSpice] = useState<Spice>("normal");
  const [duo, setDuo] = useState(false);

  // Engine refs
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);

  const elapsedRef = useRef(0);
  const lastTickRef = useRef(0);
  const nextBeatRef = useRef(0);
  const beatsRef = useRef<Beat[]>([]);
  const chargeRef = useRef(0);
  const boostRef = useRef(0);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const totalRef = useRef(0);
  const perfectRef = useRef(0);
  const maxComboRef = useRef(0);
  const maxBpmRef = useRef(0);
  const livesRef = useRef(LIVES);
  const matchRef = useRef<{ turn: number; scores: number[] }>({ turn: 1, scores: [] });

  // Setting mirrors
  const phaseRef = useRef<Phase>("idle");
  const modeRef = useRef<Mode>("classic");
  const diffRef = useRef<DiffConfig>(DIFFS.normal);
  const sessionMsRef = useRef(30000);
  const spiceRef = useRef(1);
  const duoRef = useRef(false);
  const endRef = useRef<() => void>(() => {});

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { diffRef.current = DIFFS[difficulty]; }, [difficulty]);
  useEffect(() => { sessionMsRef.current = length * 1000; }, [length]);
  useEffect(() => { spiceRef.current = SPICE_MULT[spice]; }, [spice]);
  useEffect(() => { duoRef.current = duo && mode === "classic"; }, [duo, mode]);

  useWakeLock(true);

  // Personal best + device polling
  useEffect(() => {
    const stored = Number(typeof window !== "undefined" ? localStorage.getItem(BEST_KEY) : 0) || 0;
    setBestScore(stored);
    const poll = () => { const c = getClient(); setArmedCount(c?.connected ? getActiveDeviceIndices().length : 0); };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, []);

  // --- helpers --------------------------------------------------------------

  const clearLoop = useCallback(() => { if (loopRef.current) { clearTimeout(loopRef.current); loopRef.current = null; } }, []);
  const clearCount = useCallback(() => { if (countTimerRef.current) { clearInterval(countTimerRef.current); countTimerRef.current = null; } }, []);

  const bpmAt = useCallback((elapsedMs: number) => {
    const d = diffRef.current;
    if (modeRef.current === "survival") return Math.min(d.bpmMin + (elapsedMs / 1000) * SURVIVAL_RAMP, SURVIVAL_BPM_CAP);
    const t = Math.min(elapsedMs / sessionMsRef.current, 1);
    return d.bpmMin + (d.bpmMax - d.bpmMin) * t;
  }, []);

  const getElapsed = useCallback(() => {
    return elapsedRef.current + (runningRef.current && !pausedRef.current ? performance.now() - lastTickRef.current : 0);
  }, []);

  const showFeedback = useCallback((g: Grade) => {
    setFeedback(g);
    if (fbTimerRef.current) clearTimeout(fbTimerRef.current);
    fbTimerRef.current = setTimeout(() => setFeedback(null), 650);
  }, []);

  const handleHit = useCallback((grade: Exclude<Grade, "MISS">) => {
    const pts = grade === "PERFECT" ? 30 : grade === "GOOD" ? 20 : 10;
    const nextCombo = Math.min(comboRef.current + 1, COMBO_CAP);
    comboRef.current = nextCombo;
    maxComboRef.current = Math.max(maxComboRef.current, nextCombo);
    scoreRef.current += pts * nextCombo;
    totalRef.current += 1;
    if (grade === "PERFECT") perfectRef.current += 1;
    const gain = (grade === "PERFECT" ? 0.20 : grade === "GOOD" ? 0.12 : 0.06) * (1 + nextCombo * 0.05);
    chargeRef.current = clamp01(chargeRef.current + gain);
    boostRef.current = Math.min(0.4, boostRef.current + (grade === "PERFECT" ? 0.28 : grade === "GOOD" ? 0.16 : 0.08));
    setCombo(nextCombo);
    setScore(scoreRef.current);
    showFeedback(grade);
  }, [showFeedback]);

  const handleMiss = useCallback(() => {
    comboRef.current = 0;
    chargeRef.current *= 0.5;
    boostRef.current = 0;
    totalRef.current += 1;
    setCombo(0);
    showFeedback("MISS");
    if (modeRef.current === "survival") {
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) endRef.current();
    }
  }, [showFeedback]);

  // --- main loop ------------------------------------------------------------

  const tick = useCallback(() => {
    if (!runningRef.current || pausedRef.current) return;
    const now = performance.now();
    const dt = now - lastTickRef.current;
    lastTickRef.current = now;
    elapsedRef.current += dt;
    const elapsed = elapsedRef.current;
    const dtSec = dt / 1000;

    const curBpm = bpmAt(elapsed);
    maxBpmRef.current = Math.max(maxBpmRef.current, curBpm);
    setBpm(Math.round(curBpm));

    const okW = diffRef.current.windows.ok;

    // Schedule upcoming beats slightly ahead so early taps still register.
    while (elapsed >= nextBeatRef.current - okW) {
      beatsRef.current.push({ time: nextBeatRef.current, resolved: false, flashed: false });
      nextBeatRef.current += 60000 / bpmAt(nextBeatRef.current);
    }
    // Flash on the beat; miss when its window fully passes unresolved.
    for (const b of beatsRef.current) {
      if (!b.flashed && elapsed >= b.time) { b.flashed = true; setBeatCount((c) => c + 1); }
      if (!b.resolved && elapsed > b.time + okW) { b.resolved = true; handleMiss(); }
    }
    beatsRef.current = beatsRef.current.filter((b) => !b.resolved || elapsed - b.time < 200);

    // A miss above may have ended a survival run — stop before emitting/rescheduling.
    if (!runningRef.current) return;

    // Sustained reward output.
    chargeRef.current = Math.max(0, chargeRef.current - CHARGE_DECAY * dtSec);
    boostRef.current = Math.max(0, boostRef.current - BOOST_DECAY * dtSec);
    const out = clamp01((chargeRef.current + boostRef.current) * spiceRef.current);
    applyVibrationSafe(out);
    setChargeState(chargeRef.current);

    if (modeRef.current === "classic") {
      const remaining = Math.max(0, sessionMsRef.current - elapsed);
      setTimeLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) { endRef.current(); return; }
    }

    loopRef.current = setTimeout(tick, TICK_MS);
  }, [bpmAt, handleMiss]);

  const handleStrike = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const elapsed = getElapsed();
    const w = diffRef.current.windows;
    let best: Beat | null = null;
    let bestDist = Infinity;
    for (const b of beatsRef.current) {
      if (b.resolved) continue;
      const d = Math.abs(b.time - elapsed);
      if (d < bestDist) { bestDist = d; best = b; }
    }
    if (best && bestDist <= w.ok) {
      best.resolved = true;
      handleHit(bestDist <= w.perfect ? "PERFECT" : bestDist <= w.good ? "GOOD" : "OK");
    } else {
      handleMiss(); // stray tap
    }
  }, [getElapsed, handleHit, handleMiss]);

  // --- session lifecycle ----------------------------------------------------

  const resetSession = useCallback(() => {
    clearLoop();
    elapsedRef.current = 0;
    nextBeatRef.current = 60000 / diffRef.current.bpmMin; // first beat one period in
    beatsRef.current = [];
    chargeRef.current = 0;
    boostRef.current = 0;
    comboRef.current = 0;
    scoreRef.current = 0;
    totalRef.current = 0;
    perfectRef.current = 0;
    maxComboRef.current = 0;
    maxBpmRef.current = diffRef.current.bpmMin;
    livesRef.current = LIVES;
    setScore(0); setCombo(0); setChargeState(0); setLives(LIVES);
    setBpm(diffRef.current.bpmMin);
    setTimeLeft(modeRef.current === "classic" ? length : 0);
    setBeatCount(0); setFeedback(null);
  }, [clearLoop, length]);

  const beginPlay = useCallback(() => {
    runningRef.current = true;
    pausedRef.current = false;
    lastTickRef.current = performance.now();
    setPhase("playing");
    tick();
  }, [tick]);

  const startCountdown = useCallback((onDone: () => void) => {
    clearCount();
    setPhase("countdown");
    let n = 3;
    setCountNum(n);
    countTimerRef.current = setInterval(() => {
      n -= 1;
      setCountNum(n);
      if (n <= 0) { clearCount(); onDone(); }
    }, 750);
  }, [clearCount]);

  const startSession = useCallback(() => {
    resetSession();
    startCountdown(beginPlay);
  }, [resetSession, startCountdown, beginPlay]);

  const endSession = useCallback(() => {
    runningRef.current = false;
    pausedRef.current = false;
    clearLoop();
    applyVibrationSafe(0);
    stopAllDevices();

    const finalScore = scoreRef.current;
    const total = totalRef.current;
    const accuracy = total > 0 ? Math.round((perfectRef.current / total) * 100) : 0;
    const grade = accuracy >= 90 ? "S" : accuracy >= 75 ? "A" : accuracy >= 55 ? "B" : accuracy >= 35 ? "C" : "D";

    // Duo classic: bank this player's score, then either hand off or compare.
    if (duoRef.current) {
      matchRef.current.scores.push(finalScore);
      if (matchRef.current.turn === 1) {
        matchRef.current.turn = 2;
        setPhase("handoff");
        return;
      }
      const [s1, s2] = matchRef.current.scores;
      setResult({
        mode: "classic", score: finalScore, accuracy, grade,
        maxBpm: Math.round(maxBpmRef.current), maxCombo: maxComboRef.current,
        perfect: perfectRef.current, total,
        duo: { scores: [s1, s2], winner: s1 === s2 ? 0 : s1 > s2 ? 1 : 2 },
      });
      setPhase("result");
      return;
    }

    let newBest = false;
    if (modeRef.current === "survival" && finalScore > bestScore) {
      newBest = true;
      setBestScore(finalScore);
      try { localStorage.setItem(BEST_KEY, String(finalScore)); } catch {}
    }

    setResult({
      mode: modeRef.current, score: finalScore, accuracy, grade,
      maxBpm: Math.round(maxBpmRef.current), maxCombo: maxComboRef.current,
      perfect: perfectRef.current, total, newBest,
    });
    setPhase("result");
  }, [clearLoop, bestScore]);

  useEffect(() => { endRef.current = endSession; }, [endSession]);

  // --- pause / resume (tab hidden) -----------------------------------------

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== "playing" || pausedRef.current) return;
    elapsedRef.current += performance.now() - lastTickRef.current; // bank progress
    pausedRef.current = true;
    runningRef.current = false;
    clearLoop();
    applyVibrationSafe(0);
    setPhase("paused");
  }, [clearLoop]);

  const resumeGame = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    startCountdown(beginPlay);
  }, [startCountdown, beginPlay]);

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "hidden") pauseGame(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [pauseGame]);

  // --- input + cleanup ------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); handleStrike(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleStrike]);

  useEffect(() => {
    return () => {
      clearLoop(); clearCount();
      if (fbTimerRef.current) clearTimeout(fbTimerRef.current);
      runningRef.current = false;
      applyVibrationSafe(0);
      stopAllDevices();
    };
  }, [clearLoop, clearCount]);

  // --- top-level actions ----------------------------------------------------

  const handleStart = () => {
    matchRef.current = { turn: 1, scores: [] };
    startSession();
  };
  const handleNextPlayer = () => { startSession(); };
  const handlePlayAgain = () => {
    setResult(null);
    matchRef.current = { turn: 1, scores: [] };
    startSession();
  };
  const handleQuit = () => {
    runningRef.current = false;
    clearLoop(); clearCount();
    applyVibrationSafe(0);
    stopAllDevices();
    setPhase("idle");
    setResult(null);
  };

  // --- derived --------------------------------------------------------------
  const cColor = chargeColor(charge);
  const noDevice = armedCount === 0;
  const beatDur = bpm > 0 ? 60 / bpm : 0.5;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12 select-none">
      <div className="max-w-md w-full space-y-6">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <Link href="/games"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Tempo <span className="text-primary">Strike</span></h2>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Earn The Reward</p>
            </div>
            {phase === "idle" && (
              <Button onClick={() => setShowSettings((s) => !s)} variant="ghost" size="icon"
                className={cn("rounded-full shrink-0", showSettings ? "text-primary bg-primary/10" : "text-muted-foreground")}>
                <Settings2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </header>

        {/* Device warning */}
        <AnimatePresence>
          {noDevice && phase !== "idle" && (
            <motion.button key="nodev" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              onClick={() => window.dispatchEvent(new CustomEvent("open-device-manager"))}
              className="w-full flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left">
              <BluetoothOff className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-300 leading-none">No toy armed</p>
                <p className="text-[10px] text-amber-200/70 mt-1">The reward won&apos;t be felt — tap to connect.</p>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* IDLE */}
          {phase === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <AnimatePresence>
                {showSettings && (
                  <motion.div key="settings" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-2xl border border-white/10 bg-card/40 p-5 space-y-5">
                      <div className="space-y-2">
                        <SettingRow icon={mode === "survival" ? InfinityIcon : Clock} label="Mode" hint={mode === "survival" ? "BPM climbs forever · 3 lives" : "Fixed-length score attack"}><span /></SettingRow>
                        <Pills value={mode} onChange={setMode} options={[{ value: "classic", label: "Classic" }, { value: "survival", label: "Survival" }]} />
                      </div>
                      <div className="space-y-2">
                        <SettingRow icon={Gauge} label="Difficulty" hint="Timing windows + BPM"><span /></SettingRow>
                        <Pills value={difficulty} onChange={setDifficulty} options={[{ value: "easy", label: "Easy" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Hard" }]} />
                      </div>
                      <div className="space-y-2">
                        <SettingRow icon={Clock} label="Length" hint={mode === "survival" ? "Survival runs until you're out" : "Round duration"}><span /></SettingRow>
                        <Pills value={length} onChange={setLength} disabled={mode === "survival"} options={[{ value: 30, label: "30s" }, { value: 60, label: "60s" }]} />
                      </div>
                      <div className="space-y-2">
                        <SettingRow icon={Flame} label="Spice" hint="Caps the reward intensity"><span /></SettingRow>
                        <Pills value={spice} onChange={setSpice} options={[{ value: "gentle", label: "Gentle" }, { value: "normal", label: "Normal" }, { value: "intense", label: "Intense" }]} />
                      </div>
                      <div className="h-px bg-white/5" />
                      <SettingRow icon={Users} label="Duo battle" hint={mode === "survival" ? "Classic mode only" : "Two players, alternating turns"}>
                        <Switch on={duo && mode === "classic"} disabled={mode === "survival"} onClick={() => setDuo((v) => !v)} />
                      </SettingRow>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-card/40 border border-primary/20 rounded-3xl p-8 space-y-6 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <Music2 className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Hit The Beat, Earn The Buzz</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Strike on the beat to <strong>charge</strong> your device. Build a combo and the reward climbs and sustains — miss, and it drops. Stop hitting and it fades.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[["PERFECT", `±${DIFFS[difficulty].windows.perfect}ms`, "text-primary"], ["GOOD", `±${DIFFS[difficulty].windows.good}ms`, "text-green-400"], ["MISS", `>${DIFFS[difficulty].windows.ok}ms`, "text-red-400"]].map(([l, r, c]) => (
                    <div key={l} className="bg-muted/10 rounded-xl p-3">
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", c)}>{l}</p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{r}</p>
                    </div>
                  ))}
                </div>
                {mode === "survival" && bestScore > 0 && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Personal best · <span className="text-primary">{bestScore}</span></p>
                )}
              </div>
              <Button onClick={handleStart} className="w-full h-16 font-black uppercase tracking-widest text-lg rounded-2xl gap-3 shadow-xl shadow-primary/20">
                <Zap className="w-6 h-6" /> {duo && mode === "classic" ? "Start Duo Battle" : "Start"}
              </Button>
            </motion.div>
          )}

          {/* COUNTDOWN */}
          {phase === "countdown" && (
            <motion.div key="countdown" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-6 py-16">
              {duoRef.current && <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Player {matchRef.current.turn}</p>}
              <motion.p key={countNum} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-8xl font-black text-white tabular-nums">
                {countNum > 0 ? countNum : "GO"}
              </motion.p>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Get ready</p>
            </motion.div>
          )}

          {/* PLAYING / PAUSED */}
          {(phase === "playing" || phase === "paused") && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6">
              {/* HUD */}
              <div className="flex justify-between w-full gap-2">
                <div className="bg-card/40 border border-border/30 rounded-2xl px-3 py-3 flex-1 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Score</p>
                  <p className="text-2xl font-black text-white tabular-nums">{score}</p>
                </div>
                <div className="bg-card/40 border border-border/30 rounded-2xl px-3 py-3 flex-1 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{mode === "survival" ? "Lives" : "Time"}</p>
                  {mode === "survival" ? (
                    <div className="flex items-center justify-center gap-1 h-8">
                      {Array.from({ length: LIVES }).map((_, i) => (
                        <Heart key={i} className={cn("w-4 h-4", i < lives ? "text-red-400 fill-red-400" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                  ) : (
                    <p className={cn("text-2xl font-black tabular-nums", timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white")}>{timeLeft}s</p>
                  )}
                </div>
                <div className="bg-card/40 border border-border/30 rounded-2xl px-3 py-3 flex-1 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Combo</p>
                  <p className="text-2xl font-black text-primary tabular-nums">{combo > 1 ? `×${combo}` : combo}</p>
                </div>
              </div>

              {/* Beat + charge ring */}
              <div className="relative w-60 h-60 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="46" fill="none" strokeWidth="4" stroke="rgba(255,255,255,0.08)" />
                  <circle cx="50" cy="50" r="46" fill="none" strokeWidth="4" strokeLinecap="round"
                    stroke={cColor} strokeDasharray={C46} strokeDashoffset={C46 * (1 - charge)}
                    style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s", filter: `drop-shadow(0 0 6px ${cColor})` }} />
                </svg>

                <motion.div key={beatCount} initial={{ scale: 1.35, opacity: 0.6 }} animate={{ scale: 1, opacity: 0 }} transition={{ duration: beatDur * 0.85, ease: "easeOut" }}
                  className="absolute w-44 h-44 rounded-full border-4 border-primary" />
                <motion.div key={`core-${beatCount}`} initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: beatDur * 0.3, ease: "easeOut" }}
                  className="w-40 h-40 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">BPM</p>
                    <p className="text-3xl font-black text-white tabular-nums">{bpm}</p>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {feedback && (
                    <motion.div key={feedback + beatCount} initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -34, scale: 1.2 }} transition={{ duration: 0.6 }}
                      className={cn("absolute -top-6 font-black text-2xl uppercase tracking-widest pointer-events-none", FEEDBACK_COLORS[feedback])}>
                      {feedback}
                    </motion.div>
                  )}
                </AnimatePresence>

                {phase === "paused" && (
                  <div className="absolute inset-0 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Paused</p>
                  </div>
                )}
              </div>

              {/* Reward readout */}
              <div className="w-full flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground shrink-0">Reward</span>
                <div className="flex-1 bg-muted/10 rounded-full h-2.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${charge * 100}%`, backgroundColor: cColor, transition: "width 0.1s linear, background-color 0.3s" }} />
                </div>
                <span className="text-[11px] font-black tabular-nums shrink-0" style={{ color: cColor }}>{Math.round(charge * 100)}%</span>
              </div>

              {phase === "playing" ? (
                <Button onPointerDown={handleStrike}
                  className="w-full h-20 font-black uppercase tracking-widest text-xl rounded-2xl gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-transform touch-none">
                  <Zap className="w-7 h-7" /> STRIKE
                </Button>
              ) : (
                <Button onClick={resumeGame} className="w-full h-20 font-black uppercase tracking-widest text-xl rounded-2xl gap-3 shadow-xl shadow-primary/20">
                  Resume
                </Button>
              )}

              <button onClick={handleQuit} className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                <Square className="w-3 h-3 fill-current" /> End
              </button>
            </motion.div>
          )}

          {/* DUO HANDOFF */}
          {phase === "handoff" && (
            <motion.div key="handoff" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="bg-card/40 border border-primary/20 rounded-3xl p-10 text-center space-y-4">
                <Users className="w-16 h-16 text-primary mx-auto" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Player 1 scored</p>
                  <h3 className="text-5xl font-black text-white tabular-nums">{matchRef.current.scores[0]}</h3>
                </div>
                <p className="text-sm text-muted-foreground">Pass the device. Player 2, beat that score.</p>
              </div>
              <Button onClick={handleNextPlayer} className="w-full h-16 font-black uppercase tracking-widest text-lg rounded-2xl gap-3 shadow-xl shadow-primary/20">
                Player 2 Ready <ArrowRight className="w-6 h-6" />
              </Button>
            </motion.div>
          )}

          {/* RESULT */}
          {phase === "result" && result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="bg-card/40 border border-primary/20 rounded-3xl p-8 text-center space-y-6">
                {result.duo ? (
                  <>
                    <Trophy className="w-16 h-16 text-primary mx-auto animate-bounce" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Duo Battle</p>
                      <h3 className="text-4xl font-black text-white uppercase tracking-tighter">
                        {result.duo.winner === 0 ? "Tie!" : `Player ${result.duo.winner} Wins`}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {result.duo.scores.map((s, i) => (
                        <div key={i} className={cn("rounded-xl p-4 border", result.duo!.winner === i + 1 ? "bg-primary/15 border-primary/40" : "bg-muted/10 border-border/20")}>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Player {i + 1}</p>
                          <p className="text-2xl font-black text-white tabular-nums">{s}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <Trophy className="w-16 h-16 text-primary mx-auto animate-bounce" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
                        {result.mode === "survival" ? "Survival Over" : "Round Complete"}
                      </p>
                      <h3 className="text-5xl font-black text-white uppercase tracking-tighter">
                        {result.mode === "survival" ? result.score : result.grade}
                      </h3>
                      {result.newBest && <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">★ New personal best</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        ["Score", String(result.score), "text-primary"],
                        ["Accuracy", `${result.accuracy}%`, "text-white"],
                        [result.mode === "survival" ? "Max BPM" : "Combo", result.mode === "survival" ? String(result.maxBpm) : `×${result.maxCombo}`, "text-white"],
                      ].map(([l, v, c]) => (
                        <div key={l} className="bg-muted/10 rounded-xl p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{l}</p>
                          <p className={cn("text-xl font-black tabular-nums", c)}>{v}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{result.perfect} perfect · max combo ×{result.maxCombo} · top {result.maxBpm} BPM</p>
                  </>
                )}
              </div>
              <Button onClick={handlePlayAgain} className="w-full h-14 font-black uppercase tracking-widest rounded-2xl gap-2">
                <Zap className="w-5 h-5" /> {result.duo ? "Rematch" : "Play Again"}
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
