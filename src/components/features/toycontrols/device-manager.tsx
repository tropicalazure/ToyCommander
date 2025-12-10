"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Bluetooth, 
  Smartphone, 
  Plus, 
  Cpu, 
  Check, 
  Battery,
  BatteryMedium,
  BatteryFull,
  BatteryWarning,
  Square,
  Power,
  PowerOff
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  initToyClient, 
  getClient, 
  requestBatterySafe, 
  stopAllDevices,
  getActiveDeviceIndices,
  setActiveDevices,
  applyVibrationSafe
} from "@/lib/buttplug/toy-client";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";

interface DeviceState {
  index: number;
  name: string;
  battery: number | null;
}

export function DeviceManager() {
  const { toast } = useToast();
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  const [devices, setDevices] = useState<DeviceState[]>([]);
  const [armedIndices, setArmedIndices] = useState<number[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const isUpdatingRef = useRef(false);
  const devicesRef = useRef<DeviceState[]>([]);
  const seenDeviceIndicesRef = useRef<Set<number>>(new Set());

  const sidebarOffset = isMobile 
    ? "" 
    : state === "expanded" 
      ? "md:left-[calc(50%+8rem)]" 
      : "md:left-[calc(50%+1.5rem)]";

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-device-manager', handleOpen);
    return () => window.removeEventListener('open-device-manager', handleOpen);
  }, []);

  const syncArmedStatus = useCallback(() => {
    setArmedIndices(getActiveDeviceIndices());
  }, []);

  // Safety: Stop hardware on visibility change or unload
  useEffect(() => {
    const handleBeforeUnload = () => stopAllDevices();
    const handleVisibilityChange = () => {
      // Browsers often drop Bluetooth connections on hidden tabs anyway.
      // We explicitly stop to avoid "stuck" vibration states.
      if (document.visibilityState === 'hidden') {
        console.log("[DeviceManager] Page hidden, emergency stop triggered.");
        stopAllDevices();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const updateList = useCallback(async () => {
    const client = getClient();
    if (!client || !client.connected || isUpdatingRef.current) {
      if (!client?.connected && devicesRef.current.length > 0) {
        setDevices([]);
        seenDeviceIndicesRef.current.clear();
      }
      return;
    }

    isUpdatingRef.current = true;
    try {
      const currentLibIndices = getActiveDeviceIndices();
      let needsUpdate = false;
      const nextArmedIndices = [...currentLibIndices];

      client.devices.forEach((d: any) => {
        if (!seenDeviceIndicesRef.current.has(d.index)) {
          seenDeviceIndicesRef.current.add(d.index);
          if (!nextArmedIndices.includes(d.index)) {
            nextArmedIndices.push(d.index);
            needsUpdate = true;
          }
        }
      });

      if (needsUpdate) {
        setActiveDevices(nextArmedIndices);
        setArmedIndices(nextArmedIndices);
      }

      const currentSnapshots: DeviceState[] = client.devices.map((d: any) => ({
        index: d.index,
        name: d.name,
        battery: devicesRef.current.find(p => p.index === d.index)?.battery || null
      }));

      setDevices(currentSnapshots);
      syncArmedStatus();

      if (isOpen) {
        for (const d of client.devices) {
          const val = await requestBatterySafe(d);
          if (val !== null) {
            const percent = Math.round(val * 100);
            setDevices(prev => prev.map(dev => 
              dev.index === d.index ? { ...dev, battery: percent } : dev
            ));
          }
          await new Promise(r => setTimeout(r, 150));
        }
      }
    } finally {
      isUpdatingRef.current = false;
    }
  }, [syncArmedStatus, isOpen]);

  const onDeviceAdded = useCallback((device: any) => {
    updateList();
    setIsConnecting(false);
    toast({
      title: "Toy Connected!",
      description: `${device.name} is ready and ARMED.`,
    });
    const client = getClient();
    if (client) client.stopScanning().catch(() => {});
  }, [toast, updateList]);

  const attachListeners = useCallback((client: any) => {
    if (client) {
      client.removeAllListeners("deviceadded");
      client.removeAllListeners("deviceremoved");
      client.on("deviceadded", onDeviceAdded);
      client.on("deviceremoved", () => updateList());
    }
  }, [onDeviceAdded, updateList]);

  useEffect(() => {
    const interval = setInterval(updateList, 3000); 
    updateList();
    return () => clearInterval(interval);
  }, [updateList]);

  useEffect(() => {
    const checkClient = setInterval(() => {
      const client = getClient();
      if (client) {
        attachListeners(client);
        clearInterval(checkClient);
      }
    }, 1000);
    return () => checkClient && clearInterval(checkClient);
  }, [attachListeners]);

  const toggleSearch = async () => {
    const client = await initToyClient();
    attachListeners(client);

    if (isConnecting) {
      await client.stopScanning();
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    try {
      await client.startScanning();
    } catch (err: any) {
      setIsConnecting(false);
    }
  };

  const toggleArmDevice = (index: number) => {
    const currentArmed = getActiveDeviceIndices();
    const newArmed = currentArmed.includes(index) 
      ? currentArmed.filter(i => i !== index) 
      : [...currentArmed, index];
    
    setActiveDevices(newArmed);
    setArmedIndices(newArmed);
    window.dispatchEvent(new CustomEvent('sync-toy-vibration'));

    if (!isUpdatingRef.current) {
      const lastValue = parseFloat(sessionStorage.getItem('lastVibrationValue') || '0');
      if (lastValue > 0) applyVibrationSafe(lastValue);
    }
  };

  const getBatteryIcon = (level: number | null) => {
    if (level === null) return <BatteryWarning className="w-4 h-4 text-muted-foreground opacity-30" />;
    if (level > 80) return <BatteryFull className="w-4 h-4 text-green-500" />;
    if (level > 40) return <BatteryMedium className="w-4 h-4 text-yellow-500" />;
    return <Battery className="w-4 h-4 text-destructive animate-pulse" />;
  };

  if (pathname?.includes('/remote')) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button className={cn(
            "w-16 h-16 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center border-2 bg-background/80 backdrop-blur-xl group",
            devices.length > 0 ? "text-primary border-primary/40" : "text-muted-foreground border-primary/20"
          )}>
            <div className="relative">
              <Bluetooth className={cn("w-7 h-7", isConnecting && "animate-pulse")} />
              {devices.length > 0 && (
                <Badge className="absolute -top-4 -right-4 h-6 w-6 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[12px] font-black border-2 border-background rounded-full">
                  {devices.length}
                </Badge>
              )}
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className={cn("sm:max-w-md bg-card/95 backdrop-blur-xl border-primary/20 p-6 transition-all duration-300", sidebarOffset)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase font-black tracking-tighter text-2xl text-white">
              Device <span className="text-primary">Manager</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium text-xs">
              Toys arm automatically on first connect. Tap to toggle active status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {devices.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                {devices.map((device) => {
                  const isArmed = armedIndices.includes(device.index);
                  return (
                    <div 
                      key={device.index} 
                      onClick={() => toggleArmDevice(device.index)}
                      className={cn(
                        "flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]",
                        isArmed ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10 opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl border", isArmed ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-muted-foreground")}>
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white leading-none uppercase tracking-tight">{device.name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {getBatteryIcon(device.battery)}
                            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                              {device.battery !== null ? `${device.battery}%` : 'Syncing...'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className={cn("p-2 rounded-full", isArmed ? "text-primary" : "text-muted-foreground")}>
                        {isArmed ? <Power className="w-5 h-5 animate-pulse" /> : <PowerOff className="w-5 h-5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                <Smartphone className="w-10 h-10 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">No toys found</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 pt-2">
              <Button onClick={toggleSearch} className="w-full h-14 font-black uppercase tracking-widest text-sm rounded-xl magenta-glow">
                {isConnecting ? <><Square className="w-5 h-5 mr-3 fill-current" /> Stop Search</> : <><Plus className="w-5 h-5 mr-3" /> Add Device</>}
              </Button>
              {devices.length > 0 && (
                <Button onClick={() => setIsOpen(false)} variant="outline" className="w-full h-12 font-black uppercase tracking-widest text-xs border-primary/20 text-primary rounded-xl">
                  <Check className="w-4 h-4 mr-2" /> Done
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
