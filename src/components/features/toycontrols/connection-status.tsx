
"use client";

import { cn } from "@/lib/utils";
import { Globe, Users, Shield, Zap, Info } from "lucide-react";

interface ConnectionStatusProps {
  connected: boolean;
  type: 'system' | 'session';
  role?: 'local' | 'host' | 'remote';
  className?: string;
  partnerConnected?: boolean;
}

/**
 * Standardized status indicator for System (Connectivity) and Session (Mode) states.
 */
export function ConnectionStatus({ 
  connected, 
  type, 
  role = 'local', 
  className,
  partnerConnected = false
}: ConnectionStatusProps) {
  let label = '';
  let sublabel = '';
  let Icon = Info;
  let colorClass = "text-muted-foreground/30";

  if (type === 'system') {
    Icon = Globe;
    label = 'System';
    sublabel = connected ? 'Connected' : 'Offline';
    colorClass = connected ? "text-green-500/50" : "text-destructive animate-pulse";
  } else if (type === 'session') {
    Icon = role === 'local' ? Shield : Users;
    label = 'Session';
    
    if (role === 'local') {
      sublabel = 'Solo Play';
      colorClass = "text-primary";
    } else if (role === 'host') {
      sublabel = partnerConnected ? 'Partner Play' : 'Waiting...';
      colorClass = partnerConnected ? "text-primary" : "text-primary/60";
    } else {
      sublabel = partnerConnected ? 'Synced' : 'Linking...';
      colorClass = partnerConnected ? "text-primary" : "text-primary/60";
    }
  }

  return (
    <div className={cn(
      "flex items-center gap-4 px-6 py-4 whitespace-nowrap bg-white/5 rounded-2xl border border-white/5 transition-all min-w-[140px]",
      type === 'session' && "bg-white/10 border-white/10 shadow-lg shadow-black/20",
      className
    )}>
      <Icon className={cn("w-6 h-6 transition-colors", colorClass)} />
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">
          {label}
        </span>
        <span className={cn("text-[14px] font-black uppercase tracking-tight leading-none mt-1.5", colorClass)}>
          {sublabel}
        </span>
      </div>
    </div>
  );
}
