"use client";

import { useEffect } from "react";

export function SetPlayedFlag({ date, sport }: { date: string; sport: string }) {
  useEffect(() => {
    localStorage.setItem(`fanatiq_played_${date}_${sport}`, "1");
  }, [date, sport]);
  return null;
}
