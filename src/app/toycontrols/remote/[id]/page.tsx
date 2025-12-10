
"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Globe, 
  Pause, 
  Play, 
  LogOut
} from "lucide-react";
import { ControlHub } from "@/components/features/toycontrols/control-hub";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useControlSession } from "@/hooks/use-control-session";
import { useVibrationEngine } from "@/hooks/use-vibration-engine";
import { SessionOverlays } from "@/components/features/toycontrols/session-overlays";

export default function RemoteControlPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const session = useControlSession('remote', id);
  const engine = useVibrationEngine({ 
    onValueChange: session.updateVibration,
    disabled: session.sessionStatus === 'ended' || session.pausedBy !== null
  });

  useWakeLock(true);

  const sessionControls = (
    <div className="flex items-center gap-1">
      <Button onClick={session.togglePause} variant={session.pausedBy === 'controller' ? "destructive" : "ghost"} size="icon" className="h-7 w-7 rounded-full">
        {session.pausedBy === 'controller' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
      </Button>
      <Button asChild variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive">
        <Link href="/"><LogOut className="w-3.5 h-3.5" /></Link>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 md:p-12 pt-8 md:pt-12">
      <header className="flex items-center gap-4 px-2 mb-8 md:mb-12 max-w-xl mx-auto w-full">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-4xl font-black font-headline tracking-tighter text-white leading-none uppercase">TOY<span className="text-primary"> CONTROLS</span></h2>
          <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-primary animate-pulse" /><p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Connected to Partner</p></div>
        </div>
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

            <SessionOverlays 
              role="remote"
              pausedBy={session.pausedBy}
              sessionStatus={session.sessionStatus}
              onTogglePause={session.togglePause}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
