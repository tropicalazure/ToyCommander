"use client";

import React from "react";
import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PausedOverlayProps {
  pausedBy: string;
  role: 'host' | 'remote' | 'local';
  onTogglePause: () => void;
}

export function PausedOverlay({ pausedBy, role, onTogglePause }: PausedOverlayProps) {
  const isPausedByMe = pausedBy === (role === 'host' ? 'host' : role === 'remote' ? 'controller' : 'local');

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="absolute inset-0 z-40 bg-zinc-950/80 backdrop-blur-xl rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-6 border-2 border-destructive/50"
    >
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center border-2 border-destructive/20 mb-2">
        <Pause className="w-10 h-10 text-destructive animate-pulse" />
      </div>
      <div className="space-y-2">
        <h4 className="font-black text-3xl tracking-tighter text-white uppercase italic">Session Paused</h4>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {isPausedByMe 
            ? "You have paused the session." 
            : `Paused by ${pausedBy === 'host' ? 'Partner' : 'Controller'}.`}
        </p>
      </div>
      
      {isPausedByMe && (
        <Button 
          onClick={onTogglePause} 
          variant="destructive" 
          className="rounded-full px-12 h-14 font-black uppercase tracking-widest text-xs shadow-lg shadow-destructive/20 active:scale-95 transition-all"
        >
          <Play className="w-4 h-4 mr-2" /> Resume Session
        </Button>
      )}
    </motion.div>
  );
}
