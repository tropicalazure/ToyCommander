
"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Gamepad2, 
  Trophy, 
  Users, 
  Clock, 
  Play, 
  Music, 
  Activity, 
  Compass,
  LayoutGrid
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const games = [
  {
    id: "reactive-maze",
    title: "Reactive Maze",
    description: "Navigate a digital maze where every collision and movement translates to tactile feedback.",
    icon: Compass,
    players: "1 Player",
    duration: "Endless",
    imageId: "game-maze",
    status: "Live",
    category: "Action",
    url: "/games/reactive-maze"
  },
  {
    id: "rhythm-pulse",
    title: "Rhythm Pulse",
    description: "Sync your hardware with the beat of your favorite tracks using real-time microphone analysis.",
    icon: Music,
    players: "1 Player",
    duration: "Track Based",
    imageId: "game-rhythm",
    status: "Live",
    category: "Rhythm",
    url: "/games/rhythm-pulse"
  },
  {
    id: "endurance-challenge",
    title: "Endurance",
    description: "Test your limits. Maintain a specific intensity level against a fluctuating computer-controlled wave.",
    icon: Activity,
    players: "1 Player",
    duration: "5-15 min",
    imageId: "game-endurance",
    status: "Beta",
    category: "Challenge",
    url: "#"
  }
];

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col pt-8 md:pt-12 p-4 md:p-12">
      <header className="flex items-center gap-4 px-2 mb-8 md:mb-12">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-4xl font-black font-headline tracking-tighter text-white leading-none uppercase">
            Experience<span className="text-primary">Hub</span>
          </h2>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary" />
            <p className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-[0.2em] md:tracking-[0.4em]">Interactive Library Active</p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {games.map((game) => {
            const image = PlaceHolderImages.find(img => img.id === game.imageId);
            return (
              <Card key={game.id} className="bg-card/40 border-primary/10 backdrop-blur-sm overflow-hidden flex flex-col transition-all hover:border-primary/40 group">
                <div className="relative h-48 w-full overflow-hidden">
                  {image?.imageUrl ? (
                    <Image 
                      src={image.imageUrl} 
                      alt={game.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                      data-ai-hint={image.imageHint}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-muted/20 flex items-center justify-center">
                      <Gamepad2 className="w-12 h-12 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                  <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground font-bold border-none">
                    {game.status}
                  </Badge>
                </div>
                
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black text-primary uppercase tracking-widest">{game.category}</p>
                     <div className="flex items-center gap-3 text-muted-foreground/60">
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <Users className="w-3 h-3" /> {game.players}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <Clock className="w-3 h-3" /> {game.duration}
                        </div>
                     </div>
                  </div>
                  <CardTitle className="text-2xl font-black text-white group-hover:text-primary transition-colors">{game.title}</CardTitle>
                </CardHeader>

                <CardContent className="flex-1">
                  <CardDescription className="text-muted-foreground font-medium leading-relaxed">
                    {game.description}
                  </CardDescription>
                </CardContent>

                <CardFooter className="pt-2">
                  <Button asChild className="w-full h-12 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 transition-all font-black uppercase tracking-widest rounded-xl gap-2">
                    <Link href={game.url}>
                      <Play className="w-4 h-4" /> Start Game
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-20 border-t border-border/20 pt-12 text-center opacity-30">
          <div className="flex justify-center mb-4">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.5em]">
            More Experiences Coming Soon
          </p>
        </div>
      </div>
    </div>
  );
}
