"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Mail, X } from "lucide-react";

export function EmailVerificationBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Only show for signed-in, unverified users
  if (!session?.user?.id || session.user.emailVerified || dismissed) return null;

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
    <div className="border-b border-yellow-500/20 bg-yellow-500/8 px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5">
          <Mail className="h-4 w-4 text-yellow-400 shrink-0" />
          <span className="text-yellow-200/80">
            Please verify your email address.{" "}
            {sent ? (
              <span className="text-yellow-400">Verification email sent!</span>
            ) : (
              <button
                onClick={resend}
                disabled={loading}
                className="text-yellow-400 underline underline-offset-2 hover:text-yellow-300 transition-colors disabled:opacity-50"
              >
                {loading ? "Sending…" : "Resend verification email"}
              </button>
            )}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-400/60 hover:text-yellow-400 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
