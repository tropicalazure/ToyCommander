
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
import { registry } from "@/lib/vibration-patterns";

export type SessionRole = 'local' | 'host' | 'remote';

type SessionSnapshot = {
  mode: string;
  patternType: string | null;
  speed: number;
  manualValue: number;
  savedAt?: number;
};

// How long with no RTDB update before the host runs the pattern locally
const DROPOUT_THRESHOLD_MS = 2500;

// ~30fps for the fallback loop timer — enough for smooth pattern playback
const FALLBACK_TICK_MS = 33;

export function useControlSession(role: SessionRole, sessionId?: string) {
  const [connected, setConnected] = useState(false);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [vibration, setVibration] = useState(0);
  const [pausedBy, setPausedBy] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [devices, setDevices] = useState<{ index: number; name: string; active: boolean }[]>([]);
  const [remoteUIState, setRemoteUIState] = useState<any>(null);
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const [isFallbackActive, setIsFallbackActive] = useState(false);

  const lastVibrationWriteRef = useRef(0);
  // Refs so callbacks always read the latest value without stale closures
  const pausedByRef = useRef<string | null>(null);
  const sessionStatusRef = useRef<string | null>(null);
  // Fallback loop state
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackActiveRef = useRef(false);
  // Keep-alive AudioContext that exempts the tab from background timer throttling
  const fallbackAudioCtxRef = useRef<AudioContext | null>(null);
  // Timestamp of last real-time RTDB vibration update received by the host
  const lastRtdbUpdateRef = useRef<number>(0);

  const setPausedBySync = useCallback((val: string | null) => {
    pausedByRef.current = val;
    setPausedBy(val);
  }, []);

  useEffect(() => { sessionStatusRef.current = sessionStatus; }, [sessionStatus]);

  // Aggressive sync when coming back to foreground
  const forceSyncFromRemote = useCallback(async () => {
    if (!sessionId || role !== 'host') return;
    if (pausedByRef.current) return;
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

  // --- Fallback loop (host-side) ---

  // Keep-alive AudioContext. Browsers throttle setTimeout to ~1000ms on hidden
  // tabs unless audio is processing; a running AudioContext at near-zero output
  // prevents that throttle so the fallback loop keeps firing at full rate.
  const startFallbackAudio = useCallback(() => {
    if (fallbackAudioCtxRef.current) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // 1 Hz at 0.00001 gain — subsonic frequency, inaudible at any volume
      osc.frequency.value = 1;
      gain.gain.value = 0.00001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      fallbackAudioCtxRef.current = ctx;
    } catch {}
  }, []);

  const stopFallbackAudio = useCallback(() => {
    if (!fallbackAudioCtxRef.current) return;
    try { fallbackAudioCtxRef.current.close(); } catch {}
    fallbackAudioCtxRef.current = null;
  }, []);

  const stopFallback = useCallback(() => {
    if (!fallbackActiveRef.current) return;
    fallbackActiveRef.current = false;
    setIsFallbackActive(false);
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    stopFallbackAudio();
    console.log('[Session] Fallback stopped');
  }, [stopFallbackAudio]);

  const startFallback = useCallback((snapshot: SessionSnapshot) => {
    if (fallbackActiveRef.current) return;

    // Manual mode: hold the last intensity (no loop needed)
    if (snapshot.mode === 'manual') {
      if (snapshot.manualValue < 0.05) return;
      fallbackActiveRef.current = true;
      setIsFallbackActive(true);
      console.log(`[Session] Fallback: holding manual at ${Math.round(snapshot.manualValue * 100)}%`);
      applyVibrationSafe(snapshot.manualValue);
      setVibration(snapshot.manualValue);
      return;
    }

    if (!snapshot.patternType) return;
    const processor = registry.get(snapshot.patternType);
    if (!processor) return;

    fallbackActiveRef.current = true;
    setIsFallbackActive(true);
    console.log(`[Session] Fallback: running '${snapshot.patternType}' locally`);

    // Drive the loop with setTimeout rather than requestAnimationFrame: desktop
    // browsers freeze/throttle RAF whenever the window is unfocused or the tab is
    // hidden, which latches the toy at its last value (constant vibration). A
    // self-scheduling setTimeout, paired with the keep-alive AudioContext below,
    // keeps firing at full rate even in an unfocused or hidden tab.
    startFallbackAudio();

    const startTime = performance.now();
    const loop = () => {
      if (!fallbackActiveRef.current) return;
      const elapsed = (performance.now() - startTime) / 1000;
      const val = processor({ elapsed, speed: snapshot.speed ?? 0.5 });
      if (val !== undefined) {
        applyVibrationSafe(val);
        setVibration(val);
      }
      fallbackTimerRef.current = setTimeout(loop, FALLBACK_TICK_MS);
    };
    fallbackTimerRef.current = setTimeout(loop, FALLBACK_TICK_MS);
  }, [startFallbackAudio]);

  // --- Snapshot write (called by the controller/remote side) ---

  const saveSnapshot = useCallback((state: Omit<SessionSnapshot, 'savedAt'>) => {
    if (!sessionId || role === 'host') return;
    set(ref(rtdb, `sessions/${sessionId}/snapshot`), {
      ...state,
      savedAt: Date.now(),
    }).catch(() => {});
  }, [sessionId, role]);

  // 1. Sync local devices with the UI (Host/Local only)
  const syncDevices = useCallback(() => {
    if (role === 'remote') return;
    if (sessionStatusRef.current === 'ended') return;

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
      // On disconnect: mark presence false so the partner's "partnerConnected"
      // goes false. Do NOT delete the entire session node — that would leave
      // the remote in a zombie state on a brief network flap with no overlay.
      onDisconnect(presenceRef).set(false);

      const unsubPartner = onValue(partnerRef, (snap) => setPartnerConnected(!!snap.val()));
      const unsubStatus = onValue(statusRef, (snap) => {
        sessionStatusRef.current = snap.val();
        setSessionStatus(snap.val());
      });
      const unsubPause = onValue(pauseRef, (snap) => setPausedBySync(snap.val()));
      const unsubUI = onValue(uiStateRef, (snap) => {
        const state = snap.val();
        setRemoteUIState(state);
        if (role === 'host' && state?.activeDeviceIndices) {
          setActiveDevices(state.activeDeviceIndices);
          syncDevices();
        }
      });

      const unsubDevices = onValue(devicesRef, (snap) => {
        if (role === 'remote') {
          setDevices(snap.val() || []);
        }
      });

      const unsubVibration = onValue(vibRef, (snap) => {
        const val = snap.val() || 0;
        // Track the last time we received a live update from the controller
        lastRtdbUpdateRef.current = Date.now();
        setVibration(val);
        if (role === 'host') {
          // Real-time update arrived — cancel fallback if it was running
          if (fallbackActiveRef.current) {
            stopFallback();
            console.log('[Session] Real-time resumed, exiting fallback');
          }
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
  }, [sessionId, role, setPausedBySync, stopFallback, syncDevices]);

  // 3. Host-side dropout detection: when real-time updates stop, run the
  //    last saved snapshot locally so the device keeps going.
  useEffect(() => {
    if (role !== 'host' || !sessionId) return;

    const check = setInterval(async () => {
      // Skip if already in fallback, or if we've never received a live update
      if (fallbackActiveRef.current) return;
      if (lastRtdbUpdateRef.current === 0) return;
      if (Date.now() - lastRtdbUpdateRef.current < DROPOUT_THRESHOLD_MS) return;

      try {
        const snap = await get(ref(rtdb, `sessions/${sessionId}/snapshot`));
        const snapshot = snap.val() as SessionSnapshot | null;
        if (snapshot) startFallback(snapshot);
      } catch (e) {
        console.warn('[Session] Snapshot read failed:', e);
      }
    }, 1000);

    return () => {
      clearInterval(check);
      stopFallback();
    };
  }, [role, sessionId, startFallback, stopFallback]);

  // 4. Actions
  // Uses refs so stale closures in RAF/audio loops always see the latest pause state.
  const updateVibration = useCallback((val: number) => {
    if (pausedByRef.current || sessionStatusRef.current === 'ended') return;

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
  }, [role, sessionId]);

  const updateUIState = useCallback((state: any) => {
    if (sessionId && sessionStatusRef.current !== 'ended') {
      set(ref(rtdb, `sessions/${sessionId}/uiState`), state);
    }
  }, [sessionId]);

  const togglePause = useCallback(() => {
    if (role === 'local') {
      if (!pausedByRef.current) {
        setPausedBySync('local');
        applyVibrationSafe(0);
      } else {
        setPausedBySync(null);
      }
      return;
    }
    if (!sessionId || sessionStatusRef.current === 'ended') return;
    const pauseRef = ref(rtdb, `sessions/${sessionId}/pausedBy`);
    const vibRef = ref(rtdb, `sessions/${sessionId}/vibration`);

    if (!pausedByRef.current) {
      set(pauseRef, role === 'host' ? 'host' : 'controller');
      set(vibRef, 0);
    } else if (pausedByRef.current === (role === 'host' ? 'host' : 'controller')) {
      set(pauseRef, null);
    }
  }, [sessionId, role, setPausedBySync]);

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
    if (!sessionId || role === 'remote') return;
    stopFallback();
    applyVibrationSafe(0);
    await set(ref(rtdb, `sessions/${sessionId}/status`), 'ended');
    setTimeout(() => remove(ref(rtdb, `sessions/${sessionId}`)), 1000);
  }, [sessionId, role, stopFallback]);

  return {
    connected,
    partnerConnected,
    vibration,
    pausedBy,
    sessionStatus,
    devices,
    remoteUIState,
    isBackgrounded,
    isFallbackActive,
    updateVibration,
    updateUIState,
    saveSnapshot,
    togglePause,
    toggleDevice,
    endSession
  };
}
