
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Activity, Zap, Heart, Waves, Radio, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatternsModeProps {
  patternType: string | null;
  setPattern: (type: string | null) => void;
  disabled?: boolean;
}

export function PatternsMode({ patternType, setPattern, disabled }: PatternsModeProps) {
  const patterns = [
    { id: 'heartbeat', icon: Heart, label: 'Heart', anim: 'animate-pulse' },
    { id: 'waves', icon: Waves, label: 'Waves', anim: 'animate-bounce' },
    { id: 'surge', icon: Radio, label: 'Surge', anim: 'animate-pulse' },
    { id: 'fireworks', icon: Sparkles, label: 'Fireworks', anim: 'animate-pulse' },
    { id: 'erratic', icon: Zap, label: 'Chaos', anim: 'animate-spin' },
    { id: 'pulse', icon: Activity, label: 'Pulse', anim: 'animate-spin' }
  ];

  return (
    <div className="flex-1 space-y-2 md:space-y-3 mt-0">
      <div className="grid grid-cols-2 gap-2">
        {patterns.map((pat) => (
          <Button key={pat.id} variant={patternType === pat.id ? 'default' : 'outline'} className="h-12 flex flex-col gap-1 rounded-xl border-border/40 p-1" onClick={() => patternType === pat.id ? setPattern(null) : setPattern(pat.id)} disabled={disabled}>
            <pat.icon className={cn("w-3.5 h-3.5", patternType === pat.id ? pat.anim : '')} />
            <span className="text-[7px] font-bold uppercase tracking-tighter">{pat.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
