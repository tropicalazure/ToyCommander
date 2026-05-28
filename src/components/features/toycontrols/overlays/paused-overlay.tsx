"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PausedOverlayProps {
  pausedBy: string;
  role: 'host' | 'remote' | 'local';
  onTogglePause: () => void;
}

export function PausedOverlay({ pausedBy, role, onTogglePause }: PausedOverlayProps) {
  const isPausedByMe = pausedBy === (role === 'host' ? 'host' : role === 'remote' ? 'controller' : 'local');
  const pausedByLabel = pausedBy === 'host' ? 'Partner' : 'Controller';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-zinc-950/85 backdrop-blur-md rounded-[inherit] flex flex-col items-center justify-center text-center p-8 gap-8"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-20 h-20 rounded-full bg-primary/10"
          />
          <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            <div className="flex items-center gap-[5px]">
              <div className="w-[5px] h-5 rounded-full bg-primary" />
              <div className="w-[5px] h-5 rounded-full bg-primary" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="font-black text-2xl tracking-tighter text-white uppercase italic">
            {isPausedByMe ? "System Paused" : "Session Paused"}
          </h4>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {isPausedByMe
              ? "All output suspended"
              : `Paused by ${pausedByLabel}`}
          </p>
        </div>
      </div>

      {isPausedByMe && (
        <Button
          onClick={onTogglePause}
          className="rounded-full px-12 h-12 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 active:scale-95 transition-transform gap-2"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Resume
        </Button>
      )}
    </motion.div>
  );
}
