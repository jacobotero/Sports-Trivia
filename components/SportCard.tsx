"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PlayCircle } from "lucide-react";

interface SportCardProps {
  sport: "MLB" | "NFL" | "NBA" | "NHL";
  played?: boolean;
  score?: number;
}

const SPORT_CONFIG = {
  MLB: {
    label: "Baseball",
    emoji: "⚾",
    color: "from-red-900/40 to-red-800/20 border-red-700/50",
    accentColor: "text-red-400",
  },
  NFL: {
    label: "Football",
    emoji: "🏈",
    color: "from-green-900/40 to-green-800/20 border-green-700/50",
    accentColor: "text-green-400",
  },
  NBA: {
    label: "Basketball",
    emoji: "🏀",
    color: "from-orange-900/40 to-orange-800/20 border-orange-700/50",
    accentColor: "text-orange-400",
  },
  NHL: {
    label: "Hockey",
    emoji: "🏒",
    color: "from-blue-900/40 to-blue-800/20 border-blue-700/50",
    accentColor: "text-blue-400",
  },
};

export function SportCard({ sport, played = false, score }: SportCardProps) {
  const config = SPORT_CONFIG[sport];

  return (
    <Card
      className={`relative overflow-hidden bg-gradient-to-br ${config.color} border transition-all hover:scale-105`}
    >
      <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
        <div className="text-5xl">{config.emoji}</div>
        <div>
          <p className={`text-sm font-medium uppercase tracking-widest ${config.accentColor}`}>
            {config.label}
          </p>
          <h2 className="text-2xl font-bold text-foreground">{sport}</h2>
        </div>

        {played ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex items-center gap-1 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            {score !== undefined && (
              <Badge variant="secondary" className="font-mono text-sm">
                {score} pts
              </Badge>
            )}
          </div>
        ) : (
          <Button asChild className="w-full font-semibold" size="sm">
            <Link href={`/play/${sport.toLowerCase()}`}>
              <PlayCircle className="h-4 w-4 mr-1" />
              Play Today
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
