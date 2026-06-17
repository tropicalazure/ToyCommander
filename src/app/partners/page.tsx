"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, PartnerPreview } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ProfileDialog } from "@/components/ui/profile-dialog";
import { getAvatarColorClass } from "@/lib/avatar";
import { generateFriendlyId } from "@/lib/session-id";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  UserPlus,
  Loader2,
  Trash2,
  PhoneCall,
  UserCheck,
  UserX,
  Lock,
  ChevronRight,
  ShieldCheck,
  Edit2
} from "lucide-react";

export default function PartnersPage() {
  const {
    user,
    profile,
    loading,
    resolvePartnerCode,
    sendPartnerRequest,
    acceptPartnerRequest,
    declinePartnerRequest,
    removePartner
  } = useAuth();
  
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [resolvedPartner, setResolvedPartner] = useState<PartnerPreview | null>(null);
  
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [savedPartnerIds, setSavedPartnerIds] = useState<string[]>([]);
  
  const [copied, setCopied] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Load incoming requests and partners in real-time
  useEffect(() => {
    if (!user) return;

    const requestsRef = ref(rtdb, `requests/${user.uid}`);
    const partnersRef = ref(rtdb, `partners/${user.uid}`);

    const unsubRequests = onValue(requestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([uid, val]: [string, any]) => ({
          uid,
          ...val
        }));
        setIncomingRequests(list);
      } else {
        setIncomingRequests([]);
      }
    });

    const unsubPartners = onValue(partnersRef, (snapshot) => {
      if (snapshot.exists()) {
        const uids = Object.keys(snapshot.val());
        setSavedPartnerIds(uids);
      } else {
        setSavedPartnerIds([]);
      }
    });

    return () => {
      unsubRequests();
      unsubPartners();
    };
  }, [user]);

  const handleCopyCode = () => {
    if (!profile?.partnerCode) return;
    navigator.clipboard.writeText(profile.partnerCode);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Partner code copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearchPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCodeInput.trim()) return;

    setSearching(true);
    setResolvedPartner(null);
    try {
      const partner = await resolvePartnerCode(partnerCodeInput.trim());
      if (partner) {
        if (partner.uid === user?.uid) {
          toast({
            title: "Nice Try!",
            description: "You cannot add yourself as a partner.",
            variant: "destructive",
          });
        } else if (savedPartnerIds.includes(partner.uid)) {
          toast({
            title: "Already Partners",
            description: `${partner.displayName} is already on your partner list.`,
          });
        } else {
          setResolvedPartner(partner);
        }
      } else {
        toast({
          title: "Not Found",
          description: "Invalid partner code. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Search Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!resolvedPartner || !user) return;
    try {
      await sendPartnerRequest(resolvedPartner.uid);
      toast({
        title: "Request Sent!",
        description: `Sent a partner connection request to ${resolvedPartner.displayName}.`,
      });
      setResolvedPartner(null);
      setPartnerCodeInput("");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to send request. You might have already sent one.",
        variant: "destructive",
      });
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-6 py-8 relative overflow-y-auto">
      {/* Decorative gradient blur background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/20 pb-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white font-headline">
              Saved <span className="text-primary">Partners</span>
            </h1>
            <p className="text-xs text-muted-foreground font-semibold mt-1 uppercase tracking-wider">
              Link up for direct, secure interactive remote control play.
            </p>
          </div>
          
          {/* Quick Profile Widget */}
          {profile && (
            <div className="flex items-center gap-3 p-3 bg-card/30 border border-border/50 rounded-2xl">
              <div className={`h-11 w-11 rounded-full flex items-center justify-center text-2xl shrink-0 ${getAvatarColorClass(profile.avatarColor)}`}>
                {profile.avatarEmoji}
              </div>
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-sm font-black text-white truncate max-w-[120px] uppercase tracking-tight leading-none">
                  {profile.displayName}
                </span>
                <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest mt-1">
                  Online
                </span>
              </div>
              <Button
                onClick={() => setEditProfileOpen(true)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground rounded-lg"
                title="Edit Profile"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left/Middle Column: Saved Partners and Requests */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Incoming requests (Animated Alert) */}
            <AnimatePresence>
              {incomingRequests.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4" />
                    Connection Requests ({incomingRequests.length})
                  </h3>
                  <div className="grid gap-3">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.uid}
                        className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl shadow-[0_4px_20px_rgba(255,0,255,0.05)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xl shrink-0 ${getAvatarColorClass(req.avatarColor)}`}>
                            {req.avatarEmoji}
                          </div>
                          <span className="text-sm font-black text-white uppercase tracking-tight">
                            {req.displayName}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => declinePartnerRequest(req.uid)}
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => acceptPartnerRequest(req.uid)}
                            className="h-9 px-4 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-tight rounded-xl flex items-center gap-1 shadow-[0_3px_10px_rgba(255,0,255,0.15)]"
                          >
                            Accept
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Saved Partners list */}
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-white">
                Saved Partners List
              </h2>
              {savedPartnerIds.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-8 bg-card/20 border-border/50 rounded-3xl text-center">
                  <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground mb-3">
                    <Lock className="h-5 w-5 opacity-40" />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">No partners saved yet</h4>
                  <p className="text-xs text-muted-foreground font-semibold max-w-xs mt-1.5">
                    Share your partner code or add someone else's code to link up for direct connection play.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {savedPartnerIds.map((partnerId) => (
                    <PartnerListItem
                      key={partnerId}
                      partnerId={partnerId}
                      onRemove={removePartner}
                      currentUserProfile={profile}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Connection Center (Share code & Search Code) */}
          <div className="space-y-6">
            
            {/* Share Code Card */}
            {profile && (
              <Card className="p-6 bg-card/30 border-border/50 rounded-3xl space-y-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Share Your Code
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                    Send this code to a partner so they can connect with you.
                  </p>
                </div>
                
                <div className="flex items-center justify-between p-3.5 bg-black border border-border/60 rounded-2xl relative overflow-hidden group">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-muted-foreground/60 font-black uppercase tracking-widest">Your Code</span>
                    <span className="text-xl font-black text-white uppercase tracking-wider font-headline">
                      {profile.partnerCode}
                    </span>
                  </div>
                  <Button
                    onClick={handleCopyCode}
                    size="icon"
                    className="h-10 w-10 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition-all"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </Card>
            )}

            {/* Add Partner Card */}
            <Card className="p-6 bg-card/30 border-border/50 rounded-3xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Connect to Partner
                </h3>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                  Enter a partner's code to send a connection request.
                </p>
              </div>

              <form onSubmit={handleSearchPartner} className="flex gap-2">
                <Input
                  placeholder="e.g. TC-A48E"
                  value={partnerCodeInput}
                  onChange={(e) => setPartnerCodeInput(e.target.value)}
                  className="h-11 bg-background/50 border-border/80 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-white uppercase placeholder:normal-case font-bold"
                  disabled={searching}
                  required
                />
                <Button
                  type="submit"
                  disabled={searching}
                  className="h-11 bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-tight rounded-xl px-4 shrink-0 shadow-[0_3px_10px_rgba(255,0,255,0.15)]"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link"}
                </Button>
              </form>

              {/* Resolved User Result Card */}
              <AnimatePresence>
                {resolvedPartner && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-muted/20 border border-border/50 rounded-2xl flex flex-col items-center gap-3 text-center"
                  >
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center text-3xl ${getAvatarColorClass(resolvedPartner.avatarColor)}`}>
                      {resolvedPartner.avatarEmoji}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight leading-none">
                        {resolvedPartner.displayName}
                      </h4>
                      <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider mt-1 block">
                        Resolved Profile
                      </span>
                    </div>
                    <Button
                      onClick={handleSendRequest}
                      className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-tight rounded-xl flex items-center justify-center gap-1"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Send Partner Request
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <ProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} />
    </div>
  );
}

/* 
 * Sub-component for individual Partner List Item
 * Handles individual status listeners and direct invitation flow
 */
type PartnerListItemProps = {
  partnerId: string;
  onRemove: (id: string) => Promise<void>;
  currentUserProfile: any;
};

function PartnerListItem({ partnerId, onRemove, currentUserProfile }: PartnerListItemProps) {
  const [partner, setPartner] = useState<any>(null);
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const partnerRef = ref(rtdb, `users/${partnerId}`);
    const unsub = onValue(partnerRef, (snapshot) => {
      if (snapshot.exists()) {
        setPartner(snapshot.val());
      } else {
        setPartner(null);
      }
    });

    return () => unsub();
  }, [partnerId]);

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to disconnect from ${partner?.displayName || "this partner"}?`)) {
      return;
    }
    try {
      await onRemove(partnerId);
      toast({
        title: "Disconnected",
        description: `Successfully disconnected partner.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove partner.",
        variant: "destructive",
      });
    }
  };

  const handleInvite = async () => {
    if (!partner || !currentUserProfile) return;
    setInviting(true);
    try {
      const sessionId = generateFriendlyId();
      
      // 1. Create remote host session structure
      const sessionRef = ref(rtdb, `sessions/${sessionId}`);
      await set(sessionRef, {
        status: "waiting",
        hostActive: true,
        controllerActive: false,
        vibration: 0,
        pausedBy: null,
        hostProfile: {
          uid: currentUserProfile.uid,
          displayName: currentUserProfile.displayName,
          avatarColor: currentUserProfile.avatarColor,
          avatarEmoji: currentUserProfile.avatarEmoji
        }
      });

      // 2. Write invitation to partner's inbox
      const inviteRef = ref(rtdb, `invitations/${partnerId}/${sessionId}`);
      await set(inviteRef, {
        fromName: currentUserProfile.displayName,
        fromEmoji: currentUserProfile.avatarEmoji,
        fromColor: currentUserProfile.avatarColor,
        sessionId,
        timestamp: Date.now()
      });

      toast({
        title: "Session Created!",
        description: `Waiting for ${partner.displayName} to accept invitation...`,
      });

      // 3. Redirect host to controls screen
      router.push(`/toycontrols/host/${sessionId}`);
    } catch (err) {
      console.error(err);
      toast({
        title: "Invite Failed",
        description: "Failed to initiate session. Please try again.",
        variant: "destructive",
      });
      setInviting(false);
    }
  };

  if (!partner) return null;

  const isOnline = partner.status === "online";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card/20 border border-border/40 rounded-2xl hover:border-border/80 transition-all duration-300">
      {/* Profile Details */}
      <div className="flex items-center gap-3">
        <div className={`h-11 w-11 rounded-full flex items-center justify-center text-2xl shrink-0 ${getAvatarColorClass(partner.avatarColor)}`}>
          {partner.avatarEmoji}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-black text-white truncate max-w-[180px] uppercase tracking-tight leading-none">
            {partner.displayName}
          </span>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-neutral-600"}`} />
            <span className={`text-[8px] font-bold uppercase tracking-wider ${isOnline ? "text-emerald-500" : "text-muted-foreground"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2 justify-end sm:justify-start">
        {/* Remove Partner Button */}
        <Button
          onClick={handleRemove}
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors shrink-0"
          title="Disconnect Partner"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
        {/* Invite Button (Enabled only if Online) */}
        <Button
          onClick={handleInvite}
          disabled={!isOnline || inviting}
          className={`h-10 rounded-xl px-4 font-black text-xs uppercase tracking-tight flex items-center gap-1.5 transition-all ${
            isOnline 
              ? "bg-primary hover:bg-primary/90 text-white shadow-[0_4px_10px_rgba(255,0,255,0.15)] active:scale-[0.97]" 
              : "bg-muted text-muted-foreground border border-border/20 cursor-not-allowed opacity-50"
          }`}
        >
          {inviting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Inviting...
            </>
          ) : (
            <>
              <PhoneCall className="h-3.5 w-3.5" />
              Invite to Play
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
