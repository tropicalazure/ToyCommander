"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { Mail, Lock, User, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { AVATAR_COLORS, AVATAR_EMOJIS, getAvatarColorClass } from "@/lib/avatar";

export default function RegisterPage() {
  const { signUp, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedColor, setSelectedColor] = useState("magenta");
  const [selectedEmoji, setSelectedEmoji] = useState("👾");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !loading) {
      router.push("/partners");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email, password, displayName, selectedColor, selectedEmoji);
      toast({
        title: "Profile Created!",
        description: `Welcome to ToyCommander, ${displayName}!`,
      });
      router.push("/partners");
    } catch (err: any) {
      console.error(err);
      let message = "Failed to create account. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        message = "This email is already in use by another account.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        message = "Password must be at least 6 characters long.";
      }
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6 py-12 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-[350px] h-[350px] bg-accent/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-xl w-full text-center relative z-10">
        {/* Logo and Brand */}
        <Link href="/" className="inline-flex flex-col items-center group mb-6">
          <Logo className="w-14 h-14 md:w-16 md:h-16 drop-shadow-[0_0_20px_rgba(var(--primary),0.2)] transition-all duration-300 group-hover:scale-105" />
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white font-headline uppercase mt-2">
            TOY<span className="text-primary">COMMANDER</span>
          </h1>
        </Link>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full bg-card/40 backdrop-blur-2xl border border-border/50 rounded-3xl p-6 md:p-8 text-left shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
        >
          <div className="mb-6">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Create Profile</h2>
            <p className="text-xs text-muted-foreground font-semibold mt-1">
              Join to customize your profile, link with saved partners, and play.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Side: Credentials */}
            <div className="space-y-4">
              {/* Display Name Field */}
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Display Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Enter public name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-11 h-12 bg-background/50 border-border/80 rounded-xl focus-visible:ring-primary focus-visible:border-primary font-medium text-white placeholder:text-muted-foreground/60 transition-all"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 bg-background/50 border-border/80 rounded-xl focus-visible:ring-primary focus-visible:border-primary font-medium text-white placeholder:text-muted-foreground/60 transition-all"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 bg-background/50 border-border/80 rounded-xl focus-visible:ring-primary focus-visible:border-primary font-medium text-white placeholder:text-muted-foreground/60 transition-all"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Right Side: Avatar Customizer */}
            <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-border/20 pt-6 md:pt-0 md:pl-6">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Avatar Designer
              </Label>

              {/* Live Preview */}
              <div className="flex justify-center items-center py-4 bg-background/20 border border-border/30 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-2 right-2 text-primary">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center text-3xl transition-all duration-300 ${getAvatarColorClass(selectedColor)}`}>
                    {selectedEmoji}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                    {displayName || "Guest Preview"}
                  </span>
                </div>
              </div>

              {/* Color Selector */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80">
                  Glow Color
                </span>
                <div className="flex flex-wrap gap-2">
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
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80">
                  Select Icon
                </span>
                <div className="grid grid-cols-6 gap-2">
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
            </div>

            {/* Submit Button (Full Width span) */}
            <div className="md:col-span-2 mt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black text-sm rounded-xl uppercase tracking-wider transition-all active:scale-[0.98] group shadow-[0_5px_20px_rgba(255,0,255,0.2)]"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5">
                    Complete Profile
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                )}
              </Button>
            </div>
          </form>

          {/* Footnotes */}
          <div className="mt-6 pt-6 border-t border-border/20 text-center">
            <span className="text-xs text-muted-foreground font-semibold">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary hover:text-primary/80 font-black uppercase tracking-tight transition-colors ml-1"
              >
                Sign In
              </Link>
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
