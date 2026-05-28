
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Compass, AlertTriangle, Shield, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Hazard {
  x: number;
  y: number;
  dir: 'h' | 'v';
  step: number;
  waitCount: number;
}

interface ReactiveMazeProps {
  onVibrate: (power: number) => void;
  disabled?: boolean;
  onGameStateChange?: (state: any) => void;
  remotePlayerPos?: { x: number; y: number } | null;
  remoteHazards?: Hazard[] | null;
  isSpectator?: boolean;
  onMove?: () => void;
  onWin?: () => void;
  difficulty?: number; // 0-1, scales hazard speed
}

export function ReactiveMaze({
  onVibrate,
  disabled = false,
  onGameStateChange,
  remotePlayerPos,
  remoteHazards,
  isSpectator = false,
  onMove,
  onWin,
  difficulty = 0,
}: ReactiveMazeProps) {
  const [grid, setGrid] = useState<number[][]>([]);
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [goalPos, setGoalPos] = useState({ x: 1, y: 1 });
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [isWon, setIsWon] = useState(false);
  const [hasShield, setHasShield] = useState(true);
  const [mazeSize] = useState(13); 
  
  const vibrationTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const hazardsRef = useRef<Hazard[]>([]);
  const playerPosRef = useRef({ x: 1, y: 1 });
  const gridRef = useRef<number[][]>([]);
  const isWonRef = useRef(false);
  const hasShieldRef = useRef(true);

  useEffect(() => { hazardsRef.current = hazards; }, [hazards]);
  useEffect(() => { playerPosRef.current = playerPos; }, [playerPos]);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { isWonRef.current = isWon; }, [isWon]);
  useEffect(() => { hasShieldRef.current = hasShield; }, [hasShield]);

  const triggerVibration = useCallback((power: number, duration: number = 100) => {
    if (disabled || isSpectator) return;
    if (vibrationTimeout.current) clearTimeout(vibrationTimeout.current);
    onVibrate(power);
    vibrationTimeout.current = setTimeout(() => {
      onVibrate(0);
    }, duration);
  }, [disabled, isSpectator, onVibrate]);

  const generateMaze = useCallback(() => {
    const newGrid = Array(mazeSize).fill(0).map(() => Array(mazeSize).fill(1));
    const walk = (x: number, y: number) => {
      newGrid[y][x] = 0;
      const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]].sort(() => Math.random() - 0.5);
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx > 0 && nx < mazeSize - 1 && ny > 0 && ny < mazeSize - 1 && newGrid[ny][nx] === 1) {
          newGrid[y + dy / 2][x + dx / 2] = 0;
          walk(nx, ny);
        }
      }
    };
    walk(1, 1);

    for (let i = 0; i < 15; i++) {
      const rx = Math.floor(Math.random() * (mazeSize - 2)) + 1;
      const ry = Math.floor(Math.random() * (mazeSize - 2)) + 1;
      if (newGrid[ry][rx] === 1) {
        const neighbors = [[ry-1, rx], [ry+1, rx], [ry, rx-1], [ry, rx+1]].filter(([ny, nx]) => ny > 0 && ny < mazeSize - 1 && nx > 0 && nx < mazeSize - 1 && newGrid[ny][nx] === 0);
        if (neighbors.length >= 2) newGrid[ry][rx] = 0;
      }
    }

    const goalX = mazeSize - 2;
    const goalY = mazeSize - 2;
    newGrid[goalY][goalX] = 0;
    
    const newHazards: Hazard[] = [];
    const possibleHazards = [
      { x: 3, y: 1, dir: 'h' as const }, { x: 1, y: 5, dir: 'v' as const },
      { x: 7, y: 3, dir: 'h' as const }, { x: 5, y: 9, dir: 'v' as const },
      { x: 9, y: 7, dir: 'h' as const }, { x: 11, y: 3, dir: 'v' as const },
      { x: 5, y: 5, dir: 'h' as const }, { x: 8, y: 8, dir: 'v' as const },
    ];
    
    possibleHazards.forEach(h => {
      const distToStart = Math.abs(h.x - 1) + Math.abs(h.y - 1);
      const distToEnd = Math.abs(h.x - goalX) + Math.abs(h.y - goalY);
      if (Math.random() > 0.4 && distToStart > 3 && distToEnd > 3) newHazards.push({ ...h, step: 1, waitCount: 0 });
    });
    
    setGrid(newGrid);
    setPlayerPos({ x: 1, y: 1 });
    setGoalPos({ x: goalX, y: goalY });
    setHazards(newHazards);
    setIsWon(false);
    setHasShield(true);
  }, [mazeSize]);

  useEffect(() => { if (!isSpectator) generateMaze(); }, [generateMaze, isSpectator]);

  useEffect(() => {
    if (isSpectator) {
      if (remotePlayerPos) setPlayerPos(remotePlayerPos);
      if (remoteHazards) setHazards(remoteHazards);
    }
  }, [isSpectator, remotePlayerPos, remoteHazards]);

  useEffect(() => {
    if (isWon || disabled || isSpectator || grid.length === 0) return;
    const intervalMs = Math.max(280, 600 - difficulty * 320);
    const interval = setInterval(() => {
      const nextHazards = hazardsRef.current.map(h => {
        if (h.waitCount > 0) return { ...h, waitCount: h.waitCount - 1 };
        let nx = h.x, ny = h.y, nStep = h.step, nWait = 0;
        if (h.dir === 'h') {
          nx += nStep;
          if (nx <= 0 || nx >= mazeSize - 1 || gridRef.current[ny][nx] === 1) { nStep *= -1; nx = h.x + nStep; nWait = 1; }
        } else {
          ny += nStep;
          if (ny <= 0 || ny >= mazeSize - 1 || gridRef.current[ny][nx] === 1) { nStep *= -1; ny = h.y + nStep; nWait = 1; }
        }
        return { ...h, x: nx, y: ny, step: nStep, waitCount: nWait };
      });
      setHazards(nextHazards);
      const collision = nextHazards.some(h => h.x === playerPosRef.current.x && h.y === playerPosRef.current.y);
      if (collision) {
        if (hasShieldRef.current) { setHasShield(false); triggerVibration(1.0, 1000); }
        else { triggerVibration(1.0, 800); setPlayerPos({ x: 1, y: 1 }); }
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [grid, isWon, disabled, isSpectator, mazeSize, triggerVibration, difficulty]);

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (isWonRef.current || disabled || isSpectator) return;
    const newX = playerPosRef.current.x + dx, newY = playerPosRef.current.y + dy;
    if (newX >= 0 && newX < mazeSize && newY >= 0 && newY < mazeSize) {
      if (gridRef.current[newY][newX] === 0) {
        setPlayerPos({ x: newX, y: newY });
        const hitHazard = hazardsRef.current.some(h => h.x === newX && h.y === newY);
        if (hitHazard) {
          if (hasShieldRef.current) { setHasShield(false); triggerVibration(1.0, 1000); }
          else { triggerVibration(1.0, 800); setPlayerPos({ x: 1, y: 1 }); }
        } else {
          triggerVibration(0.15, 50);
          onMove?.();
        }
        if (newX === goalPos.x && newY === goalPos.y) { setIsWon(true); triggerVibration(1.0, 5000); onWin?.(); }
      } else triggerVibration(0.7, 150);
    }
  }, [disabled, isSpectator, mazeSize, goalPos, triggerVibration, onMove, onWin]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || isSpectator) return;
      switch (e.key) {
        case "ArrowUp": case "w": case "W": movePlayer(0, -1); break;
        case "ArrowDown": case "s": case "S": movePlayer(0, 1); break;
        case "ArrowLeft": case "a": case "A": movePlayer(-1, 0); break;
        case "ArrowRight": case "d": case "D": movePlayer(1, 0); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movePlayer, disabled, isSpectator]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <div className="flex items-center justify-between w-full px-4 py-2 bg-card/20 rounded-xl border border-border/50">
        <div className="flex items-center gap-2">
          {hasShield ? <Shield className="w-4 h-4 text-primary animate-pulse" /> : <ShieldAlert className="w-4 h-4 text-destructive" />}
          <span className={cn("text-[10px] font-black uppercase tracking-widest", hasShield ? "text-primary" : "text-destructive")}>
            {hasShield ? "Shield Active" : "Shield Depleted"}
          </span>
        </div>
      </div>

      <div className="relative p-2 bg-card/20 rounded-2xl border border-primary/20 backdrop-blur-md shadow-2xl">
        <div className="grid gap-px bg-primary/5" style={{ gridTemplateColumns: `repeat(${mazeSize}, 1fr)`, width: 'min(85vw, 320px)', height: 'min(85vw, 320px)' }}>
          {grid.map((row, y) => row.map((cell, x) => (
            <div key={`${x}-${y}`} className={cn("aspect-square rounded-sm transition-all duration-300", cell === 1 ? "bg-primary/10 border border-primary/5" : "bg-transparent", playerPos.x === x && playerPos.y === y && "bg-primary magenta-glow z-10 scale-110", goalPos.x === x && goalPos.y === y && "bg-accent/50 animate-pulse border-2 border-accent", hazards.some(h => h.x === x && h.y === y) && "bg-destructive animate-pulse magenta-glow z-10")}>
              {hazards.some(h => h.x === x && h.y === y) && <div className="w-full h-full flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-white opacity-60" /></div>}
            </div>
          )))}
        </div>
        <AnimatePresence>
          {isWon && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute inset-0 bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-6 rounded-2xl z-20 border-2 border-primary">
              <Trophy className="w-16 h-16 text-primary mb-4 animate-bounce" />
              <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter mb-2">Maze Cleared</h3>
              {!isSpectator && <Button onClick={generateMaze} className="rounded-full px-8 font-black uppercase tracking-widest bg-primary text-primary-foreground">Next Level</Button>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!isSpectator && !disabled && (
        <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
          <div />
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={() => movePlayer(0, -1)}><ChevronUp className="w-6 h-6" /></Button>
          <div />
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={() => movePlayer(-1, 0)}><ChevronLeft className="w-6 h-6" /></Button>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={generateMaze}><RefreshCw className="w-5 h-5 opacity-50" /></Button>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={() => movePlayer(1, 0)}><ChevronRight className="w-6 h-6" /></Button>
          <div />
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={() => movePlayer(0, 1)}><ChevronDown className="w-6 h-6" /></Button>
          <div />
        </div>
      )}
      {isSpectator && (
        <div className="flex items-center gap-3 px-6 py-2 bg-primary/10 border border-primary/20 rounded-full animate-pulse">
           <Compass className="w-4 h-4 text-primary" />
           <span className="text-[10px] font-black uppercase tracking-widest text-primary">Spectating Partner Play</span>
        </div>
      )}
    </div>
  );
}
