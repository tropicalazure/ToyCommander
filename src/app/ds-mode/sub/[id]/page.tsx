
"use client";

import React, { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Heart, Copy, Check, Bluetooth, Square, Play, HandHeart,
  Loader2, Crown, Sparkles, Drama,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useControlSession } from "@/hooks/use-control-session";
import { useScene } from "@/hooks/use-scene";
import { stopAllDevices } from "@/lib/buttplug/toy-client";
import { cn } from "@/lib/utils";

const GRADE_LABELS = [
  { label: "Pathetic", color: "#71717a" },
  { label: "Good", color: "#74B9FF" },
  { label: "Hot", color: "#FDCB6E" },
  { label: "Filthy", color: "#FF7675" },
  { label: "Perfect", color: "#C77DFF" },
];

export default function DsModeSubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const session = useControlSession("host", id);
  const scene = useScene("sub", id);
  useWakeLock(true);

  const armedDevices = session.devices.filter((d) => d.active).length;
  const stopped = session.pausedBy === "host";
  const ended = session.sessionStatus === "ended";
  const live = session.partnerConnected && !ended;

  // --- STOP / resume (hard-stop via the existing pause channel) -------------
  const hardStop = () => {
    stopAllDevices();
    if (!session.pausedBy) session.togglePause();
  };
  const resume = () => { if (session.pausedBy === "host") session.togglePause(); };

  const copyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(`${window.location.origin}/ds-mode/dom/${id}`);
    setCopied(true);
    toast({ title: "Invite copied", description: "Send it to your Dominant." });
    setTimeout(() => setCopied(false), 2000);
  };

  // Stop the device whenever the scene ends — the Dom may end it remotely,
  // which doesn't otherwise zero the host's output.
  useEffect(() => { if (ended) stopAllDevices(); }, [ended]);

  // --- verdict flash --------------------------------------------------------
  const [verdictFlash, setVerdictFlash] = useState<"granted" | "denied" | null>(null);
  const lastVerdictRef = useRef<number>(0);
  useEffect(() => {
    if (scene.verdict && scene.verdict.at !== lastVerdictRef.current) {
      lastVerdictRef.current = scene.verdict.at;
      setVerdictFlash(scene.verdict.result);
      const t = setTimeout(() => setVerdictFlash(null), 2600);
      return () => clearTimeout(t);
    }
  }, [scene.verdict]);

  const requestPending = !!scene.request;
  const intensity = Math.round(session.vibration * 100);
  const perf = scene.performance;

  // --- Aftercare ------------------------------------------------------------
  if (ended) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 select-none">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center space-y-8">
          <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-3">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Scene Complete</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Take a breath. Drink some water. Be gentle with yourself — and with each other. You did well.
            </p>
          </div>
          <Button asChild className="w-full h-14 font-black uppercase tracking-widest rounded-2xl">
            <Link href="/ds-mode">Return</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-10 select-none">
      <div className="max-w-md w-full space-y-6 flex-1 flex flex-col">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">D/s <span className="text-primary">Mode</span></h2>
            <div className="flex items-center gap-1.5">
              <Heart className="w-2.5 h-2.5 text-primary" />
              <p className="text-[8px] font-black text-primary uppercase tracking-[0.3em]">Submissive</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", live ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {live ? "Controlled" : "Waiting"}
            </span>
          </div>
        </header>

        {!session.partnerConnected ? (
          // ---- Setup / waiting ----
          <div className="flex-1 flex flex-col gap-5 justify-center">
            <div className="rounded-3xl border border-white/10 bg-card/40 p-6 space-y-5 text-center">
              <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin opacity-70" />
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Prepare Yourself</h3>
                <p className="text-sm text-muted-foreground">Arm your device, then send the invite. Control passes the moment your Dominant joins.</p>
              </div>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-device-manager"))}
                className={cn("w-full flex items-center justify-center gap-2 h-12 rounded-xl border font-black uppercase tracking-widest text-xs transition-all",
                  armedDevices > 0 ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 bg-zinc-900 text-zinc-400")}
              >
                <Bluetooth className="w-4 h-4" />
                {armedDevices > 0 ? `${armedDevices} Device${armedDevices !== 1 ? "s" : ""} Armed` : "Arm a Device"}
              </button>

              <Button onClick={copyLink} className="w-full h-12 font-black uppercase tracking-widest text-xs rounded-xl gap-2">
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy Invite Link</>}
              </Button>
              <p className="text-[10px] font-mono text-primary/60">{id}</p>
            </div>
          </div>
        ) : perf ? (
          // ---- Performance loop ----
          <div className="flex-1 flex flex-col gap-6">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center min-h-[6rem] flex flex-col justify-center gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/70 flex items-center justify-center gap-1.5">
                <Drama className="w-3 h-3" /> Show Time{perf.tier ? ` · ${perf.tier}` : ""}
              </p>
              <AnimatePresence mode="wait">
                <motion.h3 key={perf.action ?? perf.status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={cn("font-black tracking-tight", perf.action ? "text-xl text-white" : "text-sm text-muted-foreground uppercase")}>
                  {perf.action ?? "Await your task…"}
                </motion.h3>
              </AnimatePresence>
              {perf.status === "performed" && <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 animate-pulse">Awaiting judgment…</p>}
              {perf.status === "scored" && perf.score != null && (
                <p className="text-lg font-black uppercase tracking-tight" style={{ color: GRADE_LABELS[perf.score].color }}>{GRADE_LABELS[perf.score].label}</p>
              )}
            </div>

            {/* Reward orb */}
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-52 h-52 flex items-center justify-center">
                <motion.div animate={{ scale: 1 + session.vibration * 0.5, opacity: 0.12 + session.vibration * 0.55 }} transition={{ duration: 0.12 }}
                  className="absolute inset-0 rounded-full bg-primary blur-2xl" />
                <div className="relative w-40 h-40 rounded-full border-2 border-primary/30 bg-black/40 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-white tabular-nums">{intensity}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{perf.status === "scored" ? "reward" : "intensity"}</span>
                </div>
              </div>
            </div>

            {perf.status === "assigned" ? (
              <Button onClick={scene.markPerformed} className="w-full h-16 font-black uppercase tracking-[0.15em] text-base rounded-2xl gap-2 shadow-xl shadow-primary/20">
                <Check className="w-5 h-5" /> I Performed It
              </Button>
            ) : (
              <div className="h-16 flex items-center justify-center rounded-2xl border border-white/5 bg-zinc-900/40 px-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {perf.status === "performed" ? "Wait to be judged" : perf.status === "scored" ? "Reward earned — await your next task" : "Await your task"}
                </p>
              </div>
            )}
          </div>
        ) : (
          // ---- Live scene (free play) ----
          <div className="flex-1 flex flex-col gap-6">
            {/* Command */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center min-h-[5.5rem] flex flex-col justify-center gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/70 flex items-center justify-center gap-1.5">
                <Crown className="w-3 h-3" /> Command
              </p>
              <AnimatePresence mode="wait">
                <motion.h3 key={scene.command ?? "none"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={cn("font-black uppercase tracking-tight", scene.command ? "text-2xl text-white" : "text-sm text-muted-foreground")}>
                  {scene.command ?? "Await instruction"}
                </motion.h3>
              </AnimatePresence>
              {scene.command && (
                scene.acknowledged ? (
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Obeyed ✓</p>
                ) : (
                  <button onClick={scene.acknowledge} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors">
                    Tap to obey
                  </button>
                )
              )}
            </div>

            {/* Intensity orb */}
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-52 h-52 flex items-center justify-center">
                <motion.div
                  animate={{ scale: 1 + session.vibration * 0.5, opacity: 0.12 + session.vibration * 0.55 }}
                  transition={{ duration: 0.12 }}
                  className="absolute inset-0 rounded-full bg-primary blur-2xl"
                />
                <div className="relative w-40 h-40 rounded-full border-2 border-primary/30 bg-black/40 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-white tabular-nums">{intensity}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">intensity</span>
                </div>
              </div>
            </div>

            {/* Permission */}
            <button
              onClick={scene.requestPermission}
              disabled={requestPending}
              className={cn("w-full h-14 rounded-2xl border font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2",
                requestPending ? "border-amber-500/30 bg-amber-500/10 text-amber-300 animate-pulse" : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 active:scale-95")}
            >
              <HandHeart className="w-5 h-5" />
              {requestPending ? "Awaiting their decision…" : "Request Permission"}
            </button>
          </div>
        )}

        {/* STOP (always available once connected) */}
        {session.partnerConnected && (
          <Button onClick={hardStop} variant="destructive"
            className="w-full h-16 font-black uppercase tracking-[0.2em] text-base rounded-2xl gap-3 shadow-xl shadow-destructive/20">
            <Square className="w-5 h-5 fill-current" /> Stop
          </Button>
        )}
      </div>

      {/* Verdict flash */}
      <AnimatePresence>
        {verdictFlash && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className={cn("px-12 py-8 rounded-3xl backdrop-blur-xl border text-center",
              verdictFlash === "granted" ? "bg-emerald-500/15 border-emerald-500/40" : "bg-red-500/15 border-red-500/40")}>
              <p className={cn("text-4xl font-black uppercase tracking-tighter", verdictFlash === "granted" ? "text-emerald-400" : "text-red-400")}>
                {verdictFlash === "granted" ? "Granted" : "Denied"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STOP overlay */}
      <AnimatePresence>
        {stopped && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 p-8 text-center">
            <Square className="w-16 h-16 text-destructive fill-current" />
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Stopped</h3>
              <p className="text-sm text-muted-foreground">Everything is paused. Your Dominant can&apos;t act until you resume.</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button onClick={resume} className="h-14 font-black uppercase tracking-widest rounded-2xl gap-2">
                <Play className="w-5 h-5 fill-current" /> Resume
              </Button>
              <Button onClick={session.endSession} variant="outline" className="h-12 font-black uppercase tracking-widest text-xs rounded-2xl border-white/10">
                End Scene
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
