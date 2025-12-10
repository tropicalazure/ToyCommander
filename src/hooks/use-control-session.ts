
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, onDisconnect, remove, get } from "firebase/database";
import { 
  getClient, 
  applyVibrationSafe, 
  isClientReady, 
  stopAllDevices, 
  setActiveDevices, 
  getActiveDeviceIndices 
} from "@/lib/buttplug/toy-client";

/**
 * Primary hook to manage session transport and hardware application.
 */

export type SessionRole = 'local' | 'host' | 'remote';

export function useControlSession(role: SessionRole, sessionId?: string) {
  const [connected, setConnected] = useState(false);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [vibration, setVibration] = useState(0);
  const [pausedBy, setPausedBy] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [devices, setDevices] = useState<{ index: number; name: string; active: boolean }[]>([]);
  const [remoteUIState, setRemoteUIState] = useState<any>(null);
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  
  const lastVibrationWriteRef = useRef(0);
  const lastVibrationAppliedRef = useRef(0);

  // Aggressive sync when coming back to foreground
  const forceSyncFromRemote = useCallback(async () => {
    if (!sessionId || role !== 'host') return;
    try {
      const snap = await get(ref(rtdb, `sessions/${sessionId}/vibration`));
      const val = snap.val() || 0;
      setVibration(val);
      applyVibrationSafe(val);
    } catch (e) {
      console.warn("[Session] Foreground re-sync failed", e);
    }
  }, [sessionId, role]);

  useEffect(() => {
    const handleVisibility = () => {
      const backgrounded = document.visibilityState === 'hidden';
      setIsBackgrounded(backgrounded);
      if (!backgrounded) {
        console.log("[Session] Foreground detected, forcing hardware sync...");
        forceSyncFromRemote();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [forceSyncFromRemote]);

  // 1. Sync local devices with the UI (Host/Local only)
  const syncDevices = useCallback(() => {
    if (role === 'remote') return; 

    if (isClientReady()) {
      const client = getClient();
      const activeIndices = getActiveDeviceIndices();
      const deviceList = client.devices.map((d: any) => ({
        index: d.index,
        name: d.name,
        active: activeIndices.includes(d.index)
      }));
      setDevices(deviceList);
      if (sessionId && role === 'host') {
        set(ref(rtdb, `sessions/${sessionId}/devices`), deviceList);
      }
    } else {
      setDevices([]);
    }
  }, [sessionId, role]);

  useEffect(() => {
    syncDevices();
    const interval = setInterval(syncDevices, 2000);
    return () => clearInterval(interval);
  }, [syncDevices]);

  // 2. Firebase Connectivity & Presence
  useEffect(() => {
    const connectedRef = ref(rtdb, ".info/connected");
    const unsubConnection = onValue(connectedRef, (snap) => {
      setConnected(snap.val() === true);
    });

    if (sessionId) {
      const sessionPath = `sessions/${sessionId}`;
      
      const presenceKey = role === 'host' ? 'hostActive' : 'controllerActive';
      const partnerKey = role === 'host' ? 'controllerActive' : 'hostActive';
      
      const presenceRef = ref(rtdb, `${sessionPath}/${presenceKey}`);
      const partnerRef = ref(rtdb, `${sessionPath}/${partnerKey}`);
      const statusRef = ref(rtdb, `${sessionPath}/status`);
      const pauseRef = ref(rtdb, `${sessionPath}/pausedBy`);
      const vibRef = ref(rtdb, `${sessionPath}/vibration`);
      const uiStateRef = ref(rtdb, `${sessionPath}/uiState`);
      const devicesRef = ref(rtdb, `${sessionPath}/devices`);

      set(presenceRef, true);
      onDisconnect(presenceRef).remove();
      if (role === 'host') {
        onDisconnect(ref(rtdb, sessionPath)).remove();
      }

      const unsubPartner = onValue(partnerRef, (snap) => setPartnerConnected(!!snap.val()));
      const unsubStatus = onValue(statusRef, (snap) => setSessionStatus(snap.val()));
      const unsubPause = onValue(pauseRef, (snap) => setPausedBy(snap.val()));
      const unsubUI = onValue(uiStateRef, (snap) => {
        const state = snap.val();
        setRemoteUIState(state);
        if (role === 'host' && state?.activeDeviceIndices) {
          setActiveDevices(state.activeDeviceIndices);
        }
      });

      const unsubDevices = onValue(devicesRef, (snap) => {
        if (role === 'remote') {
          setDevices(snap.val() || []);
        }
      });

      const unsubVibration = onValue(vibRef, (snap) => {
        const val = snap.val() || 0;
        setVibration(val);
        // Only host applies vibration to hardware
        if (role === 'host') {
          // If we are backgrounded, the OS might block this, but we try anyway.
          // The silent audio heartbeat trick in useWakeLock increases survival chances.
          applyVibrationSafe(val);
        }
      });

      return () => {
        unsubConnection();
        unsubPartner();
        unsubStatus();
        unsubPause();
        unsubUI();
        unsubVibration();
        unsubDevices();
        set(presenceRef, false);
      };
    }

    return () => unsubConnection();
  }, [sessionId, role]);

  // 3. Actions
  const updateVibration = useCallback((val: number) => {
    if (pausedBy || sessionStatus === 'ended') return;

    if (role === 'local') {
      applyVibrationSafe(val);
      setVibration(val);
    } else if (sessionId) {
      const now = Date.now();
      if (now - lastVibrationWriteRef.current > 80 || val === 0) {
        set(ref(rtdb, `sessions/${sessionId}/vibration`), val);
        lastVibrationWriteRef.current = now;
      }
    }
  }, [role, sessionId, pausedBy, sessionStatus]);

  const updateUIState = useCallback((state: any) => {
    if (sessionId && sessionStatus !== 'ended') {
      set(ref(rtdb, `sessions/${sessionId}/uiState`), state);
    }
  }, [sessionId, sessionStatus]);

  const togglePause = useCallback(() => {
    if (!sessionId || sessionStatus === 'ended') return;
    const pauseRef = ref(rtdb, `sessions/${sessionId}/pausedBy`);
    const vibRef = ref(rtdb, `sessions/${sessionId}/vibration`);
    
    if (!pausedBy) {
      set(pauseRef, role === 'host' ? 'host' : 'controller');
      set(vibRef, 0);
    } else if (pausedBy === (role === 'host' ? 'host' : 'controller')) {
      set(pauseRef, null);
    }
  }, [sessionId, role, pausedBy, sessionStatus]);

  const toggleDevice = useCallback((index: number) => {
    if (role === 'remote') return; 
    
    setDevices(prev => {
      const newDevices = prev.map(d => d.index === index ? { ...d, active: !d.active } : d);
      const activeIndices = newDevices.filter(d => d.active).map(d => d.index);
      setActiveDevices(activeIndices);
      
      if (sessionId && role === 'host') {
        set(ref(rtdb, `sessions/${sessionId}/devices`), newDevices);
      }
      return newDevices;
    });
  }, [sessionId, role]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    await set(ref(rtdb, `sessions/${sessionId}/status`), 'ended');
    setTimeout(() => remove(ref(rtdb, `sessions/${sessionId}`)), 1000);
  }, [sessionId]);

  return {
    connected,
    partnerConnected,
    vibration,
    pausedBy,
    sessionStatus,
    devices,
    remoteUIState,
    isBackgrounded,
    updateVibration,
    updateUIState,
    togglePause,
    toggleDevice,
    endSession
  };
}
