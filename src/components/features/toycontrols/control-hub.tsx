
"use client";

import { useState, useEffect, useReducer, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Mic, 
  Sliders, 
  Zap, 
  Smartphone,
  SmartphoneNfc,
  Lock,
  Unlock,
  Power,
  Globe,
  Bluetooth,
  XCircle,
  AlertTriangle,
  Radio,
  Wifi,
  ShieldCheck,
  EyeOff,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  Battery,
  Play,
  Pause
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { SessionOverlays } from "./session-overlays";
import { useWakeLock } from "@/hooks/use-wake-lock";

// --- Audio bar multipliers — deterministic per-bar height scaling, no Math.random() ---
const AUDIO_BAR_MULTIPLIERS = [0.40, 0.70, 0.90, 0.60, 1.00, 0.80, 0.50, 0.90, 0.70, 0.45, 0.85, 0.60];

// --- Pattern Card Configs ---
const PATTERN_CONFIGS: Record<string, { accent: string; wave: string }> = {
  pulse:     {
    accent: '#c084fc',
    wave: 'M 0 14 C 6 3 12 3 16 14 C 20 25 26 25 32 14 C 38 3 44 3 48 14 C 52 25 58 25 64 14 C 70 3 76 3 80 14 C 84 25 90 25 96 14 L 100 13',
  },
  heartbeat: {
    accent: '#fb7185',
    wave: 'M 0 14 L 18 14 L 22 9 L 26 19 L 30 4 L 34 24 L 38 9 L 42 14 L 60 14 L 64 9 L 68 19 L 72 4 L 76 24 L 80 9 L 84 14 L 100 14',
  },
  waves:     {
    accent: '#22d3ee',
    wave: 'M 0 14 C 16 8 22 6 34 14 C 46 22 52 24 66 14 C 80 6 86 4 100 12',
  },
  erratic:   {
    accent: '#fb923c',
    wave: 'M 0 14 L 7 5 L 11 21 L 16 8 L 22 20 L 28 10 L 33 23 L 38 5 L 44 19 L 50 11 L 56 24 L 62 7 L 67 18 L 74 4 L 80 21 L 86 9 L 93 22 L 100 14',
  },
  surge:     {
    accent: '#60a5fa',
    wave: 'M 0 26 L 8 25 C 22 23 34 20 46 16 C 60 12 72 7 82 4 L 90 2 L 96 1 L 100 1',
  },
  fireworks: {
    accent: '#fbbf24',
    wave: 'M 0 14 L 6 14 L 8 8 L 11 20 L 14 5 L 17 23 L 20 10 L 23 14 L 34 14 L 36 8 L 39 20 L 42 5 L 45 23 L 48 10 L 51 14 L 63 14 L 65 8 L 68 20 L 71 5 L 74 23 L 77 10 L 80 14 L 90 14 L 93 8 L 96 20 L 100 14',
  },
  breath: {
    accent: '#86efac',
    wave: 'M 0 27 L 16 27 C 24 27 32 2 44 2 L 56 2 C 68 2 76 27 84 27 L 100 27',
  },
  flutter: {
    accent: '#f472b6',
    wave: 'M 0 14 C 2 9 4 19 6 14 C 8 9 10 19 12 14 C 14 9 16 19 18 14 C 20 9 22 19 24 14 C 26 9 28 19 30 14 C 32 9 34 19 36 14 C 38 9 40 19 42 14 C 44 9 46 19 48 14 C 50 9 52 19 54 14 C 56 9 58 19 60 14 C 62 9 64 19 66 14 C 68 9 70 19 72 14 C 74 9 76 19 78 14 C 80 9 82 19 84 14 C 86 9 88 19 90 14 C 92 9 94 19 96 14 L 100 14',
  },
  avalanche: {
    accent: '#94a3b8',
    wave: 'M 0 26 C 20 25 40 22 60 16 C 74 11 82 6 88 3 L 90 2 L 91 26 L 100 26',
  },
  morse: {
    accent: '#4ade80',
    wave: 'M 0 14 L 0 5 L 5 5 L 5 14 L 7 14 L 7 5 L 12 5 L 12 14 L 14 14 L 14 5 L 19 5 L 19 14 L 25 14 L 25 4 L 34 4 L 34 14 L 36 14 L 36 4 L 45 4 L 45 14 L 47 14 L 47 4 L 56 4 L 56 14 L 62 14 L 62 5 L 67 5 L 67 14 L 69 14 L 69 5 L 74 5 L 74 14 L 76 14 L 76 5 L 81 5 L 81 14 L 100 14',
  },
  engine: {
    accent: '#a78bfa',
    wave: 'M 0 4 L 9 4 L 9 22 L 18 22 L 18 4 L 27 4 L 27 22 L 36 22 L 36 4 L 45 4 L 45 22 L 54 22 L 54 4 L 63 4 L 63 22 L 72 22 L 72 4 L 81 4 L 81 22 L 90 22 L 90 4 L 100 4',
  },
  earthquake: {
    accent: '#d97706',
    wave: 'M 0 22 C 5 21 8 22 12 20 L 14 20 L 15 6 L 17 22 C 22 21 28 22 34 20 L 36 20 L 38 4 L 40 22 C 46 21 52 22 58 20 L 60 20 L 61 5 L 63 22 C 70 21 76 22 82 20 L 84 20 L 86 3 L 88 22 C 92 21 96 22 100 20',
  },
  ocean: {
    accent: '#818cf8',
    wave: 'M 0 14 C 10 24 20 26 34 14 C 46 3 56 2 68 14 C 80 26 90 26 100 14',
  },
  drip: {
    accent: '#38bdf8',
    wave: 'M 0 26 L 2 26 L 3 3 C 5 10 7 22 10 26 L 36 26 L 38 3 C 40 10 42 22 45 26 L 68 26 L 70 3 C 72 10 74 22 77 26 L 100 26',
  },
  climb: {
    accent: '#34d399',
    wave: 'M 0 25 L 12 25 L 12 21 L 24 21 L 24 17 L 36 17 L 36 13 L 48 13 L 48 9 L 60 9 L 60 5 L 72 5 L 72 3 L 84 3 L 86 27 L 100 27',
  },
  throb: {
    accent: '#f43f5e',
    wave: 'M 0 3 C 4 12 8 22 16 26 L 25 26 L 26 3 C 30 12 34 22 42 26 L 51 26 L 52 3 C 56 12 60 22 68 26 L 77 26 L 78 3 C 82 12 86 22 94 26 L 100 26',
  },
  ripple: {
    accent: '#2dd4bf',
    wave: 'M 0 14 C 6 7 12 21 18 14 C 22 9 26 19 30 14 C 38 5 46 23 54 14 C 60 9 66 19 72 14 C 80 4 88 24 96 14 L 100 14',
  },
};
const DEFAULT_PATTERN_CONFIG = { accent: '#a1a1aa', wave: 'M 0 14 C 25 8 75 20 100 14' };

// --- Types ---
interface ControlHubProps {
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
  connected?: boolean;
  partnerConnected?: boolean;
  devices?: { index: number; name: string; active: boolean; battery?: number }[];
  onToggleDevice?: (index: number) => void;
  shareAction?: React.ReactNode;
  sessionActions?: React.ReactNode;
  onUIChange?: (state: any) => void;
  remoteUIState?: any; 
  role: 'host' | 'remote' | 'local';
  stopAll?: () => void;
  availablePatterns?: string[];
  // Session & Overlay Logic
  pausedBy?: string | null;
  sessionStatus?: string | null;
  togglePause: () => void;
  endSession: () => void;
  onScanForDevices?: () => void;
}

// --- Physics Logic ---
interface Ripple { id: string; x: number; y: number; }
const rippleReducer = (state: Ripple[], action: any): Ripple[] => {
  switch (action.type) {
    case 'ADD': return [...state, action.payload].slice(-15);
    case 'REMOVE': return state.filter((r) => r.id !== action.payload);
    default: return state;
  }
};

export function ControlHub(props: ControlHubProps) {
  // --- State ---
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [localSubMode, setLocalSubMode] = useState<'slider' | 'touch'>('slider');
  const [localIntensity, setLocalIntensity] = useState(props.manualValue * 100);
  const [history, setHistory] = useState<number[]>(Array(60).fill(0));
  const [isInteracting, setIsInteracting] = useState(false);
  const [isMomentary, setIsMomentary] = useState(true); 
  const [touchX, setTouchX] = useState(0.5);
  const [ripples, dispatchRipples] = useReducer(rippleReducer, []);
  const touchAreaRef = useRef<HTMLDivElement>(null);
  
  // Background reliability mode
  const { heartbeatActive, startHeartbeat, stopHeartbeat } = useWakeLock(true);

  // --- Derived State ---
  const isGhostMode = props.role === 'host' && props.partnerConnected;
  const activeMode = isGhostMode && props.remoteUIState?.mode ? props.remoteUIState.mode : props.mode;
  const hasDevices = props.devices && props.devices.length > 0;
  const subMode = (isGhostMode && props.remoteUIState?.subMode) ? props.remoteUIState.subMode : localSubMode;
  const displayIntensity = isGhostMode ? (props.remoteUIState?.manualValue || 0) * 100 : localIntensity;
  const displayTouchX = isGhostMode ? (props.remoteUIState?.touchX || 0.5) : touchX;
  const displayPattern = isGhostMode ? props.remoteUIState?.patternType : props.patternType;

  // --- Effects ---
  useEffect(() => {
    if (!isGhostMode) setLocalIntensity(props.manualValue * 100);
  }, [props.manualValue, isGhostMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHistory(prev => [...prev.slice(1), props.vibration]);
    }, 50);
    return () => clearInterval(interval);
  }, [props.vibration]);

  useEffect(() => {
    if (props.onUIChange && props.role !== 'host') {
      props.onUIChange({
        mode: props.mode,
        subMode: localSubMode,
        touchX: touchX,
        manualValue: props.manualValue,
        patternType: props.patternType
      });
    }
  }, [props.mode, localSubMode, touchX, props.manualValue, props.patternType, props.role, props.onUIChange]);

  // --- Handlers ---
  const handleStopAll = () => {
    if (props.stopAll) {
      props.stopAll();
    } else {
      props.setManualValue(0);
      props.setPattern(null);
      if (props.isAudioActive) props.toggleAudio();
    }
  };

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!touchAreaRef.current) return;
    const rect = touchAreaRef.current.getBoundingClientRect();
    let nX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let nY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setTouchX(nX);
    const intensity = 1 - nY;
    props.setManualValue(intensity);
    setLocalIntensity(intensity * 100);

    const id = crypto.randomUUID();
    dispatchRipples({ type: 'ADD', payload: { id, x: nX * 100, y: nY * 100 } });
    setTimeout(() => dispatchRipples({ type: 'REMOVE', payload: id }), 800);
  }, [props.setManualValue]);

  const onInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isInteracting) return;
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    updatePosition(clientX, clientY);
  }, [isInteracting, updatePosition]);

  const onInteractionEnd = useCallback(() => {
    setIsInteracting(false);
    if (isMomentary) {
      props.setManualValue(0);
      setLocalIntensity(0);
    }
  }, [props.setManualValue, isMomentary]);

  useEffect(() => {
    if (isInteracting) {
      window.addEventListener('mousemove', onInteractionMove);
      window.addEventListener('mouseup', onInteractionEnd);
      window.addEventListener('touchmove', onInteractionMove, { passive: false });
      window.addEventListener('touchend', onInteractionEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onInteractionMove);
      window.removeEventListener('mouseup', onInteractionEnd);
      window.removeEventListener('touchmove', onInteractionMove);
      window.removeEventListener('touchend', onInteractionEnd);
    };
  }, [isInteracting, onInteractionMove, onInteractionEnd]);

  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (props.disabled || isGhostMode) return;
    setIsInteracting(true);
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    updatePosition(clientX, clientY);
  };

  const getBatteryIcon = (level: number | undefined) => {
    if (level === undefined) return null;
    if (level > 80) return <BatteryFull className="w-3 h-3 text-emerald-500" />;
    if (level > 40) return <BatteryMedium className="w-3 h-3 text-yellow-500" />;
    if (level > 15) return <BatteryLow className="w-3 h-3 text-orange-500" />;
    return <Battery className="w-3 h-3 text-red-500 animate-pulse" />;
  };

  const isSessionActive = props.partnerConnected || props.role === 'remote';
  const isPaused = props.pausedBy !== null;

  return (
    <div className="w-full flex justify-center p-0 md:p-6 min-h-[calc(100dvh-1rem)] md:min-h-0">
      <div 
        className={cn(
          "bg-zinc-950 border relative flex flex-col transition-all duration-500 overflow-hidden",
          "w-full h-full md:h-auto md:max-w-4xl md:rounded-[2.5rem] md:shadow-2xl", 
          isSessionActive ? "border-primary shadow-[0_0_40px_rgba(var(--primary),0.2)]" : "border-white/10"
        )}
      >
        <AnimatePresence>
          {showEndConfirmation && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[110] bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl w-full max-w-xs text-center space-y-6">
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-white font-bold text-xl uppercase italic">End Session?</h3>
                <div className="flex flex-col gap-2">
                  <Button variant="destructive" onClick={() => { props.endSession(); setShowEndConfirmation(false); }}>Confirm</Button>
                  <Button variant="ghost" onClick={() => setShowEndConfirmation(false)}>Cancel</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSessionActive && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="bg-primary text-primary-foreground py-1.5 px-4 flex items-center justify-between z-20 overflow-hidden">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 animate-spin-slow" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{props.role === 'host' ? "Partner Joined" : "Remote Linked"}</span>
                </div>
                <div className="bg-white/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Live</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-zinc-900/80 backdrop-blur-md border-b border-white/5 px-6 py-3 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", props.connected ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{props.connected ? "System Online" : "System Offline"}</span>
              </div>
              <button 
                onClick={heartbeatActive ? stopHeartbeat : startHeartbeat}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all",
                  heartbeatActive ? "bg-primary/20 border-primary text-primary" : "bg-zinc-800 border-white/5 text-zinc-600 opacity-50"
                )}
              >
                <Wifi className={cn("w-2.5 h-2.5", heartbeatActive && "animate-pulse")} />
                <span className="text-[8px] font-black uppercase tracking-widest">{heartbeatActive ? "Reliability Mode" : "Standard Mode"}</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              {isSessionActive && (
                <button onClick={() => setShowEndConfirmation(true)} className="p-1.5 text-zinc-500 hover:text-white transition-colors"><XCircle className="w-4 h-4" /></button>
              )}
              {props.shareAction}
            </div>
        </div>

        <div className="bg-zinc-900/40 border-b border-white/5 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Connected Devices</span>
                <div className="flex gap-1">
                  {props.sessionActions}
                </div>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar min-h-[48px]">
              {props.devices && props.devices.length > 0 ? (
                props.devices.map((device) => (
                  <button key={device.index} onClick={() => props.onToggleDevice?.(device.index)} className={cn("flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl border transition-all active:scale-95 whitespace-nowrap min-w-[140px]", device.active ? "bg-zinc-800 border-primary/40" : "bg-zinc-900/50 border-white/5 opacity-40")}>
                      <Smartphone className="w-4 h-4" />
                      <div className="text-left flex flex-col">
                        <div className="text-[10px] font-bold uppercase tracking-wider leading-none">{device.name}</div>
                        {device.active && device.battery !== undefined && (
                          <div className="flex items-center gap-1 mt-1">
                            {getBatteryIcon(device.battery)}
                            <span className="text-[7px] font-black text-zinc-500">{device.battery}%</span>
                          </div>
                        )}
                      </div>
                  </button>
                ))
              ) : (
                <div className="flex items-center gap-2 opacity-20 px-2">
                  <SmartphoneNfc className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Awaiting Hardware</span>
                </div>
              )}
            </div>
        </div>

        <div className="relative h-12 bg-black border-b border-white/5 flex items-end px-4 gap-[1px]">
            {history.map((val, i) => (
              <div key={i} className="flex-1 bg-primary/40 rounded-t-[1px]" style={{ height: `${val * 100}%`, opacity: 0.2 + (val * 0.8) }} />
            ))}
            <div className="absolute top-2 left-4 text-[8px] font-black text-zinc-700 uppercase tracking-widest">Live Trace</div>
        </div>

        <div className="grid grid-cols-3 bg-zinc-900 border-b border-white/5">
            {[{ id: 'manual', icon: Sliders, label: 'Manual' }, { id: 'patterns', icon: Zap, label: 'Patterns' }, { id: 'audio', icon: Mic, label: 'Audio' }].map((m) => (
              <button key={m.id} onClick={() => props.setMode(m.id)} disabled={!!props.disabled} className={cn("flex flex-col items-center justify-center gap-1.5 py-4 transition-all relative group", activeMode === m.id ? "text-primary bg-zinc-800/50" : "text-zinc-600 hover:text-white hover:bg-zinc-800", props.disabled && "opacity-40")}>
                <m.icon className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-widest">{m.label}</span>
                {activeMode === m.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            ))}
        </div>

        <div className="flex-1 bg-zinc-950 p-6 md:p-8 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            {activeMode === 'manual' && (
              <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col gap-6">
                <div className="flex justify-between items-center bg-zinc-900/50 p-1 rounded-xl border border-white/5 shrink-0">
                    <button onClick={() => setLocalSubMode('slider')} className={cn("flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", subMode === 'slider' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-600")}>Slider</button>
                    <button onClick={() => setLocalSubMode('touch')} className={cn("flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", subMode === 'touch' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-600")}>Pad</button>
                </div>
                
                <div className="flex-1 relative min-h-0">
                  {subMode === 'slider' ? (
                    <div className="h-full flex flex-col justify-center gap-12 px-8">
                        <div className="text-center"><span className="text-8xl font-black text-white tabular-nums">{Math.round(displayIntensity)}</span><span className="text-3xl font-black text-primary ml-1">%</span></div>
                        <Slider value={[displayIntensity]} max={100} disabled={isGhostMode || !!props.disabled} onValueChange={(v) => { setLocalIntensity(v[0]); props.setManualValue(v[0]/100); }} />
                    </div>
                  ) : (
                    <div ref={touchAreaRef} onMouseDown={handleInteractionStart} onTouchStart={handleInteractionStart} className="relative h-full w-full bg-black border-2 border-white/5 rounded-3xl overflow-hidden cursor-crosshair touch-none group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
                        <AnimatePresence>
                          {ripples.map((r) => <motion.div key={r.id} initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 3, opacity: 0 }} className="absolute w-12 h-12 rounded-full border border-primary pointer-events-none" style={{ left: `${r.x}%`, top: `${r.y}%`, transform: 'translate(-50%, -50%)' }} />)}
                        </AnimatePresence>
                        <motion.div animate={{ left: `${displayTouchX * 100}%`, top: `${(1 - displayIntensity/100) * 100}%` }} className="absolute w-12 h-12 -ml-6 -mt-6 bg-primary/20 border-2 border-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)] flex items-center justify-center pointer-events-none">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        </motion.div>
                        {!isInteracting && displayIntensity === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Touch to Engage</span>
                          </div>
                        )}
                    </div>
                  )}
                </div>

                <button onClick={() => setIsMomentary(!isMomentary)} className={cn("w-full py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all shrink-0", !isMomentary ? "bg-red-500/10 border-red-500 text-red-500" : "bg-zinc-900 border-white/5 text-zinc-500")}>
                  {isMomentary ? <Unlock className="w-3.5 h-3.5 inline mr-2" /> : <Lock className="w-3.5 h-3.5 inline mr-2" />}
                  {isMomentary ? "Momentary Mode" : "Hold Active"}
                </button>
              </motion.div>
            )}

            {activeMode === 'patterns' && (
              <motion.div key="patterns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap justify-center gap-3 overflow-y-auto no-scrollbar content-start">
                {props.availablePatterns?.map(pat => {
                  const cfg = PATTERN_CONFIGS[pat] ?? DEFAULT_PATTERN_CONFIG;
                  const isActive = displayPattern === pat;
                  return (
                    <button
                      key={pat}
                      onClick={() => !(isGhostMode || props.disabled) && props.setPattern(pat)}
                      disabled={isGhostMode || !!props.disabled}
                      className="w-[calc(50%-6px)] md:w-[calc(25%-9px)] h-36 rounded-2xl border transition-all duration-300 active:scale-95 overflow-hidden flex flex-col px-4 pt-4 pb-3 bg-zinc-900 hover:bg-zinc-800/80 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={isActive ? {
                        borderColor: cfg.accent,
                        background: `radial-gradient(ellipse at 50% -20%, ${cfg.accent}22 0%, transparent 70%), #111113`,
                        boxShadow: `0 0 28px ${cfg.accent}28, inset 0 1px 0 ${cfg.accent}30`,
                      } : { borderColor: 'transparent' }}
                    >
                      <div className="flex-1 flex items-center">
                        <svg viewBox="0 0 100 28" fill="none" className="w-full" preserveAspectRatio="none">
                          {isActive && (
                            <path d={cfg.wave} stroke={cfg.accent} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={0.18} />
                          )}
                          <path
                            d={cfg.wave}
                            stroke={isActive ? cfg.accent : '#52525b'}
                            strokeWidth={isActive ? 2 : 1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <span
                        className="text-[9px] font-black uppercase tracking-[0.18em] mt-2 text-center w-full"
                        style={{ color: isActive ? cfg.accent : '#71717a' }}
                      >
                        {pat}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}

            {activeMode === 'audio' && (
              <div className="h-full flex flex-col items-center justify-center gap-12 py-8">
                <div className="relative w-48 h-48 md:w-64 md:h-64">
                  <motion.div 
                    animate={{ 
                      scale: 1 + (props.audioLevel * 0.4),
                      opacity: 0.1 + (props.audioLevel * 0.5)
                    }} 
                    className="absolute inset-0 bg-primary rounded-full blur-3xl" 
                  />
                  <div className="relative h-full w-full rounded-full border-4 border-white/10 bg-black flex items-center justify-center overflow-hidden">
                    <div className="flex items-end gap-[3px] h-20">
                      {AUDIO_BAR_MULTIPLIERS.map((multiplier, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: props.isAudioActive ? `${Math.max(10, multiplier * props.audioLevel * 100)}%` : '4px'
                          }}
                          className="w-1.5 bg-primary rounded-full opacity-60"
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <Mic className={cn("w-20 h-20", props.isAudioActive ? "text-primary" : "text-zinc-500")} />
                    </div>
                  </div>
                </div>
                <div className="w-full max-w-sm space-y-4">
                  <Button onClick={props.toggleAudio} className="w-full h-16 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20 text-xs">
                    {props.isAudioActive ? "Deactivate Pulse" : "Activate Pulse"}
                  </Button>
                  <p className="text-[9px] font-black text-center text-zinc-600 uppercase tracking-widest">
                    Real-time Frequency Analysis Active
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-zinc-900/40 border-t border-white/5 shrink-0 space-y-4">
          <Button 
            variant="ghost" 
            onClick={props.togglePause} 
            className="w-full h-16 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 font-black uppercase tracking-widest italic gap-3 group transition-all"
          >
            {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
            {isPaused ? "Resume Session" : (props.role === 'local' ? "Pause System" : "Pause Session")}
          </Button>

          <div className="flex items-center justify-center gap-6 opacity-20 group hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-primary" />
              <span className="text-[7px] font-black uppercase tracking-widest text-zinc-400">Keep App Active</span>
            </div>
            <div className="flex items-center gap-2">
              <EyeOff className="w-3 h-3 text-primary" />
              <span className="text-[7px] font-black uppercase tracking-widest text-zinc-400">Private Link Encrypted</span>
            </div>
          </div>
        </div>

        <SessionOverlays 
          pausedBy={props.pausedBy || null}
          sessionStatus={props.sessionStatus || null}
          role={props.role}
          hasDevices={hasDevices}
          onTogglePause={props.togglePause}
          onScan={props.onScanForDevices}
        />
      </div>
    </div>
  );
}
