"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, PlayCircle } from "lucide-react";

interface SportCardProps {
  sport: "MLB" | "NFL" | "NBA";
  played?: boolean;
  score?: number;
  style?: React.CSSProperties;
}

const SPORT_CONFIG = {
  MLB: {
    label: "Baseball",
    emoji: "⚾",
    gradient: "from-red-950/80 via-red-900/40 to-red-800/20",
    border: "border-red-700/40",
    glow: "group-hover:shadow-red-500/20",
    accent: "text-red-400",
    ring: "group-hover:ring-red-500/30",
    shimmer: "from-red-400/0 via-red-400/10 to-red-400/0",
  },
  NFL: {
    label: "Football",
    emoji: "🏈",
    gradient: "from-green-950/80 via-green-900/40 to-green-800/20",
    border: "border-green-700/40",
    glow: "group-hover:shadow-green-500/20",
    accent: "text-green-400",
    ring: "group-hover:ring-green-500/30",
    shimmer: "from-green-400/0 via-green-400/10 to-green-400/0",
  },
  NBA: {
    label: "Basketball",
    emoji: "🏀",
    gradient: "from-orange-950/80 via-orange-900/40 to-orange-800/20",
    border: "border-orange-700/40",
    glow: "group-hover:shadow-orange-500/20",
    accent: "text-orange-400",
    ring: "group-hover:ring-orange-500/30",
    shimmer: "from-orange-400/0 via-orange-400/10 to-orange-400/0",
  },
};

export function SportCard({ sport, played = false, score, style }: SportCardProps) {
  const c = SPORT_CONFIG[sport];

  return (
    <div className="group" style={style}>
      <Card
        className={`
          relative overflow-hidden bg-gradient-to-br ${c.gradient} ${c.border} border
          transition-all duration-300 ease-out
          hover:scale-[1.03] hover:shadow-2xl ${c.glow}
          hover:ring-2 ${c.ring}
          cursor-pointer
        `}
      >
        {/* Shimmer sweep on hover */}
        <div
          className={`
            pointer-events-none absolute inset-0 -translate-x-full
            bg-gradient-to-r ${c.shimmer}
            group-hover:translate-x-full transition-transform duration-700 ease-in-out
          `}
        />

        <CardContent className="relative p-6 flex flex-col items-center gap-4 text-center">
          {/* Emoji with float animation on hover */}
          <div className="text-5xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110 select-none">
            {c.emoji}
          </div>

          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${c.accent}`}>
              {c.label}
            </p>
            <h2 className="text-2xl font-black text-foreground mt-0.5">{sport}</h2>
          </div>

          {played ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex items-center gap-1.5 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-semibold">Completed</span>
              </div>
              {score !== undefined && (
                <span className="font-mono text-sm text-muted-foreground">{score} pts</span>
              )}
            </div>
          ) : (
            <Button
              asChild
              className="w-full font-bold h-10 shadow-lg transition-all duration-200 group-hover:shadow-none"
              size="sm"
            >
              <Link href={`/play/${sport.toLowerCase()}`}>
                <PlayCircle className="h-4 w-4 mr-1.5" />
                Play Today
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
