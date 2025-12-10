
"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6 relative overflow-hidden">
      <div className="max-w-xl w-full text-center relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full flex flex-col items-center"
        >
          {/* Logo Section - Large and Magenta */}
          <div className="flex justify-center mb-1">
            <Logo className="w-32 h-32 md:w-56 md:h-56 drop-shadow-[0_0_30px_rgba(var(--primary),0.3)]" />
          </div>
          
          {/* Brand Identity Section - Tight spacing as requested */}
          <div className="space-y-4 mb-8">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white font-headline uppercase leading-none">
              TOY<span className="text-primary">COMMANDER</span>
            </h1>
            <p className="text-muted-foreground text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] opacity-50">
              Private play from anywhere
            </p>
          </div>
        </motion.div>

        {/* Action Section - Magenta button with white text */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-full flex justify-center"
        >
          <Button 
            asChild
            className="w-full max-w-[340px] h-16 md:h-20 bg-primary hover:bg-primary/90 text-white font-black text-xl md:text-2xl rounded-2xl transition-all active:scale-95 uppercase tracking-tight group shadow-[0_20px_50px_rgba(var(--primary),0.2)]"
          >
            <Link href="/toycontrols/local" className="flex items-center justify-center gap-2">
              Get Started
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Subtle decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />
    </div>
  );
}
