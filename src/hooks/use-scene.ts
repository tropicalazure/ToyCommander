
"use client";

import { useEffect, useState, useCallback } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, update, remove } from "firebase/database";

/**
 * The D/s "scene" layer that rides on top of an existing control session
 * (sessions/{id}/...). useControlSession owns the device transport — presence,
 * real-time vibration, pause/stop, dropout fallback. useScene adds the
 * power-exchange channels: commands, permission requests, and verdicts.
 *
 * Role mapping mirrors the control session:
 *   sub = host  (holds the device)
 *   dom = remote (holds the controls)
 */

export type SceneRole = "sub" | "dom";

export interface PermissionRequest { id: string; at: number; }
export interface Verdict { id: string; result: "granted" | "denied"; at: number; }

export type PerfTier = "tease" | "explicit" | "filthy";
export type PerfStatus = "idle" | "assigned" | "performed" | "scored";
export interface PerformanceState {
  status: PerfStatus;
  action: string | null;
  tier: PerfTier | null;
  score: number | null; // 0..4 grade index
  streak: number;
  at: number;
}

export function useScene(role: SceneRole, id?: string) {
  const [command, setCommand] = useState<string | null>(null);
  const [commandAt, setCommandAt] = useState<number | null>(null);
  const [request, setRequest] = useState<PermissionRequest | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [ackAt, setAckAt] = useState<number | null>(null);
  const [performance, setPerformance] = useState<PerformanceState | null>(null);

  useEffect(() => {
    if (!id) return;
    const base = `sessions/${id}/scene`;
    const unsubs = [
      onValue(ref(rtdb, `${base}/command`), (s) => {
        const v = s.val();
        setCommand(v?.text ?? null);
        setCommandAt(v?.at ?? null);
      }),
      onValue(ref(rtdb, `${base}/request`), (s) => setRequest(s.val() ?? null)),
      onValue(ref(rtdb, `${base}/verdict`), (s) => setVerdict(s.val() ?? null)),
      onValue(ref(rtdb, `${base}/ack`), (s) => setAckAt(s.val()?.at ?? null)),
      onValue(ref(rtdb, `${base}/performance`), (s) => setPerformance(s.val() ?? null)),
    ];
    return () => unsubs.forEach((u) => u());
  }, [id]);

  // --- Dom actions ---------------------------------------------------------

  const sendCommand = useCallback((text: string) => {
    if (!id) return;
    set(ref(rtdb, `sessions/${id}/scene/command`), { text, at: Date.now() });
    remove(ref(rtdb, `sessions/${id}/scene/ack`));
  }, [id]);

  const grant = useCallback(() => {
    if (!id || !request) return;
    set(ref(rtdb, `sessions/${id}/scene/verdict`), { id: request.id, result: "granted", at: Date.now() });
    remove(ref(rtdb, `sessions/${id}/scene/request`));
  }, [id, request]);

  const deny = useCallback(() => {
    if (!id || !request) return;
    set(ref(rtdb, `sessions/${id}/scene/verdict`), { id: request.id, result: "denied", at: Date.now() });
    remove(ref(rtdb, `sessions/${id}/scene/request`));
  }, [id, request]);

  // --- Sub actions ---------------------------------------------------------

  const requestPermission = useCallback(() => {
    if (!id) return;
    const reqId = Math.random().toString(36).slice(2);
    set(ref(rtdb, `sessions/${id}/scene/request`), { id: reqId, at: Date.now() });
    remove(ref(rtdb, `sessions/${id}/scene/verdict`));
  }, [id]);

  const acknowledge = useCallback(() => {
    if (id) set(ref(rtdb, `sessions/${id}/scene/ack`), { at: Date.now() });
  }, [id]);

  const markPerformed = useCallback(() => {
    if (id) update(ref(rtdb, `sessions/${id}/scene/performance`), { status: "performed", at: Date.now() });
  }, [id]);

  // --- Performance loop (Dom) ----------------------------------------------

  const enterPerformance = useCallback(() => {
    if (id) set(ref(rtdb, `sessions/${id}/scene/performance`), { status: "idle", action: null, tier: null, score: null, streak: 0, at: Date.now() });
  }, [id]);

  const assignPerformance = useCallback((action: string, tier: PerfTier, streak: number) => {
    if (id) set(ref(rtdb, `sessions/${id}/scene/performance`), { status: "assigned", action, tier, score: null, streak, at: Date.now() });
  }, [id]);

  const scorePerformance = useCallback((grade: number, streak: number) => {
    if (id) update(ref(rtdb, `sessions/${id}/scene/performance`), { status: "scored", score: grade, streak, at: Date.now() });
  }, [id]);

  const exitPerformance = useCallback(() => {
    if (id) remove(ref(rtdb, `sessions/${id}/scene/performance`));
  }, [id]);

  // --- Shared --------------------------------------------------------------

  const clearScene = useCallback(() => {
    if (id) remove(ref(rtdb, `sessions/${id}/scene`));
  }, [id]);

  const acknowledged = !!(commandAt && ackAt && ackAt >= commandAt);

  return {
    command, commandAt, request, verdict, acknowledged, performance,
    sendCommand, grant, deny, requestPermission, acknowledge, clearScene,
    markPerformed, enterPerformance, assignPerformance, scorePerformance, exitPerformance,
  };
}
