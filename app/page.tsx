"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { SportCard } from "@/components/SportCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, RotateCcw } from "lucide-react";

const IS_DEV = process.env.NODE_ENV === "development";

const SPORTS = ["MLB", "NFL", "NBA", "NHL"] as const;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPlayedFromStorage(date: string) {
  const result: Partial<Record<string, number>> = {};
  for (const sport of SPORTS) {
    const stored = localStorage.getItem(`sportsdle_played_${date}_${sport}`);
    if (stored) result[sport] = 1;
  }
  return result;
}

export default function HomePage() {
  const { data: session } = useSession();
  const today = todayStr();
  const [played, setPlayed] = useState<Partial<Record<string, number>>>({});
  const [resetting, setResetting] = useState(false);

  async function handleDevReset() {
    setResetting(true);
    try {
      // Clear localStorage
      for (const sport of SPORTS) {
        localStorage.removeItem(`sportsdle_played_${today}_${sport}`);
      }
      // Clear DB attempts for today
      await fetch("/api/dev/reset", { method: "POST" });
      setPlayed({});
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    setPlayed(getPlayedFromStorage(today));
  }, [today]);

  const displayDate = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="text-center flex flex-col gap-3 py-4">
        <h1 className="text-5xl font-black tracking-tight">
          <span className="text-primary">Sports</span>
          <span className="text-muted-foreground">dle</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Daily sports trivia across MLB, NFL, NBA, and NHL. One shot per day — make it count.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{displayDate}</span>
        </div>
        {!session && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-xs">
              Sign in to track XP, ranks &amp; play with friends
            </Badge>
          </div>
        )}
        {IS_DEV && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDevReset}
              disabled={resetting}
              className="text-xs text-muted-foreground border-dashed"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {resetting ? "Resetting..." : "Reset Today (Dev)"}
            </Button>
          </div>
        )}
      </div>

      {/* Sport tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SPORTS.map((sport) => (
          <SportCard
            key={sport}
            sport={sport}
            played={Boolean(played[sport])}
          />
        ))}
      </div>

      {/* How to play */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {[
          {
            title: "8 Questions",
            desc: "Each daily quiz has 8 questions per sport — multiple choice or fill-in-the-blank.",
          },
          {
            title: "10 Second Timer",
            desc: "Answer fast! Your score combines correctness with speed.",
          },
          {
            title: "Earn XP & Rank Up",
            desc: "Sign in to earn XP, climb from Bronze to Diamond, and compare with friends.",
          },
        ].map((item) => (
          <div key={item.title} className="flex flex-col gap-1 p-4 rounded-xl border border-border bg-card/50">
            <p className="font-semibold text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
