
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bluetooth } from "lucide-react";

/**
 * @fileOverview Overlay for when no hardware is connected.
 * Provides a clear call to action to pair devices.
 */

interface NoDevicesOverlayProps {
  onScan: () => void;
}

export function NoDevicesOverlay({ onScan }: NoDevicesOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      onClick={onScan}
      className="absolute inset-0 z-40 bg-zinc-950/60 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 space-y-10 cursor-pointer group"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors" />
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-primary/30 flex items-center justify-center bg-zinc-900/50 group-hover:scale-105 transition-transform duration-500">
          <Bluetooth className="w-10 h-10 md:w-14 md:h-14 text-primary animate-pulse" />
        </div>
      </div>

      <div className="space-y-3 max-w-[280px]">
        <h3 className="text-3xl md:text-5xl font-black tracking-tighter text-white uppercase leading-none">
          Pair <span className="text-primary">Devices</span>
        </h3>
        <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] leading-relaxed opacity-60">
          Connect your hardware via Bluetooth to get started.
        </p>
      </div>

      <div className="pt-4">
        <div className="px-6 py-2 border border-primary/20 rounded-full bg-primary/5 text-[10px] font-black text-primary uppercase tracking-widest group-hover:bg-primary group-hover:text-primary-foreground transition-all">
          Tap to Scan
        </div>
      </div>
    </motion.div>
  );
}
