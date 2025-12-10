
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
  Search, 
  Zap, 
  Volume2, 
  Shield, 
  Play,
  Loader2,
  X,
  FileAudio,
  Upload,
  Pause,
  StopCircle
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { applyVibrationSafe, stopAllDevices } from "@/lib/buttplug/toy-client";
import { motion, AnimatePresence } from "framer-motion";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { cn } from "@/lib/utils";
import Image from "next/image";

const MOCK_RESULTS = [
  { id: "jfKfPfyJRdk", title: "Lofi Girl - beats to relax/study to", channel: "Lofi Girl", thumb: "https://picsum.photos/seed/lofi/320/180" },
  { id: "5qap5aO4i9A", title: "lofi hip hop radio - beats to sleep/chill to", channel: "Lofi Girl", thumb: "https://picsum.photos/seed/chill/320/180" },
  { id: "twXpS-E583A", title: "Cyberpunk 2077 - Music from the world of", channel: "Cyberpunk", thumb: "https://picsum.photos/seed/cyber/320/180" },
  { id: "S488-V6_D64", title: "Neon Nights - Synthwave Mix", channel: "Electronic Pulse", thumb: "https://picsum.photos/seed/synth/320/180" }
];

export default function RhythmPulsePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("direct");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState("jfKfPfyJRdk"); 
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [vibrationValue, setVibrationValue] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Direct File State
  const [fileName, setFileName] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastEmitTime = useRef<number>(0);
  
  // Dynamic Scaling State
  const peakLevelRef = useRef<number>(128); // Moving average for peak detection
  const sensitivityRef = useRef(sensitivity);

  useWakeLock(true);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const initAudioEngine = useCallback(() => {
    if (audioContextRef.current) return;
    
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512; // Higher resolution for better peak tracking
      analyser.smoothingTimeConstant = 0.6; // Smoother transitions
      
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    } catch (e) {
      console.error("Failed to init AudioContext", e);
    }
  }, []);

  const stopAll = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend().catch(() => {});
    }

    setIsSyncActive(false);
    setVibrationValue(0);
    applyVibrationSafe(0);
    stopAllDevices();

    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
        '*'
      );
    }
  }, []);

  const startAnalysisLoop = useCallback(() => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const loop = () => {
      if (!analyserRef.current || !isSyncActive) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average of the lower frequency range (Bass/Kick)
      let sum = 0;
      const bassRange = Math.floor(bufferLength * 0.15); // Focus heavily on sub-bass (bins 0-38 roughly)
      for (let i = 0; i < bassRange; i++) {
        sum += dataArray[i];
      }
      const avg = sum / (bassRange || 1);
      
      // Dynamic Peak Detection: Track the moving average of peak levels
      if (avg > peakLevelRef.current) {
        peakLevelRef.current = avg;
      } else {
        // Slowly decay the peak level to adapt to quieter parts
        peakLevelRef.current = Math.max(80, peakLevelRef.current * 0.995);
      }

      // Normalize based on the current peak level
      // This ensures that the vibration is always dynamic relative to the music's intensity
      const threshold = peakLevelRef.current * 0.6; // Values below 60% of peak don't trigger much
      const dynamicNormalized = Math.max(0, (avg - threshold) / (peakLevelRef.current - threshold));
      
      // Apply sensitivity scaling
      const sens = sensitivityRef.current;
      const finalVal = Math.min(dynamicNormalized * (sens * 2), 1);
      
      setVibrationValue(finalVal);

      const now = performance.now();
      if (now - lastEmitTime.current > 80 || finalVal === 0) {
        applyVibrationSafe(finalVal);
        lastEmitTime.current = now;
      }
      
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
  }, [isSyncActive]);

  const startAmbientSync = async () => {
    try {
      stopAll();
      initAudioEngine();

      if (iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
          '*'
        );
      }

      const ctx = audioContextRef.current!;
      const analyser = analyserRef.current!;

      if (ctx.state === 'suspended') await ctx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      micSourceRef.current = ctx.createMediaStreamSource(stream);
      micSourceRef.current.connect(analyser);
      
      setIsSyncActive(true);
    } catch (err) {
      toast({ variant: "destructive", title: "Mic Access Denied", description: "Enable microphone for Ambient Mode." });
    }
  };

  const startDirectSync = async () => {
    if (!audioUrl || !audioElementRef.current) {
      toast({ variant: "destructive", title: "No Audio File", description: "Please upload a track first." });
      return;
    }

    try {
      stopAll();
      initAudioEngine();

      const ctx = audioContextRef.current!;
      const analyser = analyserRef.current!;

      if (ctx.state === 'suspended') await ctx.resume();

      // Ensure the audio element is connected to the analyser
      if (!mediaSourceRef.current) {
        mediaSourceRef.current = ctx.createMediaElementSource(audioElementRef.current);
        mediaSourceRef.current.connect(analyser);
        analyser.connect(ctx.destination);
      }

      audioElementRef.current.play();
      setIsSyncActive(true);
    } catch (err) {
      console.error("Direct sync error:", err);
      toast({ variant: "destructive", title: "Audio Error", description: "Could not initialize direct sync." });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setFileName(file.name);
      stopAll();
      toast({ title: "File Ready", description: `${file.name} loaded for direct analysis.` });
    }
  };

  useEffect(() => {
    if (isSyncActive) {
      startAnalysisLoop();
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  }, [isSyncActive, startAnalysisLoop]);

  useEffect(() => {
    const handleUnload = () => stopAll();
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      stopAll();
    };
  }, [stopAll]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:p-8 pt-6 md:pt-12">
      <div className="max-w-5xl w-full space-y-8">
        <header className="flex items-center justify-between px-2">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <Link href="/games"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="text-right">
             <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">Rhythm <span className="text-primary">Pulse</span></h2>
             <p className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-[0.3em] mt-1">Tactile Audio Sync</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Tabs value={activeTab} onValueChange={(val) => { stopAll(); setActiveTab(val); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/20 h-14 p-0 rounded-2xl mb-6 overflow-hidden border border-primary/10">
                <TabsTrigger value="direct" className="h-full rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-xs tracking-widest gap-2">
                  <FileAudio className="w-4 h-4" /> Direct Mode
                </TabsTrigger>
                <TabsTrigger value="ambient" className="h-full rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-xs tracking-widest gap-2">
                  <Mic className="w-4 h-4" /> Ambient Mode
                </TabsTrigger>
              </TabsList>

              <TabsContent value="direct" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="aspect-[21/9] bg-card/40 border-2 border-primary/20 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col items-center justify-center p-8 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                  
                  {audioUrl ? (
                    <div className="text-center space-y-6 z-10 w-full">
                      <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-2 magenta-glow border border-primary/30">
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
                        onEnded={() => setIsSyncActive(false)}
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
                          MP3 or WAV files supported for flawless internal analysis.
                        </p>
                      </div>
                      <label className="cursor-pointer">
                        <Input 
                          type="file" 
                          accept="audio/*" 
                          className="hidden" 
                          onChange={handleFileUpload}
                        />
                        <div className="px-8 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                          Select File
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ambient" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="aspect-video bg-card/40 border-2 border-primary/20 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl relative group">
                  <iframe 
                    ref={iframeRef}
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&modestbranding=1&enablejsapi=1`}
                    title="Rhythm Source"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <div className="absolute inset-0 pointer-events-none border-4 border-primary/0 group-hover:border-primary/5 transition-colors" />
                </div>
                
                <div className="bg-card/40 border border-border/50 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Paste YouTube Link..." 
                      className="pl-11 h-12 md:h-14 bg-background/50 border-border/50 rounded-xl"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button 
                      onClick={() => {
                        const id = extractVideoId(youtubeUrl);
                        if (id) {
                          setVideoId(id);
                          toast({ title: "Video Loaded" });
                        } else toast({ variant: "destructive", title: "Invalid URL" });
                      }} 
                      className="h-12 md:h-14 px-6 font-black uppercase tracking-widest rounded-xl flex-1 md:flex-none"
                    >
                      Load
                    </Button>
                    <Button 
                      onClick={() => setIsSearchOpen(true)}
                      variant="outline"
                      className="h-12 md:h-14 px-4 font-black rounded-xl border-primary/20 text-primary hover:bg-primary/10"
                    >
                      <Search className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-card/40 border-2 border-primary/20 backdrop-blur-xl rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-8 flex flex-col items-center">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
                 <motion.div 
                   animate={{ 
                     scale: 1 + vibrationValue * 0.4,
                     opacity: 0.1 + (vibrationValue * 0.6)
                   }}
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

                <div className="grid gap-4">
                  <Button 
                    onClick={isSyncActive ? stopAll : (activeTab === 'direct' ? startDirectSync : startAmbientSync)}
                    variant={isSyncActive ? "destructive" : "default"}
                    className="h-14 font-black rounded-xl uppercase tracking-widest text-xs gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    {isSyncActive ? (
                      <><StopCircle className="w-4 h-4" /> Stop Pulse</>
                    ) : (
                      <><Play className="w-4 h-4" /> Start Rhythm Sync</>
                    )}
                  </Button>
                </div>
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
                   : "Ambient audio is analyzed locally. Your sound is never saved or transmitted."
                 }
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

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl p-6 flex flex-col items-center"
          >
            <div className="w-full max-w-2xl space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Music <span className="text-primary">Search</span></h3>
                <Button onClick={() => setIsSearchOpen(false)} variant="ghost" size="icon" className="rounded-full">
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Search tracks, mixes, rhythms..." 
                  className="pl-12 h-16 bg-card/50 border-primary/20 rounded-2xl text-lg font-bold"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsSearching(true);
                      setTimeout(() => setIsSearching(false), 800);
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(isSearching ? [] : MOCK_RESULTS).map((video) => (
                  <button 
                    key={video.id}
                    onClick={() => {
                      setVideoId(video.id);
                      setIsSearchOpen(false);
                      toast({ title: "Video Loaded" });
                    }}
                    className="flex flex-col gap-3 p-3 bg-card/40 border border-primary/10 rounded-2xl hover:border-primary/40 transition-all text-left group"
                  >
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden">
                      <Image 
                        src={video.thumb} 
                        alt={video.title} 
                        fill 
                        className="object-cover opacity-70 group-hover:opacity-100 transition-opacity" 
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-10 h-10 text-primary fill-primary" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white leading-tight line-clamp-2">{video.title}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{video.channel}</p>
                    </div>
                  </button>
                ))}
                
                {isSearching && (
                  <div className="col-span-full py-20 flex flex-col items-center gap-4 opacity-50">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-xs font-black uppercase tracking-[0.3em]">Searching...</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
