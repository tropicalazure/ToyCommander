"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, remove, update } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { getAvatarColorClass } from "@/lib/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ShieldAlert } from "lucide-react";

type Invitation = {
  id: string;
  fromName: string;
  fromEmoji: string;
  fromColor: string;
  sessionId: string;
  timestamp: number;
};

export function InvitationListener() {
  const { user, profile } = useAuth();
  const [activeInvite, setActiveInvite] = useState<Invitation | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      setActiveInvite(null);
      return;
    }

    const invitesRef = ref(rtdb, `invitations/${user.uid}`);
    
    const unsubscribe = onValue(invitesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Convert to array and get the latest invite
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })) as Invitation[];
        
        // Sort by timestamp descending
        list.sort((a, b) => b.timestamp - a.timestamp);
        
        const latest = list[0];
        
        // Only show invites created in the last 5 minutes to prevent stale popup spam
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        if (latest && latest.timestamp > fiveMinutesAgo) {
          setActiveInvite(latest);
        } else if (latest) {
          // Auto-delete expired invite
          remove(ref(rtdb, `invitations/${user.uid}/${latest.id}`));
        }
      } else {
        setActiveInvite(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleAccept = async () => {
    if (!user || !activeInvite) return;
    
    const { id, sessionId } = activeInvite;
    
    // 1. Delete invitation
    await remove(ref(rtdb, `invitations/${user.uid}/${id}`));

    // 2. Redirect to control page
    router.push(`/toycontrols/remote/${sessionId}`);
  };

  const handleDecline = async () => {
    if (!user || !activeInvite) return;
    
    const { id } = activeInvite;
    await remove(ref(rtdb, `invitations/${user.uid}/${id}`));
    setActiveInvite(null);
  };

  return (
    <AnimatePresence>
      {activeInvite && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md p-5 bg-card/90 backdrop-blur-2xl border border-primary/30 rounded-3xl shadow-[0_0_50px_rgba(255,0,255,0.2)] flex flex-col gap-4"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl ${getAvatarColorClass(activeInvite.fromColor)}`}>
              {activeInvite.fromEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Incoming Invite</span>
              <h4 className="text-white font-black text-lg truncate uppercase tracking-tight mt-0.5">
                {activeInvite.fromName}
              </h4>
            </div>
          </div>

          <p className="text-muted-foreground text-xs font-semibold leading-relaxed">
            wants to connect and control your session. Accept to start direct remote control play.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-1">
            <Button
              onClick={handleDecline}
              variant="outline"
              className="h-11 rounded-xl border-border/50 hover:bg-muted text-muted-foreground font-bold uppercase tracking-tight text-xs flex items-center justify-center gap-1.5"
            >
              <X className="h-4 w-4" />
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="h-11 rounded-xl bg-primary hover:bg-primary/95 text-white font-black uppercase tracking-tight text-xs flex items-center justify-center gap-1.5 shadow-[0_5px_15px_rgba(255,0,255,0.2)]"
            >
              <Check className="h-4 w-4" />
              Accept
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
