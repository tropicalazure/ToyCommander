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
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // If already signed in, redirect to partners dashboard
  useEffect(() => {
    if (user && !loading) {
      router.push("/partners");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      toast({
        title: "Welcome Back",
        description: "Successfully signed in to ToyCommander.",
      });
      router.push("/partners");
    } catch (err: any) {
      console.error(err);
      let message = "Failed to sign in. Please check your credentials.";
      if (err.code === "auth/invalid-credential") {
        message = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }
      toast({
        title: "Authentication Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-[350px] h-[350px] bg-accent/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-md w-full text-center relative z-10">
        {/* Logo and Brand */}
        <Link href="/" className="inline-flex flex-col items-center group mb-8">
          <Logo className="w-16 h-16 md:w-20 md:h-20 drop-shadow-[0_0_20px_rgba(var(--primary),0.2)] transition-all duration-300 group-hover:scale-105" />
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white font-headline uppercase mt-2">
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
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Sign In</h2>
            <p className="text-xs text-muted-foreground font-semibold mt-1">
              Access your profile, saved partners, and direct play invites.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 bg-background/50 border-border/80 rounded-xl focus-visible:ring-primary focus-visible:border-primary font-medium text-white placeholder:text-muted-foreground/60 transition-all"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black text-sm rounded-xl uppercase tracking-wider transition-all active:scale-[0.98] mt-2 group shadow-[0_5px_20px_rgba(255,0,255,0.2)]"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Signing In...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              )}
            </Button>
          </form>

          {/* Footnotes */}
          <div className="mt-6 pt-6 border-t border-border/20 text-center">
            <span className="text-xs text-muted-foreground font-semibold">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-primary hover:text-primary/80 font-black uppercase tracking-tight transition-colors ml-1"
              >
                Sign Up
              </Link>
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
