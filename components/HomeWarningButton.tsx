"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function HomeWarningButton() {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex items-center gap-2 animate-in fade-in duration-150">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Leave quiz?</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={() => router.push("/")}
        >
          Leave
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => setConfirming(false)}
        >
          Stay
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
      ← Home
    </Button>
  );
}
