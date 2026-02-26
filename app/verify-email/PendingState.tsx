"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export function PendingState() {
  const { data: session } = useSession();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function resend() {
    setLoading(true);
    try {
      await fetch("/api/auth/resend-verification", { method: "POST" });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {session?.user?.email && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          We sent a link to{" "}
          <span className="font-medium text-foreground">{session.user.email}</span>.
          Click it to verify your account and start playing.
        </p>
      )}
      <p className="text-xs text-muted-foreground/60">The link expires in 24 hours.</p>

      {sent ? (
        <p className="text-green-400 text-sm font-medium">New link sent! Check your inbox.</p>
      ) : (
        <Button onClick={resend} disabled={loading} variant="outline" className="w-full">
          {loading && <RotateCcw className="h-4 w-4 mr-2 animate-spin" />}
          Resend verification email
        </Button>
      )}

      <p className="text-xs text-muted-foreground/60">
        Wrong email?{" "}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
        >
          Sign out
        </button>
      </p>
    </>
  );
}
