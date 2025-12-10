
"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings2, 
  Activity, 
  Mic
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ManualMode } from "./manual-mode";
import { PatternsMode } from "./patterns-mode";
import { AudioMode } from "./audio-mode";

interface InteractionModesProps {
  mode: string;
  setMode: (mode: string) => void;
  manualValue: number;
  setManualValue: (val: number) => void;
  pulseSpeed: number;
  setPulseSpeed: (speed: number) => void;
  patternType: string | null;
  setPattern: (type: string | null) => void;
  isAudioActive: boolean;
  toggleAudio: () => void;
  audioLevel: number;
  vibration: number;
  disabled?: boolean;
  controlMode: 'slider' | 'touch';
  setControlMode: (m: 'slider' | 'touch') => void;
  isFloating: boolean;
  setIsFloating: (f: boolean) => void;
  touchX: number;
  ripples: { id: string; x: number; y: number }[];
  history: number[];
  touchAreaRef: React.RefObject<HTMLDivElement | null>;
  onInteractionStart: (e: React.MouseEvent | React.TouchEvent) => void;
}

export function InteractionModes({
  mode, setMode, manualValue, setManualValue, pulseSpeed, setPulseSpeed,
  patternType, setPattern, isAudioActive, toggleAudio, audioLevel, vibration,
  disabled, controlMode, setControlMode, isFloating, setIsFloating,
  touchX, ripples, history, touchAreaRef, onInteractionStart
}: InteractionModesProps) {
  return (
    <Tabs value={mode} onValueChange={setMode} className="w-full flex flex-col">
      <div className="px-3 md:px-4">
        <TabsList className="grid w-full grid-cols-3 bg-muted/20 h-10 md:h-11 p-0 rounded-xl overflow-hidden border border-border/10">
          <TabsTrigger 
            value="manual" 
            disabled={disabled} 
            className="h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[9px] font-black uppercase rounded-none transition-all gap-1.5 px-0"
          >
            <Settings2 className="w-3.5 h-3.5" /> Manual
          </TabsTrigger>
          <TabsTrigger 
            value="pattern" 
            disabled={disabled} 
            className="h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[9px] font-black uppercase rounded-none transition-all gap-1.5 px-0 border-x border-border/5"
          >
            <Activity className="w-3.5 h-3.5" /> Patterns
          </TabsTrigger>
          <TabsTrigger 
            value="audio" 
            disabled={disabled} 
            className="h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[9px] font-black uppercase rounded-none transition-all gap-1.5 px-0"
          >
            <Mic className="w-3.5 h-3.5" /> Audio
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="pt-3 md:pt-4 h-[380px] md:h-[480px] flex flex-col justify-start pb-2 relative px-3 md:px-4 overflow-hidden">
        <div className={cn("transition-all duration-500 flex-1 flex flex-col select-none", disabled && !vibration ? "opacity-40 grayscale-[0.5]" : "opacity-100")}>
          <TabsContent value="manual" className="flex-1 mt-0 flex flex-col data-[state=inactive]:hidden">
            <ManualMode 
              controlMode={controlMode}
              setControlMode={setControlMode}
              manualValue={manualValue}
              setManualValue={setManualValue}
              isFloating={isFloating}
              setIsFloating={setIsFloating}
              touchX={touchX}
              ripples={ripples}
              history={history}
              touchAreaRef={touchAreaRef}
              onInteractionStart={onInteractionStart}
              disabled={disabled}
            />
          </TabsContent>

          <TabsContent value="pattern" className="flex-1 mt-0 data-[state=inactive]:hidden">
            <PatternsMode 
              patternType={patternType}
              setPattern={setPattern}
              disabled={disabled}
            />
          </TabsContent>

          <TabsContent value="audio" className="flex-1 mt-0 data-[state=inactive]:hidden">
            <AudioMode 
              isAudioActive={isAudioActive}
              toggleAudio={toggleAudio}
              audioLevel={audioLevel}
              disabled={disabled}
            />
          </TabsContent>
        </div>
        
        <div className="mt-auto pt-2 border-t border-border/20 shrink-0">
          <div className="flex justify-center items-center gap-8 py-1">
            <div className="text-center">
              <div className={cn("text-3xl md:text-4xl font-black tabular-nums transition-colors font-headline", vibration > 0 ? 'text-primary' : 'text-muted-foreground/30')}>
                {Math.round(vibration * 100)}%
              </div>
              <div className="text-[7px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-0.5 opacity-50">Power</div>
            </div>
            <div className="w-px h-8 bg-border/20 shrink-0" />
            <div className="flex flex-col items-center gap-1">
               <div className={cn("w-2 h-2 rounded-full", disabled ? 'bg-destructive' : (vibration > 0 ? 'bg-primary animate-ping' : 'bg-muted'))} />
               <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                 {disabled ? 'Paused' : (vibration > 0 ? 'Active' : 'Standby')}
               </span>
            </div>
          </div>
        </div>
      </div>
    </Tabs>
  );
}
