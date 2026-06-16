
"use client";

import React, { use, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Crown, Square, Sparkles, Zap, ZapOff, Gift, Flame, Send,
  Loader2, Check, X, HandHeart, Sliders, Drama, Shuffle, Trophy,
} from "lucide-react";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useControlSession } from "@/hooks/use-control-session";
import { useScene, type PerfTier } from "@/hooks/use-scene";
import { registry } from "@/lib/vibration-patterns";
import { rtdb } from "@/lib/firebase";
import { ref, set } from "firebase/database";
import { cn } from "@/lib/utils";

const REWARD_PATTERNS = [
  { id: "waves", label: "Waves" }, { id: "ocean", label: "Ocean" },
  { id: "breath", label: "Breath" }, { id: "flutter", label: "Flutter" },
  { id: "pulse", label: "Pulse" }, { id: "throb", label: "Throb" },
];
const PUNISH_PATTERNS = [
  { id: "erratic", label: "Erratic" }, { id: "earthquake", label: "Quake" },
  { id: "morse", label: "Morse" }, { id: "engine", label: "Engine" },
  { id: "fireworks", label: "Jolt" },
];
const COMMANDS = ["Kneel", "Stay still", "Beg", "Eyes down", "Closer", "Hold it", "Edge", "Good pet"];

// --- Performance loop ------------------------------------------------------
const PERFORMANCE_DECK: { text: string; tier: PerfTier }[] = [
  { text: "Crawl to me on your hands and knees.", tier: "tease" },
  { text: "Slowly peel off one layer, eyes on me the whole time.", tier: "tease" },
  { text: "Kneel and present yourself prettily.", tier: "tease" },
  { text: "Beg out loud for what you want.", tier: "tease" },
  { text: "Run your hands over yourself where you ache.", tier: "tease" },
  { text: "Bite your lip and give me your neediest look.", tier: "tease" },
  { text: "Touch yourself for me — but don't you dare finish.", tier: "explicit" },
  { text: "Show me how you tease yourself when no one's watching.", tier: "explicit" },
  { text: "Put on a show with your hands. Make it filthy.", tier: "explicit" },
  { text: "Take yourself right to the edge, then stop.", tier: "explicit" },
  { text: "Spread out and let me see all of you.", tier: "explicit" },
  { text: "Use your toy on yourself, slow and obedient.", tier: "explicit" },
  { text: "Edge yourself three times and count each one out loud.", tier: "filthy" },
  { text: "Tease your most sensitive spot until you're shaking.", tier: "filthy" },
  { text: "Put on your filthiest performance and don't hold back.", tier: "filthy" },
  { text: "Show me exactly how desperate you are.", tier: "filthy" },
  { text: "Make a mess of yourself for my entertainment.", tier: "filthy" },
  { text: "Perform like the needy thing you are.", tier: "filthy" },
];

const GRADES = [
  { label: "Pathetic", color: "#71717a" },
  { label: "Good", color: "#74B9FF" },
  { label: "Hot", color: "#FDCB6E" },
  { label: "Filthy", color: "#FF7675" },
  { label: "Perfect", color: "#C77DFF" },
];
// Base reward intensity + pattern per grade. Pathetic = denial.
const REWARD_LEVEL = [0.0, 0.45, 0.65, 0.85, 1.0];
const REWARD_PATTERN: (string | null)[] = [null, "waves", "pulse", "throb", "surge"];
const GRADE_IS_SUCCESS = (g: number) => g >= 2; // Hot and above keeps a streak alive

const TIERS: { id: PerfTier; label: string }[] = [
  { id: "tease", label: "Tease" }, { id: "explicit", label: "Explicit" }, { id: "filthy", label: "Filthy" },
];

const TICK_MS = 33;
const TEASE_MS = 750;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export default function DsModeDomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const session = useControlSession("remote", id);
  const scene = useScene("dom", id);
  useWakeLock(true);

  const ended = session.sessionStatus === "ended";
  const stopped = session.pausedBy === "host";
  const live = session.partnerConnected && !ended && !stopped;

  // --- Display state ---
  const [level, setLevel] = useState(0);
  const [activePattern, setActivePattern] = useState<string | null>(null);
  const [customCmd, setCustomCmd] = useState("");
  const [tierFilter, setTierFilter] = useState<PerfTier>("tease");
  const [customAction, setCustomAction] = useState("");

  // Performance loop ("perf" — not the global performance object)
  const perf = scene.performance;
  const inPerf = !!perf;

  // --- Output engine refs (drives session.updateVibration directly) ---
  const levelRef = useRef(0);
  const modeRef = useRef<"manual" | "pattern">("manual");
  const patternRef = useRef<string | null>(null);
  const teaseUntilRef = useRef(0);
  const startRef = useRef(0);
  const lastOutRef = useRef(-1);
  const runningRef = useRef(false);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable reference — session is a fresh object each render, but its callbacks aren't.
  const updateVibration = session.updateVibration;

  const emit = useCallback((out: number) => {
    if (Math.abs(out - lastOutRef.current) > 0.004 || (out === 0 && lastOutRef.current !== 0)) {
      lastOutRef.current = out;
      updateVibration(out);
    }
  }, [updateVibration]);

  const tick = useCallback(() => {
    if (!runningRef.current) return;
    const now = performance.now();
    let out: number;
    if (now < teaseUntilRef.current) {
      out = 0.92;
    } else if (modeRef.current === "pattern" && patternRef.current) {
      const proc = registry.get(patternRef.current);
      const elapsed = (now - startRef.current) / 1000;
      out = clamp01((proc ? (proc({ elapsed, speed: 0.6 }) ?? 0) : 0) * levelRef.current);
    } else {
      out = levelRef.current;
    }
    emit(out);
    loopRef.current = setTimeout(tick, TICK_MS);
  }, [emit]);

  // Run the loop only while the scene is live.
  useEffect(() => {
    if (live) {
      if (!runningRef.current) {
        runningRef.current = true;
        startRef.current = performance.now();
        lastOutRef.current = -1;
        tick();
      }
    } else {
      runningRef.current = false;
      if (loopRef.current) { clearTimeout(loopRef.current); loopRef.current = null; }
      updateVibration(0);
      lastOutRef.current = 0;
    }
    return () => { if (loopRef.current) { clearTimeout(loopRef.current); loopRef.current = null; } };
  }, [live, tick, updateVibration]);

  useEffect(() => () => { runningRef.current = false; }, []);

  // Snapshot so the host's dropout-fallback keeps the pattern going if our link blips.
  useEffect(() => {
    const save = () => session.saveSnapshot({
      mode: modeRef.current === "pattern" ? "patterns" : "manual",
      patternType: patternRef.current,
      speed: 0.6,
      manualValue: levelRef.current,
    });
    save();
    const i = setInterval(save, 4000);
    return () => clearInterval(i);
  }, [activePattern, level, session.saveSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Controls ---
  const setLevelBoth = (v: number) => { levelRef.current = v; setLevel(v); };
  const selectPattern = (pid: string) => {
    if (patternRef.current === pid) { // toggle off → back to manual hold
      patternRef.current = null; modeRef.current = "manual"; setActivePattern(null);
      return;
    }
    modeRef.current = "pattern";
    patternRef.current = pid;
    startRef.current = performance.now();
    setActivePattern(pid);
    if (levelRef.current < 0.15) setLevelBoth(0.6); // give the pattern something to ride on
  };
  const tease = () => { teaseUntilRef.current = performance.now() + TEASE_MS; };
  const deny = () => {
    teaseUntilRef.current = 0;
    modeRef.current = "manual"; patternRef.current = null; setActivePattern(null);
    setLevelBoth(0);
  };

  // --- Performance handlers ---
  const assignAction = (text: string, tier: PerfTier) => scene.assignPerformance(text, tier, perf?.streak ?? 0);
  const drawRandom = () => {
    const pool = PERFORMANCE_DECK.filter((d) => d.tier === tierFilter);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) assignAction(pick.text, pick.tier);
  };
  const scoreNow = (grade: number) =>
    scene.scorePerformance(grade, GRADE_IS_SUCCESS(grade) ? (perf?.streak ?? 0) + 1 : 0);
  const exitPerformance = () => {
    scene.exitPerformance();
    teaseUntilRef.current = 0;
    modeRef.current = "manual"; patternRef.current = null;
    setLevelBoth(0); setActivePattern(null);
  };

  // The score drives the reward automatically: a good grade earns a pleasurable
  // pattern that sustains until the next action is assigned (which resets to 0).
  useEffect(() => {
    if (!inPerf || !perf) return;
    if (perf.status === "scored" && perf.score != null) {
      const base = REWARD_LEVEL[perf.score] ?? 0;
      const lvl = clamp01(base + (GRADE_IS_SUCCESS(perf.score) ? (perf.streak ?? 0) * 0.05 : 0));
      const pat = REWARD_PATTERN[perf.score] ?? null;
      if (pat && lvl > 0) { modeRef.current = "pattern"; patternRef.current = pat; startRef.current = performance.now(); }
      else { modeRef.current = "manual"; patternRef.current = null; }
      levelRef.current = lvl; setLevel(lvl); setActivePattern(pat);
    } else {
      // idle / assigned / performed → no reward; they're working for it
      modeRef.current = "manual"; patternRef.current = null; levelRef.current = 0;
      setLevel(0); setActivePattern(null);
    }
  }, [inPerf, perf?.status, perf?.score, perf?.streak]); // eslint-disable-line react-hooks/exhaustive-deps

  // endSession is a no-op for the remote role, so end the scene by writing
  // status directly — the host (sub) reacts to 'ended' and stops its device.
  const endScene = () => {
    scene.clearScene();
    set(ref(rtdb, `sessions/${id}/status`), "ended").catch(() => {});
  };

  // --- Aftercare ---
  if (ended) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 select-none">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center space-y-8">
          <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-3">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Scene Complete</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Check in with your submissive. Aftercare matters as much as the scene.</p>
          </div>
          <Button asChild className="w-full h-14 font-black uppercase tracking-widest rounded-2xl"><Link href="/ds-mode">Return</Link></Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-5 pt-8 select-none">
      <div className="max-w-md w-full space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">D/s <span className="text-primary">Mode</span></h2>
            <div className="flex items-center gap-1.5">
              <Crown className="w-2.5 h-2.5 text-primary" />
              <p className="text-[8px] font-black text-primary uppercase tracking-[0.3em]">Dominant · Console</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", session.partnerConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{session.partnerConnected ? "Linked" : "Waiting"}</span>
            </div>
            <Button onClick={endScene} variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {!session.partnerConnected ? (
          <div className="py-20 flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin opacity-70" />
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Waiting for your submissive</h3>
              <p className="text-sm text-muted-foreground">The console unlocks the moment they connect their device.</p>
            </div>
            <p className="text-[10px] font-mono text-primary/50">{id}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Mode toggle */}
            <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-white/5 gap-1">
              <button onClick={exitPerformance}
                className={cn("flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5", !inPerf ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}>
                <Sliders className="w-3.5 h-3.5" /> Free Play
              </button>
              <button onClick={() => scene.enterPerformance()}
                className={cn("flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5", inPerf ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}>
                <Drama className="w-3.5 h-3.5" /> Show Time
              </button>
            </div>

            {/* Permission request */}
            <AnimatePresence>
              {scene.request && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <HandHeart className="w-5 h-5 text-amber-300 animate-pulse" />
                      <p className="text-sm font-black uppercase tracking-widest text-amber-200">They&apos;re begging for permission</p>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={scene.grant} className="flex-1 h-12 font-black uppercase tracking-widest text-xs rounded-xl bg-emerald-600 hover:bg-emerald-500 gap-2">
                        <Check className="w-4 h-4" /> Grant
                      </Button>
                      <Button onClick={scene.deny} variant="destructive" className="flex-1 h-12 font-black uppercase tracking-widest text-xs rounded-xl gap-2">
                        <X className="w-4 h-4" /> Deny
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!inPerf && (<>
            {/* Intensity */}
            <div className="rounded-2xl border border-white/10 bg-card/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Intensity {activePattern && <span className="text-primary/60">· {activePattern}</span>}</span>
                <span className="text-xl font-black text-primary tabular-nums">{Math.round(level * 100)}%</span>
              </div>
              <Slider value={[level * 100]} max={100} onValueChange={(v) => setLevelBoth(v[0] / 100)} />
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button onClick={tease} variant="outline" className="h-12 rounded-xl border-primary/30 text-primary hover:bg-primary/10 font-black uppercase tracking-widest text-xs gap-2">
                  <Zap className="w-4 h-4" /> Tease
                </Button>
                <Button onClick={deny} variant="outline" className="h-12 rounded-xl border-white/10 text-muted-foreground hover:bg-white/5 font-black uppercase tracking-widest text-xs gap-2">
                  <ZapOff className="w-4 h-4" /> Deny
                </Button>
              </div>
            </div>

            {/* Pattern presets */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gift className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Reward</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {REWARD_PATTERNS.map((p) => (
                  <button key={p.id} onClick={() => selectPattern(p.id)}
                    className={cn("h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                      activePattern === p.id ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white")}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Punish</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PUNISH_PATTERNS.map((p) => (
                  <button key={p.id} onClick={() => selectPattern(p.id)}
                    className={cn("h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                      activePattern === p.id ? "bg-red-500/20 border-red-500/50 text-red-300" : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white")}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Command palette */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Command</span>
                {scene.command && <span className="text-[9px] text-muted-foreground">· sent: {scene.command}{scene.acknowledged ? " ✓" : ""}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMANDS.map((c) => (
                  <button key={c} onClick={() => scene.sendCommand(c)}
                    className={cn("px-3.5 h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                      scene.command === c ? "bg-primary/20 border-primary/50 text-primary" : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white")}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={customCmd} onChange={(e) => setCustomCmd(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && customCmd.trim()) { scene.sendCommand(customCmd.trim()); setCustomCmd(""); } }}
                  placeholder="Custom command…" className="h-11 bg-zinc-900 border-white/10 text-sm focus-visible:ring-primary/40" />
                <Button onClick={() => { if (customCmd.trim()) { scene.sendCommand(customCmd.trim()); setCustomCmd(""); } }}
                  disabled={!customCmd.trim()} className="h-11 px-4 font-black uppercase tracking-widest text-xs rounded-xl shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            </>)}

            {inPerf && perf && (
              <div className="space-y-4">
                {(perf.streak ?? 0) > 0 && (
                  <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                    <Trophy className="w-3.5 h-3.5" /> Streak ×{perf.streak}
                  </div>
                )}

                {perf.action ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/70">Current Task</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{perf.tier}</span>
                    </div>
                    <p className="text-base font-bold text-white leading-snug">{perf.action}</p>
                    {perf.status === "assigned" && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Performing…</p>
                    )}
                    {perf.status === "performed" && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 animate-pulse">They&apos;re done — judge them</p>
                    )}

                    {perf.status === "scored" && perf.score != null ? (
                      <div className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Scored</p>
                          <p className="text-lg font-black uppercase" style={{ color: GRADES[perf.score].color }}>{GRADES[perf.score].label}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Reward</p>
                          <p className="text-lg font-black text-primary tabular-nums">{Math.round(level * 100)}%</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-1.5">
                        {GRADES.map((g, i) => (
                          <button key={g.label} onClick={() => scoreNow(i)}
                            className="flex flex-col items-center gap-1 py-2 rounded-lg border border-white/5 bg-zinc-900 hover:bg-zinc-800 active:scale-95 transition-all">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                            <span className="text-[7px] font-black uppercase tracking-wider text-zinc-400">{g.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-card/40 p-4 text-center">
                    <p className="text-sm text-muted-foreground">Assign their first act below.</p>
                  </div>
                )}

                {/* Assign controls */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-white/5 gap-1 flex-1">
                      {TIERS.map((t) => (
                        <button key={t.id} onClick={() => setTierFilter(t.id)}
                          className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", tierFilter === t.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <Button onClick={drawRandom} variant="outline" className="h-[42px] px-4 rounded-xl border-primary/30 text-primary hover:bg-primary/10 font-black uppercase tracking-widest text-[10px] gap-1.5 shrink-0">
                      <Shuffle className="w-3.5 h-3.5" /> Draw
                    </Button>
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto no-scrollbar pr-1">
                    {PERFORMANCE_DECK.filter((d) => d.tier === tierFilter).map((d) => (
                      <button key={d.text} onClick={() => assignAction(d.text, d.tier)}
                        className={cn("w-full text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all",
                          perf.action === d.text ? "border-primary/50 bg-primary/10 text-white" : "border-white/5 bg-zinc-900 text-zinc-300 hover:bg-zinc-800")}>
                        {d.text}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input value={customAction} onChange={(e) => setCustomAction(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && customAction.trim()) { assignAction(customAction.trim(), tierFilter); setCustomAction(""); } }}
                      placeholder="Write a custom task…" className="h-11 bg-zinc-900 border-white/10 text-sm focus-visible:ring-primary/40" />
                    <Button onClick={() => { if (customAction.trim()) { assignAction(customAction.trim(), tierFilter); setCustomAction(""); } }}
                      disabled={!customAction.trim()} className="h-11 px-4 font-black uppercase tracking-widest text-xs rounded-xl shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SUB STOPPED overlay */}
      <AnimatePresence>
        {stopped && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center gap-6 p-8 text-center">
            <Square className="w-16 h-16 text-destructive fill-current" />
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter">They Stopped</h3>
              <p className="text-sm text-muted-foreground">Your submissive paused the scene. Controls are locked until they resume. Check in with them.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
