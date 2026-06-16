
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Dices,
  Square,
  Pause,
  Play,
  Settings2,
  BluetoothOff,
  AlertTriangle,
  Users,
  Sparkles,
  Repeat,
  Gauge,
  Flame,
} from "lucide-react";
import Link from "next/link";
import {
  applyVibrationSafe,
  stopAllDevices,
  getClient,
  getActiveDeviceIndices,
} from "@/lib/buttplug/toy-client";
import { registry } from "@/lib/vibration-patterns";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Wheel data
// ---------------------------------------------------------------------------

interface Segment {
  label: string;
  sublabel: string;
  patternId: string;
  intensity: number;
  duration: number;
  color: string;
  textColor: string;
  dare: string;
  special?: "wildcard";
}

const SEGMENTS: Segment[] = [
  { label: "MAX SURGE", sublabel: "8s",  patternId: "surge",      intensity: 1.00, duration: 8,  color: "#6C5CE7", textColor: "#fff", dare: "Hands above your head. Don't move." },
  { label: "OVERLOAD",  sublabel: "10s", patternId: "fireworks",  intensity: 0.95, duration: 10, color: "#FF3B5C", textColor: "#fff", dare: "Eyes closed. Take all of it." },
  { label: "EDGE",      sublabel: "18s", patternId: "climb",      intensity: 0.90, duration: 18, color: "#E84393", textColor: "#fff", dare: "Get close. Do NOT finish." },
  { label: "DENIAL",    sublabel: "30s", patternId: "breath",     intensity: 0.35, duration: 30, color: "#74B9FF", textColor: "#111", dare: "Beg all you want. This is all you get." },
  { label: "HEARTBEAT", sublabel: "20s", patternId: "heartbeat",  intensity: 0.80, duration: 20, color: "#FF4757", textColor: "#fff", dare: "Match your breathing to it." },
  { label: "OCEAN",     sublabel: "28s", patternId: "ocean",      intensity: 0.60, duration: 28, color: "#0984E3", textColor: "#fff", dare: "Relax completely. Let go." },
  { label: "FLUTTER",   sublabel: "20s", patternId: "flutter",    intensity: 0.65, duration: 20, color: "#C77DFF", textColor: "#fff", dare: "Stay perfectly still." },
  { label: "ERRATIC",   sublabel: "15s", patternId: "erratic",    intensity: 0.85, duration: 15, color: "#FDCB6E", textColor: "#111", dare: "No rhythm, no warning. Hold on." },
  { label: "THROB",     sublabel: "18s", patternId: "throb",      intensity: 0.82, duration: 18, color: "#00B894", textColor: "#fff", dare: "Count every pulse out loud." },
  { label: "WILDCARD",  sublabel: "???", patternId: "erratic",    intensity: 0.80, duration: 15, color: "#F1C40F", textColor: "#111", dare: "", special: "wildcard" },
];

const N = SEGMENTS.length;
const ANGLE = 360 / N;
// Wildcard is rarer than the rest.
const WEIGHTS = SEGMENTS.map((s) => (s.special === "wildcard" ? 1 : 2));

const WILDCARD_POOL = ["surge", "earthquake", "throb", "flutter", "erratic", "ocean", "heartbeat", "fireworks", "ripple", "morse"];
const WILDCARD_DARES = [
  "Don't make a sound.",
  "Eyes closed the whole time.",
  "Hands behind your back.",
  "Beg for it to stop.",
  "Stay completely still.",
];

const SPICE_MULT = { gentle: 0.65, normal: 1.0, intense: 1.25 } as const;
const SPEED_VAL = { slow: 0.4, flow: 0.6, fast: 0.85 } as const;

const TICK_MS = 33; // ~30fps. setTimeout (not RAF) so it keeps running in an unfocused window.

type Spice = keyof typeof SPICE_MULT;
type Speed = keyof typeof SPEED_VAL;
type Phase = "idle" | "spinning" | "playing" | "paused" | "done";

interface ActiveSpin {
  label: string;
  reveal: string | null; // for wildcard: the pattern it resolved to
  patternId: string;
  intensity: number; // already spice-adjusted, 0..1
  duration: number;  // already jitter-adjusted, seconds
  color: string;
  textColor: string;
  dare: string;
  turn: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function wedgePath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, end);
  return `M${cx},${cy} L${s.x.toFixed(3)},${s.y.toFixed(3)} A${r},${r},0,0,1,${e.x.toFixed(3)},${e.y.toFixed(3)} Z`;
}

function weightedPick(): number {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < N; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return i;
  }
  return N - 1;
}

// ---------------------------------------------------------------------------
// Tiny settings controls
// ---------------------------------------------------------------------------

function Pills<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-white/5 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
            value === o.value ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("relative w-11 h-6 rounded-full transition-colors shrink-0", on ? "bg-primary" : "bg-zinc-700")}
    >
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

export default function VibeRoulettePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [totalRotation, setTotalRotation] = useState(0);
  const [active, setActive] = useState<ActiveSpin | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDuration, setTotalDuration] = useState(1);
  const [spinsCount, setSpinsCount] = useState(0);
  const [nextIn, setNextIn] = useState(0); // auto-spin countdown
  const [armedCount, setArmedCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Settings
  const [spice, setSpice] = useState<Spice>("normal");
  const [speed, setSpeed] = useState<Speed>("flow");
  const [autoSpin, setAutoSpin] = useState(false);
  const [surpriseLength, setSurpriseLength] = useState(true);
  const [dares, setDares] = useState(false);
  const [duo, setDuo] = useState(false);

  // Loop / timing refs
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<(() => void) | null>(null);
  const endRef = useRef<() => void>(() => {});
  const playRef = useRef<{ processor: (ctx: { elapsed: number; speed: number }) => number | undefined; intensity: number; duration: number; startMs: number; lastSec: number } | null>(null);
  const pausedRef = useRef(false);
  const autoPausedRef = useRef(false);
  const pausedAtRef = useRef(0);
  const turnRef = useRef(1);

  // Setting mirrors (read inside loop / timeout callbacks to avoid stale closures)
  const phaseRef = useRef<Phase>("idle");
  const spiceRef = useRef<number>(SPICE_MULT.normal);
  const speedRef = useRef<number>(SPEED_VAL.flow);
  const autoSpinRef = useRef(false);
  const surpriseRef = useRef(true);
  const daresRef = useRef(false);
  const duoRef = useRef(false);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { spiceRef.current = SPICE_MULT[spice]; }, [spice]);
  useEffect(() => { speedRef.current = SPEED_VAL[speed]; }, [speed]);
  useEffect(() => { autoSpinRef.current = autoSpin; }, [autoSpin]);
  useEffect(() => { surpriseRef.current = surpriseLength; }, [surpriseLength]);
  useEffect(() => { daresRef.current = dares; }, [dares]);
  useEffect(() => { duoRef.current = duo; }, [duo]);

  useWakeLock(true);

  // --- Device awareness -----------------------------------------------------
  useEffect(() => {
    const poll = () => {
      const c = getClient();
      setArmedCount(c?.connected ? getActiveDeviceIndices().length : 0);
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, []);

  // --- Low-level pattern control -------------------------------------------

  const clearLoop = useCallback(() => {
    if (loopRef.current) { clearTimeout(loopRef.current); loopRef.current = null; }
  }, []);

  const cancelAutoCountdown = useCallback(() => {
    if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null; }
    setNextIn(0);
  }, []);

  // Stop the active segment's output but keep the BLE connection alive.
  const clearActivePattern = useCallback(() => {
    clearLoop();
    pausedRef.current = false;
    autoPausedRef.current = false;
    playRef.current = null;
    applyVibrationSafe(0);
  }, [clearLoop]);

  // Full panic stop — also drops hardware output via stopAllDevices.
  const stopEverything = useCallback(() => {
    clearLoop();
    cancelAutoCountdown();
    if (spinTimeoutRef.current) { clearTimeout(spinTimeoutRef.current); spinTimeoutRef.current = null; }
    pausedRef.current = false;
    autoPausedRef.current = false;
    playRef.current = null;
    applyVibrationSafe(0);
    stopAllDevices();
    setPhase("idle");
    setActive(null);
    setTimeLeft(0);
  }, [clearLoop, cancelAutoCountdown]);

  const playSegment = useCallback((spin: ActiveSpin) => {
    const processor = registry.get(spin.patternId);
    if (!processor) { setPhase("done"); return; }

    setTimeLeft(spin.duration);
    setTotalDuration(spin.duration);

    playRef.current = {
      processor,
      intensity: spin.intensity,
      duration: spin.duration,
      startMs: performance.now(),
      lastSec: spin.duration,
    };

    const tick = () => {
      if (pausedRef.current) return;
      const p = playRef.current;
      if (!p) return;
      const elapsed = (performance.now() - p.startMs) / 1000;
      if (elapsed >= p.duration) {
        applyVibrationSafe(0);
        endRef.current();
        return;
      }
      const raw = p.processor({ elapsed, speed: speedRef.current }) ?? 0;
      applyVibrationSafe(clamp01(raw) * p.intensity);
      const sec = Math.max(0, Math.ceil(p.duration - elapsed));
      if (sec !== p.lastSec) { p.lastSec = sec; setTimeLeft(sec); }
      loopRef.current = setTimeout(tick, TICK_MS);
    };
    tickRef.current = tick;
    tick();
  }, []);

  // Resolve what the wheel landed on (handles wildcard + spice + jitter).
  const resolveLanding = useCallback((idx: number) => {
    const base = SEGMENTS[idx];
    let patternId = base.patternId;
    let baseIntensity = base.intensity;
    let baseDuration = base.duration;
    let reveal: string | null = null;
    let dare = base.dare;

    if (base.special === "wildcard") {
      patternId = WILDCARD_POOL[Math.floor(Math.random() * WILDCARD_POOL.length)];
      baseIntensity = 0.5 + Math.random() * 0.5;
      baseDuration = 8 + Math.round(Math.random() * 17);
      reveal = patternId.toUpperCase();
      dare = WILDCARD_DARES[Math.floor(Math.random() * WILDCARD_DARES.length)];
    }

    const intensity = clamp01(baseIntensity * spiceRef.current);
    const duration = surpriseRef.current
      ? Math.max(5, Math.round(baseDuration * (0.85 + Math.random() * 0.3)))
      : baseDuration;

    const turn = turnRef.current;
    turnRef.current = turn === 1 ? 2 : 1;

    const spin: ActiveSpin = {
      label: base.label,
      reveal,
      patternId,
      intensity,
      duration,
      color: base.color,
      textColor: base.textColor,
      dare,
      turn,
    };

    setActive(spin);
    setSpinsCount((c) => c + 1);
    setPhase("playing");
    playSegment(spin);
  }, [playSegment]);

  // --- Spin -----------------------------------------------------------------

  const spin = useCallback(() => {
    if (phaseRef.current === "spinning") return;
    cancelAutoCountdown();
    clearActivePattern();

    const idx = weightedPick();
    // Land the CENTRE of the chosen wedge under the fixed top needle.
    const centre = idx * ANGLE + ANGLE / 2;
    const desiredMod = ((360 - centre) % 360 + 360) % 360;
    const spins = 4 + Math.floor(Math.random() * 3); // 4–6 full turns

    setTotalRotation((prev) => {
      const currentMod = ((prev % 360) + 360) % 360;
      let delta = desiredMod - currentMod;
      if (delta < 0) delta += 360;
      return prev + spins * 360 + delta;
    });

    setPhase("spinning");
    setActive(null);

    spinTimeoutRef.current = setTimeout(() => resolveLanding(idx), 4100);
  }, [cancelAutoCountdown, clearActivePattern, resolveLanding]);

  // --- Segment end → auto-spin or done -------------------------------------

  const beginAutoCountdown = useCallback(() => {
    cancelAutoCountdown();
    let n = 3;
    setNextIn(n);
    autoTimerRef.current = setInterval(() => {
      n -= 1;
      setNextIn(n);
      if (n <= 0) {
        cancelAutoCountdown();
        spin();
      }
    }, 1000);
  }, [cancelAutoCountdown, spin]);

  // Keep endRef pointing at the latest handler (auto-spin setting is read live).
  useEffect(() => {
    endRef.current = () => {
      playRef.current = null;
      setPhase("done");
      if (autoSpinRef.current) beginAutoCountdown();
    };
  }, [beginAutoCountdown]);

  // --- Pause / resume -------------------------------------------------------

  const pauseSegment = useCallback((auto: boolean) => {
    if (!playRef.current || pausedRef.current) return;
    pausedRef.current = true;
    pausedAtRef.current = performance.now();
    clearLoop();
    applyVibrationSafe(0);
    if (auto) autoPausedRef.current = true;
    else setPhase("paused");
  }, [clearLoop]);

  const resumeSegment = useCallback(() => {
    if (!playRef.current || !pausedRef.current) return;
    const p = playRef.current;
    p.startMs += performance.now() - pausedAtRef.current;
    pausedRef.current = false;
    autoPausedRef.current = false;
    if (phaseRef.current === "paused") setPhase("playing");
    tickRef.current?.();
  }, []);

  // Auto-pause when the tab is hidden (cooperates with DeviceManager's
  // WebBluetooth safety stop), auto-resume when it returns.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (phaseRef.current === "playing" && !pausedRef.current) pauseSegment(true);
      } else if (autoPausedRef.current) {
        resumeSegment();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [pauseSegment, resumeSegment]);

  // --- Cleanup --------------------------------------------------------------
  useEffect(() => {
    return () => {
      clearLoop();
      cancelAutoCountdown();
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      applyVibrationSafe(0);
      stopAllDevices();
    };
  }, [clearLoop, cancelAutoCountdown]);

  // --- Derived --------------------------------------------------------------
  const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;
  const CIRCUM = 2 * Math.PI * 42;
  const isLive = phase === "playing" || phase === "paused";
  const noDevice = armedCount === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12 select-none">
      <div className="max-w-md w-full space-y-6">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <Link href="/games"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Vibe <span className="text-primary">Roulette</span></h2>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Spin &amp; Surrender</p>
            </div>
            <Button
              onClick={() => setShowSettings((s) => !s)}
              variant="ghost"
              size="icon"
              className={cn("rounded-full shrink-0", showSettings ? "text-primary bg-primary/10" : "text-muted-foreground")}
            >
              <Settings2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Device warning */}
        <AnimatePresence>
          {noDevice && (
            <motion.button
              key="nodevice"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              onClick={() => window.dispatchEvent(new CustomEvent("open-device-manager"))}
              className="w-full flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left"
            >
              <BluetoothOff className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-300 leading-none">No toy armed</p>
                <p className="text-[10px] text-amber-200/70 mt-1">Spins won&apos;t be felt — tap to connect a device.</p>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-white/10 bg-card/40 p-5 space-y-5">
                <div className="space-y-2">
                  <SettingRow icon={Flame} label="Spice" hint="Scales every intensity" >
                    <span />
                  </SettingRow>
                  <Pills value={spice} onChange={setSpice} options={[{ value: "gentle", label: "Gentle" }, { value: "normal", label: "Normal" }, { value: "intense", label: "Intense" }]} />
                </div>
                <div className="space-y-2">
                  <SettingRow icon={Gauge} label="Tempo" hint="Pattern playback speed">
                    <span />
                  </SettingRow>
                  <Pills value={speed} onChange={setSpeed} options={[{ value: "slow", label: "Slow" }, { value: "flow", label: "Flow" }, { value: "fast", label: "Fast" }]} />
                </div>
                <div className="h-px bg-white/5" />
                <SettingRow icon={Repeat} label="Auto-spin" hint="Re-spins itself when a round ends">
                  <Switch on={autoSpin} onClick={() => setAutoSpin((v) => !v)} />
                </SettingRow>
                <SettingRow icon={Sparkles} label="Surprise length" hint="Randomize each round's duration">
                  <Switch on={surpriseLength} onClick={() => setSurpriseLength((v) => !v)} />
                </SettingRow>
                <SettingRow icon={AlertTriangle} label="Dares" hint="Add a command to each result">
                  <Switch on={dares} onClick={() => setDares((v) => !v)} />
                </SettingRow>
                <SettingRow icon={Users} label="Duo mode" hint="Alternate turns between two players">
                  <Switch on={duo} onClick={() => setDuo((v) => !v)} />
                </SettingRow>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col items-center gap-7">
          {/* Wheel + needle */}
          <div className="relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 flex flex-col items-center">
              <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[18px] border-l-transparent border-r-transparent border-t-white drop-shadow-lg" />
            </div>

            <div
              className="w-72 h-72 rounded-full relative overflow-hidden shadow-2xl border-4 border-white/10"
              style={{
                transform: `rotate(${totalRotation}deg)`,
                transition: phase === "spinning" ? "transform 4s cubic-bezier(0.17, 0.67, 0.08, 1)" : "none",
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {SEGMENTS.map((s, i) => {
                  const startAngle = i * ANGLE;
                  const endAngle = startAngle + ANGLE;
                  const midAngle = startAngle + ANGLE / 2;
                  const labelPt = polarToCartesian(50, 50, 31, midAngle);
                  const subPt = polarToCartesian(50, 50, 38, midAngle);
                  const rot = midAngle - 90;
                  return (
                    <g key={i}>
                      <path d={wedgePath(50, 50, 50, startAngle, endAngle)} fill={s.color} />
                      <path d={wedgePath(50, 50, 50, startAngle, endAngle)} fill="rgba(0,0,0,0.08)" />
                      <text
                        x={labelPt.x} y={labelPt.y}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize="3.6" fontWeight="900" fill={s.textColor}
                        style={{ fontFamily: "system-ui", letterSpacing: "0.04em" }}
                        transform={`rotate(${rot}, ${labelPt.x}, ${labelPt.y})`}
                      >
                        {s.label}
                      </text>
                      <text
                        x={subPt.x} y={subPt.y}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize="2.8" fontWeight="700" fill={s.textColor} opacity="0.7"
                        style={{ fontFamily: "system-ui" }}
                        transform={`rotate(${rot}, ${subPt.x}, ${subPt.y})`}
                      >
                        {s.sublabel}
                      </text>
                    </g>
                  );
                })}
                <circle cx="50" cy="50" r="8" fill="hsl(var(--background))" />
                <circle cx="50" cy="50" r="6" fill="hsl(var(--primary))" />
              </svg>
            </div>
          </div>

          {/* Status panel */}
          <div className="w-full min-h-[7.5rem]">
            <AnimatePresence mode="wait">
              {phase === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Spin Your Fate</h3>
                  <p className="text-sm text-muted-foreground">{N} sensations. You don&apos;t choose. The wheel does.</p>
                  {duo && <p className="text-[10px] font-black uppercase tracking-widest text-primary">Player {turnRef.current} is up</p>}
                </motion.div>
              )}

              {phase === "spinning" && (
                <motion.div key="spinning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center pt-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary animate-pulse">Spinning...</p>
                </motion.div>
              )}

              {isLive && active && (
                <motion.div key="live" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full space-y-3">
                  <div className="rounded-2xl p-4 text-center space-y-1 border" style={{ backgroundColor: active.color + "22", borderColor: active.color + "55" }}>
                    {duo && <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/60">Player {active.turn}</p>}
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: active.color }}>
                      {phase === "paused" ? "Paused" : "You Got"}
                    </p>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{active.label}</h3>
                    {active.reveal && <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: active.color }}>→ {active.reveal}</p>}
                    <p className="text-sm text-muted-foreground">{Math.round(active.intensity * 100)}% · {active.duration}s</p>
                    {dares && active.dare && (
                      <p className="text-xs font-bold text-white/90 italic pt-1.5">&ldquo;{active.dare}&rdquo;</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" stroke="rgba(255,255,255,0.1)" />
                        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" strokeLinecap="round"
                          stroke={active.color} strokeDasharray={CIRCUM} strokeDashoffset={CIRCUM * (1 - progress)}
                          style={{ transition: "stroke-dashoffset 0.9s linear" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-black text-white tabular-nums">{timeLeft}s</span>
                      </div>
                    </div>
                    <div className="flex-1 bg-muted/10 rounded-xl h-3 overflow-hidden">
                      <motion.div className="h-full rounded-xl" style={{ backgroundColor: active.color }}
                        animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.9, ease: "linear" }} />
                    </div>
                  </div>
                </motion.div>
              )}

              {phase === "done" && active && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full space-y-3">
                  <div className="rounded-2xl p-4 text-center space-y-1 border" style={{ backgroundColor: active.color + "18", borderColor: active.color + "44" }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Round Complete</p>
                    <h3 className="text-2xl font-black text-white/80 uppercase tracking-tighter">{active.label}</h3>
                  </div>
                  {nextIn > 0 && (
                    <p className="text-center text-[11px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
                      Next spin in {nextIn}…
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="w-full space-y-3">
            <div className="flex gap-3">
              {isLive && (
                <Button
                  onClick={stopEverything}
                  variant="destructive"
                  className="h-16 px-5 rounded-2xl font-black uppercase tracking-widest gap-2 shrink-0"
                >
                  <Square className="w-5 h-5 fill-current" /> Stop
                </Button>
              )}

              {phase === "playing" && (
                <Button onClick={() => pauseSegment(false)} variant="outline" className="h-16 px-5 rounded-2xl border-primary/20 text-primary hover:bg-primary/10 font-black uppercase tracking-widest gap-2 shrink-0">
                  <Pause className="w-5 h-5 fill-current" /> Pause
                </Button>
              )}
              {phase === "paused" && (
                <Button onClick={resumeSegment} variant="outline" className="h-16 px-5 rounded-2xl border-primary/20 text-primary hover:bg-primary/10 font-black uppercase tracking-widest gap-2 shrink-0">
                  <Play className="w-5 h-5 fill-current" /> Resume
                </Button>
              )}

              <Button
                onClick={spin}
                disabled={phase === "spinning"}
                className={cn(
                  "flex-1 h-16 font-black uppercase tracking-widest text-base rounded-2xl gap-3 shadow-xl shadow-primary/20 transition-all",
                  phase === "spinning" && "opacity-50 cursor-not-allowed"
                )}
              >
                <Dices className="w-6 h-6" />
                {phase === "spinning" ? "Spinning..." : isLive || phase === "done" ? "Spin Again" : "Spin"}
              </Button>
            </div>

            {nextIn > 0 && (
              <Button onClick={cancelAutoCountdown} variant="ghost" className="w-full h-10 rounded-xl text-muted-foreground font-black uppercase tracking-widest text-[10px]">
                Cancel auto-spin
              </Button>
            )}
          </div>

          {spinsCount > 0 && (
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
              {spinsCount} spin{spinsCount !== 1 ? "s" : ""} this session{autoSpin ? " · auto" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
