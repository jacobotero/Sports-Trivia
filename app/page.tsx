"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { SportCard } from "@/components/SportCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, RotateCcw, Zap, Timer, Trophy } from "lucide-react";

const IS_DEV = process.env.NODE_ENV === "development";
const SPORTS = ["MLB", "NFL", "NBA"] as const;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPlayedFromStorage(date: string) {
  const result: Partial<Record<string, number>> = {};
  for (const sport of SPORTS) {
    if (localStorage.getItem(`sportsdle_played_${date}_${sport}`)) result[sport] = 1;
  }
  return result;
}

const HOW_TO = [
  { icon: Zap,    title: "8 Questions",     desc: "Multiple choice questions across your favourite sport." },
  { icon: Timer,  title: "10 Second Timer", desc: "Answer fast — your score is based on speed and accuracy." },
  { icon: Trophy, title: "Earn XP",         desc: "Sign in to earn XP and climb the leaderboard." },
];

export default function HomePage() {
  const { data: session } = useSession();
  const today = todayStr();
  const [played, setPlayed] = useState<Partial<Record<string, number>>>({});
  const [resetting, setResetting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPlayed(getPlayedFromStorage(today));
  }, [today]);

  async function handleDevReset() {
    setResetting(true);
    try {
      for (const sport of SPORTS) localStorage.removeItem(`sportsdle_played_${today}_${sport}`);
      await fetch("/api/dev/reset", { method: "POST" });
      setPlayed({});
    } finally {
      setResetting(false);
    }
  }

  const displayDate = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center flex flex-col gap-3 pt-6 pb-2">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight">
          <span className="text-primary">Sports</span>
          <span className="text-muted-foreground">dle</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-sm mx-auto leading-relaxed">
          Daily sports trivia. One shot per day — make it count.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/70">
          <Calendar className="h-3.5 w-3.5" />
          <span>{displayDate}</span>
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {!session && (
            <Badge variant="secondary" className="text-xs px-3 py-1">
              Sign in to track XP &amp; compete with friends
            </Badge>
          )}
          {IS_DEV && (
            <Button variant="outline" size="sm" onClick={handleDevReset} disabled={resetting} className="text-xs text-muted-foreground border-dashed h-7">
              <RotateCcw className="h-3 w-3 mr-1" />
              {resetting ? "Resetting..." : "Reset Today (Dev)"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SPORTS.map((sport, i) => (
          <SportCard
            key={sport}
            sport={sport}
            played={Boolean(played[sport])}
            style={mounted ? { animation: `fade-in-up 0.45s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms both` } : { opacity: 0 }}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {HOW_TO.map(({ icon: Icon, title, desc }, i) => (
          <div
            key={title}
            className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/60 bg-card/40 transition-all duration-300 hover:border-border hover:bg-card/60"
            style={mounted ? { animation: `fade-in-up 0.45s cubic-bezier(0.22,1,0.36,1) ${(SPORTS.length + i) * 80}ms both` } : { opacity: 0 }}
          >
            <div className="mt-0.5 p-2 rounded-lg bg-primary/10 shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
