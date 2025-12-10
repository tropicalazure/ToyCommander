
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface AudioModeProps {
  isAudioActive: boolean;
  toggleAudio: () => void;
  audioLevel: number;
  disabled?: boolean;
}

export function AudioMode({ isAudioActive, toggleAudio, audioLevel, disabled }: AudioModeProps) {
  return (
    <div className="flex-1 space-y-3 md:space-y-4 mt-0">
      <div className="bg-background/40 border border-border/50 rounded-xl p-4 flex flex-col items-center gap-4">
         <div className="flex gap-1 items-end h-8 w-32 justify-center">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 bg-primary rounded-full transition-all duration-75" 
                style={{ 
                  height: isAudioActive ? `${(Math.random() * 0.5 + 0.5) * audioLevel * 100}%` : '4px', 
                  opacity: 0.2 + (i * 0.08) 
                }} 
              />
            ))}
         </div>
         <Button onClick={toggleAudio} variant={isAudioActive ? "destructive" : "default"} className="w-full h-11 font-black rounded-xl uppercase tracking-widest text-xs" disabled={disabled}>
           {isAudioActive ? "Stop" : "Listen"}
         </Button>
         <div className="w-full space-y-1">
           <div className="flex justify-between text-[7px] font-bold text-muted-foreground uppercase tracking-wider">
             <span>Input Level</span>
             <span className="text-primary font-black">{Math.round(audioLevel * 100)}%</span>
           </div>
           <Progress value={audioLevel * 100} className="h-1 rounded-full" />
         </div>
      </div>
    </div>
  );
}
