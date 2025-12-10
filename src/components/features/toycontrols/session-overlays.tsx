"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import { PausedOverlay } from "./overlays/paused-overlay";
import { EndedOverlay } from "./overlays/ended-overlay";
import { NoDevicesOverlay } from "./overlays/no-devices-overlay";

/**
 * @fileOverview Orchestrator for session state overlays.
 * Composes specialized overlay modules for specific states.
 */

interface SessionOverlaysProps {
  pausedBy: string | null;
  sessionStatus: string | null;
  role: 'host' | 'remote' | 'local';
  hasDevices?: boolean;
  onTogglePause: () => void;
  onScan?: () => void;
}

export function SessionOverlays({ 
  pausedBy, 
  sessionStatus, 
  role, 
  hasDevices = true,
  onTogglePause,
  onScan 
}: SessionOverlaysProps) {
  return (
    <>
      <AnimatePresence>
        {!hasDevices && role !== 'remote' && onScan && (
          <NoDevicesOverlay onScan={onScan} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pausedBy && (
          <PausedOverlay 
            pausedBy={pausedBy} 
            role={role} 
            onTogglePause={onTogglePause} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionStatus === 'ended' && (
          <EndedOverlay role={role} />
        )}
      </AnimatePresence>
    </>
  );
}
