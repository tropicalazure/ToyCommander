
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { ReactiveMaze } from "@/components/features/games/reactive-maze";
import { applyVibrationSafe, stopAllDevices } from "@/lib/buttplug/toy-client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Zap, BarChart2, Trophy } from "lucide-react";
import Link from "next/link";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { cn } from "@/lib/utils";

export default function ReactiveMazeSoloPage() {
  const [vibration, setVibration] = useState(0);
  const [level, setLevel] = useState(1);
  const [moves, setMoves] = useState(0);

  useWakeLock(true);

  const handleVibrate = useCallback((val: number) => {
    setVibration(val);
    applyVibrationSafe(val);
  }, []);

  const handleMove = useCallback(() => {
    setMoves(m => m + 1);
  }, []);

  const handleWin = useCallback(() => {
    setLevel(l => l + 1);
    setMoves(0);
    // The ReactiveMaze component generates a new maze internally via generateMaze on "Next Level"
    // We keep level/moves in the page and reset moves when the maze resets
  }, []);

  useEffect(() => {
    return () => { stopAllDevices(); };
  }, []);

  const difficulty = Math.min((level - 1) * 0.12, 1);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12">
      <div className="max-w-md w-full space-y-8">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <Link href="/games"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="text-right">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Reactive <span className="text-primary">Maze</span></h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Tactile Navigation</p>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-3 w-full">
          <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Zap className={cn("w-4 h-4", vibration > 0 ? "text-primary animate-pulse" : "text-muted-foreground opacity-30")} />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Feedback</p>
            </div>
            <p className="text-xl font-black text-primary leading-none">{Math.round(vibration * 100)}%</p>
          </div>
          <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Level</p>
            </div>
            <p className="text-xl font-black text-white leading-none">{level}</p>
          </div>
          <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-muted-foreground opacity-60" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Moves</p>
            </div>
            <p className="text-xl font-black text-white leading-none">{moves}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-8">
          <ReactiveMaze
            onVibrate={handleVibrate}
            onMove={handleMove}
            onWin={handleWin}
            difficulty={difficulty}
          />
        </div>

        <footer className="text-center pt-4 pb-8 opacity-20">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">
            Level {level} · Hazard Speed {Math.round(difficulty * 100)}% · Precision Required
          </p>
        </footer>
      </div>
    </div>
  );
}
