
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  Music,
  Mic,
  Zap,
  Shield,
  Play,
  FileAudio,
  Upload,
  StopCircle,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { applyVibrationSafe, stopAllDevices } from "@/lib/buttplug/toy-client";
import { motion } from "framer-motion";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { cn } from "@/lib/utils";

const FEATURED_MIXES = [
  { id: "jfKfPfyJRdk", title: "Lofi Chill",    category: "AMBIENT"    },
  { id: "5qap5aO4i9A", title: "Sleep Beats",    category: "AMBIENT"    },
  { id: "twXpS-E583A", title: "Cyberpunk OST",  category: "ELECTRONIC" },
  { id: "S488-V6_D64", title: "Neon Synthwave",  category: "SYNTH"      },
  { id: "36YnV9STBqc", title: "Dark Techno",    category: "BASS"       },
  { id: "4xDzrJKXOOY", title: "Deep House",     category: "HOUSE"      },
];

export default function RhythmPulsePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab]       = useState("direct");
  const [youtubeUrl, setYoutubeUrl]     = useState("");
  const [videoId, setVideoId]           = useState("jfKfPfyJRdk");
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [sensitivity, setSensitivity]   = useState(0.5);
  const [vibrationValue, setVibrationValue] = useState(0);
  const [fileName, setFileName]         = useState<string | null>(null);
  const [audioUrl, setAudioUrl]         = useState<string | null>(null);

  // ─── refs ──────────────────────────────────────────────────────────────────
  const audioContextRef   = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const mediaSourceRef    = useRef<MediaElementAudioSourceNode | null>(null);
  const micSourceRef      = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioElementRef   = useRef<HTMLAudioElement | null>(null);
  const animationRef      = useRef<number | null>(null);
  const lastEmitTime      = useRef<number>(0);
  const peakLevelRef      = useRef<number>(128);
  const sensitivityRef    = useRef(sensitivity);
  const iframeRef         = useRef<HTMLIFrameElement>(null);
  // The RAF loop reads this ref — avoids stale-closure bugs entirely
  const isSyncRef         = useRef(false);

  useWakeLock(true);

  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);

  // ─── helpers ───────────────────────────────────────────────────────────────
  const setSyncState = useCallback((val: boolean) => {
    isSyncRef.current = val;
    setIsSyncActive(val);
  }, []);

  const extractVideoId = (url: string) => {
    const m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return m && m[2].length === 11 ? m[2] : null;
  };

  const initAudioEngine = useCallback(() => {
    if (audioContextRef.current) return;
    try {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    } catch (e) {
      console.error("[RhythmPulse] AudioContext init failed", e);
    }
  }, []);

  // ─── RAF analysis loop ─────────────────────────────────────────────────────
  const startAnalysisLoop = useCallback(() => {
    if (!analyserRef.current) return;
    const bufLen = analyserRef.current.frequencyBinCount;
    const data   = new Uint8Array(bufLen);

    const loop = () => {
      // Always read the ref — never the stale closure value
      if (!analyserRef.current || !isSyncRef.current) return;

      analyserRef.current.getByteFrequencyData(data);

      const bassRange = Math.floor(bufLen * 0.15);
      let sum = 0;
      for (let i = 0; i < bassRange; i++) sum += data[i];
      const avg = sum / (bassRange || 1);

      peakLevelRef.current = avg > peakLevelRef.current
        ? avg
        : Math.max(80, peakLevelRef.current * 0.995);

      const threshold        = peakLevelRef.current * 0.6;
      const dynamicNorm      = Math.max(0, (avg - threshold) / (peakLevelRef.current - threshold));
      const finalVal         = Math.min(dynamicNorm * (sensitivityRef.current * 2), 1);

      setVibrationValue(finalVal);

      const now = performance.now();
      if (now - lastEmitTime.current > 80 || finalVal === 0) {
        applyVibrationSafe(finalVal);
        lastEmitTime.current = now;
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
  }, []); // no isSyncActive dep — reads isSyncRef directly

  // ─── stop ──────────────────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
    if (streamRef.current)    { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioElementRef.current) audioElementRef.current.pause();
    if (audioContextRef.current?.state === 'running') audioContextRef.current.suspend().catch(() => {});
    setSyncState(false);
    setVibrationValue(0);
    applyVibrationSafe(0);
    stopAllDevices();
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*'
    );
  }, [setSyncState]);

  // ─── start: ambient ────────────────────────────────────────────────────────
  const startAmbientSync = async () => {
    try {
      stopAll();
      initAudioEngine();

      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*'
      );

      const ctx     = audioContextRef.current!;
      const analyser = analyserRef.current!;
      if (ctx.state === 'suspended') await ctx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      micSourceRef.current = ctx.createMediaStreamSource(stream);
      micSourceRef.current.connect(analyser);

      setSyncState(true);
      startAnalysisLoop();
    } catch {
      toast({ variant: "destructive", title: "Mic Access Denied", description: "Enable microphone for Ambient Mode." });
    }
  };

  // ─── start: direct ─────────────────────────────────────────────────────────
  const startDirectSync = async () => {
    if (!audioUrl || !audioElementRef.current) {
      toast({ variant: "destructive", title: "No Audio File", description: "Please upload a track first." });
      return;
    }
    try {
      stopAll();
      initAudioEngine();

      const ctx     = audioContextRef.current!;
      const analyser = analyserRef.current!;
      if (ctx.state === 'suspended') await ctx.resume();

      if (!mediaSourceRef.current) {
        mediaSourceRef.current = ctx.createMediaElementSource(audioElementRef.current);
        mediaSourceRef.current.connect(analyser);
        analyser.connect(ctx.destination);
      }

      audioElementRef.current.play();
      setSyncState(true);
      startAnalysisLoop();
    } catch (err) {
      console.error("[RhythmPulse] Direct sync error:", err);
      toast({ variant: "destructive", title: "Audio Error", description: "Could not initialize direct sync." });
    }
  };

  // ─── file upload ───────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    // Clear cached media source so next startDirectSync re-creates it for the new element
    mediaSourceRef.current = null;
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setFileName(file.name);
    stopAll();
    toast({ title: "File Ready", description: `${file.name} loaded.` });
  };

  // ─── cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onUnload = () => stopAll();
    window.addEventListener('beforeunload', onUnload);
    return () => { window.removeEventListener('beforeunload', onUnload); stopAll(); };
  }, [stopAll]);

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:p-8 pt-6 md:pt-12">
      <div className="max-w-5xl w-full space-y-8">

        <header className="flex items-center justify-between px-2">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <Link href="/games"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="text-right">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">
              Rhythm <span className="text-primary">Pulse</span>
            </h2>
            <p className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-[0.3em] mt-1">Tactile Audio Sync</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

          {/* ── Left: tabs ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={(val) => { stopAll(); setActiveTab(val); }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-muted/20 h-14 p-0 rounded-2xl mb-6 overflow-hidden border border-primary/10">
                <TabsTrigger value="direct" className="h-full rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-xs tracking-widest gap-2">
                  <FileAudio className="w-4 h-4" /> Direct Mode
                </TabsTrigger>
                <TabsTrigger value="ambient" className="h-full rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-xs tracking-widest gap-2">
                  <Mic className="w-4 h-4" /> Ambient Mode
                </TabsTrigger>
              </TabsList>

              {/* Direct */}
              <TabsContent value="direct" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="aspect-[21/9] bg-card/40 border-2 border-primary/20 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col items-center justify-center p-8 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                  {audioUrl ? (
                    <div className="text-center space-y-6 z-10 w-full">
                      <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto border border-primary/30">
                        <Music className="w-10 h-10 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight line-clamp-1">{fileName}</h3>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Direct Digital Link</p>
                      </div>
                      <audio
                        ref={audioElementRef}
                        src={audioUrl}
                        className="w-full h-10 mt-4 accent-primary"
                        controls
                        onEnded={() => setSyncState(false)}
                      />
                    </div>
                  ) : (
                    <div className="text-center space-y-6 z-10">
                      <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto border-2 border-dashed border-muted-foreground/30">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-black text-lg text-white uppercase tracking-tighter">Upload Audio</h4>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest max-w-[200px] leading-relaxed">
                          MP3 or WAV for flawless internal analysis.
                        </p>
                      </div>
                      <label className="cursor-pointer">
                        <Input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                        <div className="px-8 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                          Select File
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Ambient */}
              <TabsContent value="ambient" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="aspect-video bg-card/40 border-2 border-primary/20 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&modestbranding=1&enablejsapi=1`}
                    title="Rhythm Source"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex gap-3 items-center">
                  <Input
                    placeholder="Paste YouTube URL..."
                    className="h-12 bg-background/50 border-border/50 rounded-xl flex-1"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      const id = extractVideoId(youtubeUrl);
                      if (id) { setVideoId(id); toast({ title: "Video Loaded" }); }
                      else toast({ variant: "destructive", title: "Invalid URL" });
                    }}
                    className="h-12 px-6 font-black uppercase tracking-widest rounded-xl shrink-0"
                  >
                    Load
                  </Button>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1">Featured Mixes</p>
                  <div className="grid grid-cols-3 gap-2">
                    {FEATURED_MIXES.map((mix) => (
                      <button
                        key={mix.id}
                        onClick={() => { setVideoId(mix.id); toast({ title: `${mix.title} loaded` }); }}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all",
                          videoId === mix.id
                            ? "bg-primary/20 border-primary/60"
                            : "bg-card/30 border-border/30 hover:border-primary/30 hover:bg-primary/10"
                        )}
                      >
                        <p className="text-[8px] font-black uppercase tracking-widest text-primary/70 mb-0.5">{mix.category}</p>
                        <p className="text-xs font-black text-white leading-tight">{mix.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Right: controls ────────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-card/40 border-2 border-primary/20 backdrop-blur-xl rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-8 flex flex-col items-center">

              {/* Pulse orb */}
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
                <motion.div
                  animate={{ scale: 1 + vibrationValue * 0.4, opacity: 0.1 + vibrationValue * 0.6 }}
                  transition={{ duration: 0.05 }}
                  className="absolute inset-0 rounded-full bg-primary"
                />
                <Music className={cn(
                  "w-10 h-10 md:w-14 md:h-14 transition-colors",
                  vibrationValue > 0.05 ? "text-primary animate-pulse" : "text-muted-foreground opacity-30"
                )} />
              </div>

              <div className="text-center space-y-1">
                <h4 className="font-black text-xl md:text-2xl uppercase text-white tracking-tighter">
                  {activeTab === 'direct' ? 'Direct Engine' : 'Ambient Engine'}
                </h4>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  Status: {isSyncActive ? 'Synced' : 'Ready'}
                </p>
              </div>

              <div className="w-full space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Power Multiplier</span>
                    <span className="text-primary">{Math.round(sensitivity * 100)}%</span>
                  </div>
                  <Slider
                    value={[sensitivity]}
                    max={1}
                    step={0.01}
                    onValueChange={(val) => setSensitivity(val[0])}
                  />
                </div>

                <Button
                  onClick={isSyncActive ? stopAll : (activeTab === 'direct' ? startDirectSync : startAmbientSync)}
                  variant={isSyncActive ? "destructive" : "default"}
                  className="w-full h-14 font-black rounded-xl uppercase tracking-widest text-xs gap-2 shadow-lg active:scale-95 transition-all"
                >
                  {isSyncActive
                    ? <><StopCircle className="w-4 h-4" /> Stop Pulse</>
                    : <><Play className="w-4 h-4" /> Start Rhythm Sync</>
                  }
                </Button>
              </div>

              <div className="w-full pt-4 border-t border-border/20 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tactile Load</span>
                  <span className="text-2xl font-black text-primary tabular-nums">{Math.round(vibrationValue * 100)}%</span>
                </div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Zap className={cn(
                    "transition-all duration-75",
                    vibrationValue > 0.1 ? "text-primary animate-pulse scale-110" : "text-muted-foreground opacity-30"
                  )} />
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                <span className="text-white font-bold block mb-1">PRIVACY & SECURITY</span>
                {activeTab === 'direct'
                  ? "Direct analysis stays inside your browser. Your music is never uploaded."
                  : "Ambient audio is analyzed locally. Your sound is never saved or transmitted."}
              </p>
            </div>
          </div>

        </div>

        <footer className="text-center pt-12 pb-20 opacity-20">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">
            Precision Rhythm System // V3.2 Direct Audio
          </p>
        </footer>
      </div>
    </div>
  );
}
