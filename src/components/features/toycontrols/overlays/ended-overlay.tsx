
"use client";

import React from "react";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EndedOverlayProps {
  role: 'host' | 'remote' | 'local';
}

export function EndedOverlay({ role }: EndedOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.95 }} 
      className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-3xl rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-8"
    >
      <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center border-2 border-border/50">
        <XCircle className="w-12 h-12 text-muted-foreground opacity-30" />
      </div>
      <div className="space-y-2">
        <h4 className="font-black text-4xl tracking-tighter text-white uppercase italic">Session Ended</h4>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">The connection has been terminated.</p>
      </div>
      <Button asChild variant="outline" className="rounded-full px-12 h-14 border-primary/30 text-primary hover:bg-primary/10 font-black uppercase tracking-widest text-xs">
        <Link href={role === 'remote' ? "/" : "/toycontrols/local"}>Return Home</Link>
      </Button>
    </motion.div>
  );
}
