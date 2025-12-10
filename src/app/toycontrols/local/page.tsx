"use client";

import { useState } from "react";
import { Shield, Loader2, Zap, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ControlHub } from "@/components/features/toycontrols/control-hub";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { generateFriendlyId } from "@/lib/session-id";
import { useControlSession } from "@/hooks/use-control-session";
import { useVibrationEngine } from "@/hooks/use-vibration-engine";

export default function LocalControlPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isInitializingSync, setIsInitializingSync] = useState(false);

  const session = useControlSession('local');
  const engine = useVibrationEngine({ 
    onValueChange: session.updateVibration 
  });

  useWakeLock(session.devices.length > 0);

  const startRemoteSession = () => {
    setIsInitializingSync(true);
    const id = generateFriendlyId();
    setTimeout(() => {
      toast({ title: "Opening Shared Room", description: "Preparing your secure invitation..." });
    }, 500);
    setTimeout(() => router.push(`/toycontrols/host/${id}`), 2000);
  };

  const openDeviceManager = () => {
    window.dispatchEvent(new CustomEvent('open-device-manager'));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-3 md:p-6 pt-4 md:pt-6">
      <header className="flex items-center gap-3 px-2 mb-4 md:mb-6 max-w-xl mx-auto w-full">
        <div className="space-y-0.5">
          <h2 className="text-xl md:text-2xl font-black font-headline tracking-tighter text-white uppercase leading-none">
            TOY<span className="text-primary"> CONTROLS</span>
          </h2>
          <div className="flex items-center gap-1.5">
            <Shield className="w-2.5 md:w-3 h-2.5 md:h-3 text-primary" />
            <p className="text-[7px] md:text-[8px] font-black text-primary uppercase tracking-[0.2em] md:tracking-[0.3em]">Solo Mode Active</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center">
        <div className="max-w-xl w-full space-y-4 md:space-y-6">
          <div className="relative">
            <ControlHub 
              {...engine}
              {...session}
              role="local"
              onScanForDevices={openDeviceManager}
              shareAction={
                <Button 
                  onClick={startRemoteSession}
                  disabled={isInitializingSync}
                  variant="outline"
                  size="sm"
                  className="h-8 md:h-10 rounded-full border-primary/30 text-primary hover:bg-primary/10 font-black uppercase text-[8px] md:text-[10px] tracking-widest gap-2 px-6 bg-background/50 backdrop-blur-sm shadow-xl shadow-primary/5 active:scale-95 transition-all"
                >
                  {isInitializingSync ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                  <span>Start Remote Play</span>
                </Button>
              }
            />

            <AnimatePresence>
              {isInitializingSync && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[120] bg-background/90 backdrop-blur-3xl rounded-xl md:rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative"><Zap className="w-12 h-12 md:w-16 md:h-16 text-primary animate-pulse" /><Loader2 className="h-16 w-16 md:h-20 md:w-20 text-primary absolute -top-2 -left-2 animate-spin opacity-20" /></div>
                    <div className="space-y-1"><h4 className="font-black text-2xl md:text-3xl tracking-tighter text-white uppercase">Initializing</h4><p className="text-[9px] md:text-[10px] font-mono text-primary animate-pulse uppercase tracking-[0.3em]">Setting up private link...</p></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
