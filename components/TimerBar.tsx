"use client";

import { useEffect, useState, useCallback } from "react";
import { Progress } from "@/components/ui/progress";

interface TimerBarProps {
  durationMs: number;
  running: boolean;
  onExpire: () => void;
  onTick?: (remainingMs: number) => void;
}

export function TimerBar({ durationMs, running, onExpire, onTick }: TimerBarProps) {
  const [remainingMs, setRemainingMs] = useState(durationMs);

  const handleExpire = useCallback(onExpire, [onExpire]);

  useEffect(() => {
    setRemainingMs(durationMs);
  }, [durationMs]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 100;
        if (next <= 0) {
          clearInterval(interval);
          handleExpire();
          return 0;
        }
        onTick?.(next);
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [running, handleExpire, onTick]);

  const pct = (remainingMs / durationMs) * 100;
  const seconds = Math.ceil(remainingMs / 1000);

  const colorClass =
    pct > 50
      ? "bg-green-500"
      : pct > 25
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="w-full flex items-center gap-3">
      <div className="flex-1">
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all duration-100 rounded-full ${colorClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span
        className={`text-lg font-mono font-bold w-6 text-right tabular-nums ${
          seconds <= 3 ? "text-red-400 animate-pulse" : "text-foreground"
        }`}
      >
        {seconds}
      </span>
    </div>
  );
}
