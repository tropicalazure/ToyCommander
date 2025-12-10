
"use client";

import React from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Fingerprint, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ManualModeProps {
  controlMode: 'slider' | 'touch';
  setControlMode: (m: 'slider' | 'touch') => void;
  manualValue: number;
  setManualValue: (val: number) => void;
  isFloating: boolean;
  setIsFloating: (f: boolean) => void;
  touchX: number;
  ripples: { id: string; x: number; y: number }[];
  history: number[];
  touchAreaRef: React.RefObject<HTMLDivElement | null>;
  onInteractionStart: (e: React.MouseEvent | React.TouchEvent) => void;
  disabled?: boolean;
}

export function ManualMode({
  controlMode, setControlMode, manualValue, setManualValue,
  isFloating, setIsFloating, touchX, ripples, history,
  touchAreaRef, onInteractionStart, disabled
}: ManualModeProps) {
  return (
    <div className="flex-1 space-y-3 md:space-y-4 mt-0 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Button 
            variant={controlMode === 'slider' ? "default" : "outline"} 
            size="sm" 
            onClick={() => setControlMode('slider')} 
            className="h-7 gap-1 rounded-full text-[8px] uppercase font-black tracking-widest px-3" 
            disabled={disabled}
          >
            <SlidersHorizontal className="w-2.5 h-2.5" /> Slider
          </Button>
          <Button 
            variant={controlMode === 'touch' ? "default" : "outline"} 
            size="sm" 
            onClick={() => setControlMode('touch')} 
            className="h-7 gap-1 rounded-full text-[8px] uppercase font-black tracking-widest px-3" 
            disabled={disabled}
          >
            <Fingerprint className="w-2.5 h-2.5" /> Touch
          </Button>
        </div>
        {controlMode === 'touch' && (
          <div 
            className={cn(
              "flex items-center p-1 bg-black/20 border border-border/40 rounded-full w-28 relative h-7 cursor-pointer overflow-hidden select-none", 
              disabled && "opacity-50 pointer-events-none"
            )} 
            onClick={() => !disabled && setIsFloating(!isFloating)}
          >
            <motion.div 
              className="absolute h-5 w-[50px] bg-primary rounded-full z-0" 
              initial={false} 
              animate={{ x: isFloating ? 56 : 0 }} 
            />
            <div className={cn("flex-1 text-center text-[7px] font-black uppercase tracking-tighter z-10", !isFloating ? "text-black" : "text-muted-foreground")}>Moment</div>
            <div className={cn("flex-1 text-center text-[7px] font-black uppercase tracking-tighter z-10", isFloating ? "text-black" : "text-muted-foreground")}>Persist</div>
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {controlMode === 'slider' ? (
            <motion.div 
              key="slider" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="absolute inset-0 flex flex-col justify-center space-y-6"
            >
              <div className="space-y-3">
                <div className="flex justify-between text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>Intensity</span>
                  <span className="text-primary font-black">{Math.round(manualValue * 100)}%</span>
                </div>
                <Slider value={[manualValue]} max={1} step={0.01} onValueChange={(val) => setManualValue(val[0])} className="py-4" disabled={disabled} />
              </div>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                  <Button 
                    key={p} 
                    variant={manualValue === p ? "default" : "outline"} 
                    size="sm" 
                    className="text-[8px] font-black h-8 w-12 rounded-lg" 
                    onClick={() => setManualValue(p)} 
                    disabled={disabled}
                  >
                    {p * 100}%
                  </Button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="touch" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="absolute inset-0 flex flex-col gap-2"
            >
              <div className="h-10 md:h-12 w-full bg-black/40 border border-border/50 rounded-xl overflow-hidden flex items-end gap-0.5 px-2 py-1 shrink-0">
                {history.map((val, i) => <div key={i} className="flex-1 bg-primary rounded-t-sm" style={{ height: `${val * 100}%`, opacity: 0.2 + (val * 0.8) }} />)}
              </div>
              
              <div 
                ref={touchAreaRef} 
                className={cn(
                  "flex-1 w-full relative overflow-hidden bg-background/20 border-2 border-primary/30 rounded-2xl touch-none",
                  "bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.05)_1px,transparent_1px)] bg-[size:24px_24px]",
                  disabled ? "cursor-default" : "cursor-crosshair"
                )} 
                onMouseDown={onInteractionStart} 
                onTouchStart={onInteractionStart}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
                
                {/* Visual grid reference */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
                </div>

                {ripples.map((ripple) => (
                  <div 
                    key={ripple.id} 
                    className="ripple-element" 
                    style={{ left: `${ripple.x}%`, top: `${ripple.y}%`, width: '30px', height: '30px' }} 
                  />
                ))}

                <motion.div 
                  className="absolute w-10 h-10 rounded-full bg-primary/40 border-2 border-primary flex items-center justify-center pointer-events-none z-30" 
                  style={{ 
                    left: `${touchX * 100}%`, 
                    top: `${(1 - manualValue) * 100}%`, 
                    x: '-50%', 
                    y: '-50%', 
                    boxShadow: `0 0 20px hsla(300, 100%, 50%, 0.6)` 
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </motion.div>
                
                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                  <span className="text-[7px] font-black uppercase tracking-[0.4em] text-primary/30">Tactile Surface</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
