
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { ReactiveMaze } from "@/components/features/games/reactive-maze";
import { applyVibrationSafe, stopAllDevices } from "@/lib/buttplug/toy-client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Zap, Shield } from "lucide-react";
import Link from "next/link";
import { useWakeLock } from "@/hooks/use-wake-lock";

export default function ReactiveMazeSoloPage() {
  const [vibration, setVibration] = useState(0);
  useWakeLock(true);

  const handleVibrate = useCallback(async (val: number) => {
    setVibration(val);
    applyVibrationSafe(val);
  }, []);

  useEffect(() => {
    return () => {
      stopAllDevices();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12">
      <div className="max-w-md w-full space-y-10">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <Link href="/games"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="text-right">
             <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Reactive <span className="text-primary">Maze</span></h2>
             <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Tactile Navigation</p>
          </div>
        </header>

        <div className="flex flex-col items-center gap-8">
           <div className="flex gap-4 w-full">
             <div className="flex-1 bg-card/40 border border-border/50 rounded-2xl p-4 flex items-center gap-3">
                <Zap className={vibration > 0 ? "text-primary animate-pulse" : "text-muted-foreground opacity-30"} />
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-white">Feedback</p>
                   <p className="text-lg font-black text-primary leading-none">{Math.round(vibration * 100)}%</p>
                </div>
             </div>
             <div className="flex-1 bg-card/40 border border-border/50 rounded-2xl p-4 flex items-center gap-3">
                <Shield className="text-muted-foreground opacity-30" />
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-white">Security</p>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Encrypted</p>
                </div>
             </div>
           </div>

           <ReactiveMaze onVibrate={handleVibrate} />
        </div>

        <footer className="text-center pt-8 opacity-20">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">
            Precision Movement Required
          </p>
        </footer>
      </div>
    </div>
  );
}
