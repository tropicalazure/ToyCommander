
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Crown, Heart, ArrowRight, ShieldCheck } from "lucide-react";
import { generateFriendlyId } from "@/lib/session-id";
import { cn } from "@/lib/utils";

export default function DsModeLobbyPage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");

  const startAsSub = () => {
    const id = generateFriendlyId();
    router.push(`/ds-mode/sub/${id}`);
  };

  const joinAsDom = () => {
    // Accept a raw id or a pasted invite link.
    const trimmed = joinId.trim();
    const match = trimmed.match(/ds-mode\/(?:sub|dom)\/([^/?#]+)/);
    const id = match ? match[1] : trimmed;
    if (id) router.push(`/ds-mode/dom/${id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-10 select-none">
      <div className="max-w-md w-full space-y-8">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="text-right">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">D/s <span className="text-primary">Mode</span></h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Power Exchange · Live</p>
          </div>
        </header>

        <div className="text-center space-y-2 pt-2">
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Choose Your Role</h3>
          <p className="text-sm text-muted-foreground">One holds the controls. One surrenders them. The device is the dynamic.</p>
        </div>

        {/* Submit */}
        <button onClick={startAsSub}
          className="w-full text-left rounded-3xl border border-white/10 bg-card/40 p-6 hover:border-primary/40 transition-all active:scale-[0.99] group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Heart className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Submit</p>
              <h4 className="text-xl font-black text-white uppercase tracking-tight">Start a scene</h4>
              <p className="text-xs text-muted-foreground mt-1">Your device. You arm it, then hand the controls to your Dominant. You keep the STOP.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </button>

        {/* Dominate */}
        <div className="rounded-3xl border border-white/10 bg-card/40 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Crown className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Dominate</p>
              <h4 className="text-xl font-black text-white uppercase tracking-tight">Take control</h4>
              <p className="text-xs text-muted-foreground mt-1">Paste the invite from your submissive to open the console.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") joinAsDom(); }}
              placeholder="Invite link or session id"
              className="h-12 bg-zinc-900 border-white/10 focus-visible:ring-primary/40 text-sm"
            />
            <Button onClick={joinAsDom} disabled={!joinId.trim()}
              className={cn("h-12 px-5 font-black uppercase tracking-widest text-xs shrink-0 rounded-xl")}>
              Join
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 opacity-40 pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">The submissive can STOP everything at any moment</p>
        </div>
      </div>
    </div>
  );
}
