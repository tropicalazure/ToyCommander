"use client";

import React, { useEffect, useState } from "react";
import { LayoutDashboard, Gamepad2, Bluetooth } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { isClientReady, getClient } from "@/lib/buttplug/toy-client";

export function MobileTabBar() {
  const pathname = usePathname();
  const [deviceCount, setDeviceCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const ready = isClientReady();
      setIsConnected(!!ready);
      const client = getClient();
      setDeviceCount(client?.devices?.length || 0);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hide on landing page and remote play screens
  if (!pathname || pathname === "/" || pathname.includes("/toycontrols/remote")) {
    return null;
  }

  const isControlsActive = pathname.startsWith("/toycontrols/local") || pathname.startsWith("/toycontrols/host");
  const isGamesActive = pathname.startsWith("/games") || pathname.startsWith("/ds-mode");

  const triggerDeviceManager = () => {
    window.dispatchEvent(new CustomEvent("open-device-manager"));
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-border/30 bg-background/80 backdrop-blur-xl md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4px)" }}
    >
      <div className="grid grid-cols-3 h-16 w-full max-w-lg mx-auto">
        {/* Tab 1: Toy Control */}
        <Link 
          href="/toycontrols/local"
          className="flex flex-col items-center justify-center gap-1 text-muted-foreground relative h-full group"
        >
          <div className="relative flex items-center justify-center">
            <LayoutDashboard className={cn(
              "w-5 h-5 transition-all duration-300 group-active:scale-90",
              isControlsActive ? "text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "text-muted-foreground"
            )} />
            {isControlsActive && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute -inset-2 bg-primary/10 rounded-full -z-10 blur-sm"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </div>
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest transition-colors duration-300",
            isControlsActive ? "text-primary" : "text-muted-foreground"
          )}>
            Controls
          </span>
        </Link>

        {/* Tab 2: Experience Hub */}
        <Link 
          href="/games"
          className="flex flex-col items-center justify-center gap-1 text-muted-foreground relative h-full group"
        >
          <div className="relative flex items-center justify-center">
            <Gamepad2 className={cn(
              "w-5 h-5 transition-all duration-300 group-active:scale-90",
              isGamesActive ? "text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "text-muted-foreground"
            )} />
            {isGamesActive && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute -inset-2 bg-primary/10 rounded-full -z-10 blur-sm"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </div>
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest transition-colors duration-300",
            isGamesActive ? "text-primary" : "text-muted-foreground"
          )}>
            Interactive
          </span>
        </Link>

        {/* Tab 3: Bluetooth Connection */}
        <button 
          onClick={triggerDeviceManager}
          className="flex flex-col items-center justify-center gap-1 text-muted-foreground relative h-full group outline-none"
        >
          <div className="relative flex items-center justify-center">
            <Bluetooth className={cn(
              "w-5 h-5 transition-all duration-300 group-active:scale-90",
              isConnected && deviceCount > 0 
                ? "text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                : isConnected 
                  ? "text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                  : "text-muted-foreground"
            )} />
            {deviceCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-black text-white border-2 border-background animate-pulse">
                {deviceCount}
              </span>
            )}
          </div>
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest transition-colors duration-300",
            isConnected ? "text-blue-500" : "text-muted-foreground"
          )}>
            Devices
          </span>
        </button>
      </div>
    </div>
  );
}
