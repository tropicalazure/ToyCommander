
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  UserRoundPlus,
  Pause,
  Play,
  Home,
  LogOut,
  Globe
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ControlHub } from "@/components/features/toycontrols/control-hub";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useControlSession } from "@/hooks/use-control-session";
import { useVibrationEngine } from "@/hooks/use-vibration-engine";

export default function HostSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const session = useControlSession('host', id);
  const engine = useVibrationEngine({ 
    onValueChange: session.updateVibration,
    disabled: session.partnerConnected 
  });

  useWakeLock(true);

  const openDeviceManager = () => {
    window.dispatchEvent(new CustomEvent('open-device-manager'));
  };

  const copyLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/toycontrols/remote/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Invite Link Copied" });
    setTimeout(() => setCopied(false), 2000);
    setTimeout(() => setIsShareDialogOpen(false), 800);
  };

  const shareDialog = (
    <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-9 gap-3 hover:bg-primary/10 text-primary transition-all pr-1 pl-4 rounded-full group"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:opacity-80">Invite Partner</span>
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-lg shadow-primary/5">
            <UserRoundPlus className="w-3.5 h-3.5" />
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-primary/20 p-4">
        <DialogHeader><DialogTitle className="flex items-center gap-2 uppercase font-black tracking-tighter text-lg"><UserRoundPlus className="w-4 h-4 text-primary" /> Invite Partner</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
             <label className="text-[8px] font-black uppercase tracking-[0.1em] text-muted-foreground opacity-60">Session ID</label>
             <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border border-border/50 text-[10px] font-mono text-primary/80 truncate">{id}</div>
             <Button onClick={copyLink} className="w-full h-11 font-black bg-primary text-primary-foreground rounded-xl uppercase tracking-widest text-xs">{copied ? "Link Copied!" : "Copy Invite Link"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const sessionControls = (
    <div className="flex items-center gap-0.5">
      <Button onClick={session.togglePause} variant={session.pausedBy === 'host' ? "destructive" : "ghost"} size="icon" className="h-6 w-6 md:h-7 md:w-7 rounded-full">
        {session.pausedBy === 'host' ? <Play className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <Pause className="w-3 h-3 md:w-3.5 md:h-3.5" />}
      </Button>
      <Button asChild variant="ghost" size="icon" className="h-6 w-6 md:h-7 md:w-7 rounded-full text-muted-foreground"><Link href="/toycontrols/local"><Home className="w-3 h-3 md:w-3.5 md:h-3.5" /></Link></Button>
      <AlertDialog>
        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 md:h-7 md:w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"><LogOut className="w-3 h-3 md:w-3.5 md:h-3.5" /></Button></AlertDialogTrigger>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-primary/20">
          <AlertDialogHeader><AlertDialogTitle className="font-black uppercase tracking-tighter text-lg text-white">End Session?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={session.endSession} className="rounded-lg bg-destructive h-9">End Session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-3 md:p-6 flex flex-col pt-3 md:pt-4">
      <header className="flex items-center gap-3 mb-4 md:mb-6 px-2 max-w-xl mx-auto w-full">
        <div className="space-y-0.5"><h2 className="text-xl md:text-2xl font-black tracking-tighter text-white uppercase leading-none">TOY<span className="text-primary"> CONTROLS</span></h2><div className="flex items-center gap-1.5"><Globe className="w-2.5 h-2.5 text-primary animate-pulse" /><p className="text-[7px] font-black text-primary uppercase tracking-[0.2em]">Live Session Active</p></div></div>
      </header>

      <div className="flex-1 flex flex-col items-center">
        <div className="max-w-xl w-full space-y-3 md:space-y-4">
          <div className="relative w-full">
            <ControlHub 
              {...engine}
              {...session}
              role="host"
              disabled={session.pausedBy !== null || session.partnerConnected || session.sessionStatus === 'ended'}
              shareAction={shareDialog}
              sessionActions={sessionControls}
              onToggleDevice={session.toggleDevice}
              onUIChange={session.updateUIState}
              onScanForDevices={openDeviceManager}
            />

          </div>
        </div>
      </div>
    </div>
  );
}
