"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AVATAR_COLORS, AVATAR_EMOJIS, getAvatarColorClass } from "@/lib/avatar";

type ProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [selectedColor, setSelectedColor] = useState("magenta");
  const [selectedEmoji, setSelectedEmoji] = useState("👾");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setSelectedColor(profile.avatarColor || "magenta");
      setSelectedEmoji(profile.avatarEmoji || "👾");
    }
  }, [profile, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast({
        title: "Validation Error",
        description: "Display name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        avatarColor: selectedColor,
        avatarEmoji: selectedEmoji,
      });
      toast({
        title: "Profile Updated",
        description: "Your settings have been saved successfully.",
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95%] bg-card/95 border-border/80 text-white rounded-3xl p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9)] z-[150]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Profile</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-semibold mt-1">
            Update your public name and customize your avatar look.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 py-2">
          {/* Live Preview */}
          <div className="flex flex-col items-center gap-2 p-3 bg-background/30 border border-border/20 rounded-2xl">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center text-3xl transition-all duration-300 ${getAvatarColorClass(selectedColor)}`}>
              {selectedEmoji}
            </div>
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
              {displayName.trim() || "Preview Name"}
            </span>
          </div>

          {/* Display Name Input */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Display Name
            </Label>
            <Input
              id="edit-name"
              placeholder="e.g. CyberPlayer"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-11 bg-background/50 border-border/80 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-white"
              disabled={saving}
              required
            />
          </div>

          {/* Color Selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Avatar Glow Color
            </span>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.id)}
                  className={`h-7 w-7 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${getAvatarColorClass(color.id)} ${
                    selectedColor === color.id
                      ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-105"
                      : "opacity-80"
                  }`}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Emoji Selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Avatar Icon
            </span>
            <div className="grid grid-cols-6 gap-2 pt-0.5">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`h-8 w-8 text-lg rounded-xl flex items-center justify-center bg-background/50 border hover:bg-muted/50 transition-all ${
                    selectedEmoji === emoji
                      ? "border-primary bg-primary/10 text-xl"
                      : "border-border/60"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 border-border/50 rounded-xl hover:bg-muted text-muted-foreground font-bold uppercase tracking-tight text-xs"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 bg-primary hover:bg-primary/95 text-white font-black rounded-xl uppercase tracking-wider text-xs shadow-[0_5px_15px_rgba(255,0,255,0.2)]"
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
