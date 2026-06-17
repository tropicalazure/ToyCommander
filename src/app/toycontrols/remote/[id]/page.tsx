
"use client";

import { use, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Globe, 
  Pause, 
  Play, 
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvatarColorClass } from "@/lib/avatar";
import { ControlHub } from "@/components/features/toycontrols/control-hub";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useControlSession } from "@/hooks/use-control-session";
import { useVibrationEngine } from "@/hooks/use-vibration-engine";

export default function RemoteControlPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const session = useControlSession('remote', id);
  const engine = useVibrationEngine({ 
    onValueChange: session.updateVibration,
    disabled: session.sessionStatus === 'ended' || session.pausedBy !== null
  });

  useWakeLock(true);

  useEffect(() => {
    if (session.sessionStatus === 'ended') engine.stopAll();
  }, [session.sessionStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a fresh ref so the interval below always reads the latest engine state
  // without needing to re-register the interval on every render.
  const engineRef = useRef(engine);
  engineRef.current = engine;

  // Save a snapshot to RTDB whenever the active pattern/mode changes, and
  // every 5 seconds as a keep-alive. The host reads this when real-time
  // updates stop and runs the pattern locally until the connection recovers.
  useEffect(() => {
    const save = () => session.saveSnapshot({
      mode: engineRef.current.mode,
      patternType: engineRef.current.patternType,
      speed: engineRef.current.pulseSpeed,
      manualValue: engineRef.current.manualValue,
    });

    save();
    const interval = setInterval(save, 5000);
    return () => clearInterval(interval);
  }, [engine.mode, engine.patternType, engine.pulseSpeed, session.saveSnapshot]);

  const pausedByHost = session.pausedBy === 'host';
  const pausedByController = session.pausedBy === 'controller';

  const sessionControls = (
    <div className="flex items-center gap-1">
      <Button
        onClick={session.togglePause}
        disabled={pausedByHost}
        variant={pausedByController ? "destructive" : "ghost"}
        size="icon"
        className="h-7 w-7 rounded-full"
        title={pausedByHost ? "Paused by host" : undefined}
      >
        {pausedByController || pausedByHost ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
      </Button>
      <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive">
        <Link href="/"><LogOut className="w-3.5 h-3.5" /></Link>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 md:p-12 pt-8 md:pt-12 animate-fade-in">
      <header className="flex items-center justify-between gap-4 px-2 mb-8 md:mb-12 max-w-xl mx-auto w-full border-b border-border/20 pb-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black font-headline tracking-tighter text-white leading-none uppercase">TOY<span className="text-primary"> CONTROLS</span></h2>
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-primary animate-pulse" />
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Connected to Partner</p>
          </div>
        </div>

        {/* Host Connection Banner */}
        {session.hostProfile ? (
          <div className="flex items-center gap-2 p-1.5 px-3 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black text-white uppercase tracking-tight shrink-0">
            <span className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center text-xs shrink-0",
              getAvatarColorClass(session.hostProfile.avatarColor)
            )}>
              {session.hostProfile.avatarEmoji}
            </span>
            <span className="truncate max-w-[100px]">{session.hostProfile.displayName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-1.5 px-3 bg-muted/30 border border-border/50 rounded-full text-[10px] font-black text-muted-foreground uppercase tracking-tight shrink-0">
            <div className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center text-xs">👤</div>
            <span>Guest Room</span>
          </div>
        )}
      </header>


      <div className="flex-1 flex flex-col items-center">
        <div className="max-w-xl w-full space-y-6 md:space-y-10">
          <div className="relative w-full">
            <ControlHub
              {...engine}
              {...session}
              role="remote"
              disabled={session.pausedBy !== null || session.sessionStatus === 'ended'}
              sessionActions={sessionControls}
              onUIChange={session.updateUIState}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
