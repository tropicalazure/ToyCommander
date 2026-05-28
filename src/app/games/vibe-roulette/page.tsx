
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, RefreshCw, Dices } from "lucide-react";
import Link from "next/link";
import { applyVibrationSafe, stopAllDevices } from "@/lib/buttplug/toy-client";
import { registry } from "@/lib/vibration-patterns";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { cn } from "@/lib/utils";

interface Segment {
  label: string;
  sublabel: string;
  patternId: string;
  intensity: number;
  duration: number;
  color: string;
  textColor: string;
}

const SEGMENTS: Segment[] = [
  { label: "MAX SURGE",    sublabel: "8s",  patternId: "surge",     intensity: 1.0,  duration: 8,  color: "#6C5CE7", textColor: "#fff" },
  { label: "HEARTBEAT",   sublabel: "20s", patternId: "heartbeat", intensity: 0.80, duration: 20, color: "#FF4757", textColor: "#fff" },
  { label: "OCEAN DRIFT", sublabel: "30s", patternId: "ocean",     intensity: 0.60, duration: 30, color: "#0984E3", textColor: "#fff" },
  { label: "FLUTTER",     sublabel: "20s", patternId: "flutter",   intensity: 0.65, duration: 20, color: "#C77DFF", textColor: "#fff" },
  { label: "EARTHQUAKE",  sublabel: "12s", patternId: "earthquake",intensity: 0.90, duration: 12, color: "#FF9F43", textColor: "#fff" },
  { label: "SLOW CLIMB",  sublabel: "25s", patternId: "climb",     intensity: 0.75, duration: 25, color: "#00B894", textColor: "#fff" },
  { label: "BREATHE",     sublabel: "25s", patternId: "breath",    intensity: 0.50, duration: 25, color: "#74B9FF", textColor: "#111" },
  { label: "ERRATIC",     sublabel: "15s", patternId: "erratic",   intensity: 0.85, duration: 15, color: "#FDCB6E", textColor: "#111" },
];

const N = SEGMENTS.length;
const ANGLE = 360 / N;

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function wedgePath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, end);
  return `M${cx},${cy} L${s.x.toFixed(3)},${s.y.toFixed(3)} A${r},${r},0,0,1,${e.x.toFixed(3)},${e.y.toFixed(3)} Z`;
}

type Phase = 'idle' | 'spinning' | 'playing' | 'done';

export default function VibeRoulettePage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [totalRotation, setTotalRotation] = useState(0);
  const [landed, setLanded] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDuration, setTotalDuration] = useState(1);
  const [spinsCount, setSpinsCount] = useState(0);

  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useWakeLock(true);

  const stopPattern = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    applyVibrationSafe(0);
    stopAllDevices();
  }, []);

  const playSegment = useCallback((segIdx: number) => {
    const seg = SEGMENTS[segIdx];
    const processor = registry.get(seg.patternId);
    if (!processor) return;

    setTimeLeft(seg.duration);
    setTotalDuration(seg.duration);

    const startMs = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - startMs) / 1000;
      if (elapsed >= seg.duration) {
        applyVibrationSafe(0);
        setPhase('done');
        return;
      }
      const raw = processor({ elapsed, speed: 0.6 }) ?? 0;
      applyVibrationSafe(raw * seg.intensity);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    let remaining = seg.duration;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 1000);
  }, []);

  const spin = useCallback(() => {
    if (phase === 'spinning') return;
    stopPattern();

    const extra = 1440 + Math.random() * 720; // 4–6 full rotations
    const finalOffset = Math.floor(Math.random() * 360);
    const newTotal = totalRotation + extra + finalOffset;
    setTotalRotation(newTotal);
    setPhase('spinning');
    setLanded(null);

    // After CSS transition (4s), resolve the landed segment
    spinTimeoutRef.current = setTimeout(() => {
      const normalised = ((newTotal % 360) + 360) % 360;
      const segIdx = Math.floor(normalised / ANGLE) % N;
      setLanded(segIdx);
      setPhase('playing');
      setSpinsCount(c => c + 1);
      playSegment(segIdx);
    }, 4100);
  }, [phase, totalRotation, stopPattern, playSegment]);

  useEffect(() => {
    return () => {
      stopPattern();
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, [stopPattern]);

  const seg = landed !== null ? SEGMENTS[landed] : null;
  const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;
  const CIRCUM = 2 * Math.PI * 42;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12 select-none">
      <div className="max-w-md w-full space-y-8">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <Link href="/games"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="text-right">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Vibe <span className="text-primary">Roulette</span></h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Spin &amp; Surrender</p>
          </div>
        </header>

        <div className="flex flex-col items-center gap-8">
          {/* Needle */}
          <div className="relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 flex flex-col items-center">
              <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[18px] border-l-transparent border-r-transparent border-t-white drop-shadow-lg" />
            </div>

            {/* Wheel */}
            <div
              className="w-72 h-72 rounded-full relative overflow-hidden shadow-2xl border-4 border-white/10"
              style={{
                transform: `rotate(${totalRotation}deg)`,
                transition: phase === 'spinning' ? 'transform 4s cubic-bezier(0.17, 0.67, 0.08, 1)' : 'none',
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {SEGMENTS.map((s, i) => {
                  const startAngle = i * ANGLE;
                  const endAngle = startAngle + ANGLE;
                  const midAngle = startAngle + ANGLE / 2;
                  const labelPt = polarToCartesian(50, 50, 31, midAngle);
                  const subPt = polarToCartesian(50, 50, 37, midAngle);
                  const rot = midAngle - 90;

                  return (
                    <g key={i}>
                      <path d={wedgePath(50, 50, 50, startAngle, endAngle)} fill={s.color} />
                      <path d={wedgePath(50, 50, 50, startAngle, endAngle)} fill="rgba(0,0,0,0.08)" />
                      <text
                        x={labelPt.x} y={labelPt.y}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize="4" fontWeight="900" fill={s.textColor}
                        style={{ fontFamily: 'system-ui', letterSpacing: '0.05em' }}
                        transform={`rotate(${rot}, ${labelPt.x}, ${labelPt.y})`}
                      >
                        {s.label}
                      </text>
                      <text
                        x={subPt.x} y={subPt.y}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize="3" fontWeight="700" fill={s.textColor} opacity="0.7"
                        style={{ fontFamily: 'system-ui' }}
                        transform={`rotate(${rot}, ${subPt.x}, ${subPt.y})`}
                      >
                        {s.sublabel}
                      </text>
                    </g>
                  );
                })}
                {/* Center cap */}
                <circle cx="50" cy="50" r="8" fill="hsl(var(--background))" />
                <circle cx="50" cy="50" r="6" fill="hsl(var(--primary))" />
              </svg>
            </div>
          </div>

          {/* Status panel */}
          <AnimatePresence mode="wait">
            {phase === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Spin Your Fate</h3>
                <p className="text-sm text-muted-foreground">8 experiences. You don't choose. The wheel does.</p>
              </motion.div>
            )}

            {phase === 'spinning' && (
              <motion.div key="spinning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary animate-pulse">Spinning...</p>
              </motion.div>
            )}

            {(phase === 'playing' || phase === 'done') && seg && (
              <motion.div key="playing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="w-full space-y-4">
                <div className="rounded-2xl p-5 text-center space-y-1 border" style={{ backgroundColor: seg.color + '22', borderColor: seg.color + '55' }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: seg.color }}>You Got</p>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{seg.label}</h3>
                  <p className="text-sm text-muted-foreground">{Math.round(seg.intensity * 100)}% intensity · {seg.duration}s</p>
                </div>

                {phase === 'playing' && (
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" stroke="rgba(255,255,255,0.1)" />
                        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" strokeLinecap="round"
                          stroke={seg.color}
                          strokeDasharray={CIRCUM}
                          strokeDashoffset={CIRCUM * (1 - progress)}
                          style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-black text-white tabular-nums">{timeLeft}s</span>
                      </div>
                    </div>
                    <div className="flex-1 bg-muted/10 rounded-xl h-3 overflow-hidden">
                      <motion.div
                        className="h-full rounded-xl"
                        style={{ backgroundColor: seg.color }}
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ duration: 0.9, ease: "linear" }}
                      />
                    </div>
                  </div>
                )}

                {phase === 'done' && (
                  <p className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Experience Complete</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 w-full">
            <Button
              onClick={spin}
              disabled={phase === 'spinning'}
              className={cn(
                "flex-1 h-16 font-black uppercase tracking-widest text-base rounded-2xl gap-3 shadow-xl shadow-primary/20 transition-all",
                phase === 'spinning' && "opacity-50 cursor-not-allowed"
              )}
            >
              <Dices className="w-6 h-6" />
              {phase === 'spinning' ? 'Spinning...' : phase === 'playing' ? 'Spin Again' : 'Spin'}
            </Button>
            {(phase === 'playing' || phase === 'done') && (
              <Button
                onClick={() => { stopPattern(); setPhase('idle'); setLanded(null); }}
                variant="outline"
                size="icon"
                className="h-16 w-16 rounded-2xl border-primary/20 text-primary hover:bg-primary/10 shrink-0"
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
            )}
          </div>

          {spinsCount > 0 && (
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
              {spinsCount} spin{spinsCount !== 1 ? 's' : ''} this session
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
