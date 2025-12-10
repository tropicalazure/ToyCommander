
"use client";

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook to request and maintain a Screen Wake Lock and a Silent Audio Heartbeat.
 * This "tricks" the mobile OS into keeping the JS execution thread alive even when backgrounded.
 */
export function useWakeLock(enabled: boolean = true) {
  const sentinelRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [heartbeatActive, setHeartbeatActive] = useState(false);

  const requestWakeLock = useCallback(async () => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;
    
    try {
      // @ts-ignore
      sentinelRef.current = await navigator.wakeLock.request('screen');
      console.log("[WakeLock] Screen lock acquired");
      
      sentinelRef.current.addEventListener('release', () => {
        console.log("[WakeLock] Screen lock released");
        sentinelRef.current = null;
      });
    } catch (err: any) {
      console.warn("[WakeLock] Failed to acquire lock:", err.message);
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Minimal silent 1-second mp3
    const silentMp3 = "data:audio/mpeg;base64,SUQzBAAAAAABAFRYWFhYAAAADAAAbWFqb3JfYnJhbmQAbXA0MgBUWFhYAAAACAAAbWlub3JfdmVyc2lvbgAwAFRYWFhYAAAAHAAAY29tcGF0aWJsZV9icmFuZHMAbXA0Mm1wNDFpc29tAFRFTkMAAAAKAAAAR2VuZXJhdGVkAFRTU0UAAAAPAAAAbGF2ZmxpYmU1OC42NC4xMDAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZzoAAAADAAAAAgAAAZAA//////////////////////////////////////////////////////////////////8AAABMYW1lMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
    
    if (!audioRef.current) {
      audioRef.current = new Audio(silentMp3);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.01; // Nearly silent but active
    }

    audioRef.current.play()
      .then(() => {
        setHeartbeatActive(true);
        console.log("[WakeLock] Audio Heartbeat active");
      })
      .catch((err) => {
        console.warn("[WakeLock] Audio Heartbeat blocked (requires interaction)", err);
      });
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setHeartbeatActive(false);
      console.log("[WakeLock] Audio Heartbeat stopped");
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (sentinelRef.current) {
        sentinelRef.current.release();
        sentinelRef.current = null;
      }
      stopHeartbeat();
      return;
    }

    requestWakeLock();
    // Heartbeat usually requires a user-initiated event, so we'll 
    // export it as a function that can be called on a button click.

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sentinelRef.current) {
        sentinelRef.current.release();
        sentinelRef.current = null;
      }
      stopHeartbeat();
    };
  }, [enabled, requestWakeLock, stopHeartbeat]);

  return { heartbeatActive, startHeartbeat, stopHeartbeat };
}
