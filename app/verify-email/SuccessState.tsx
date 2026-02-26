"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export function SuccessState() {
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Refresh the JWT so the middleware sees emailVerified = true
    update().then(() => {
      setTimeout(() => router.push("/"), 1500);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <CheckCircle2 className="h-14 w-14 text-green-500 drop-shadow-[0_0_16px_rgba(34,197,94,0.4)]" />
      <h1 className="text-2xl font-black">Email verified!</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Your account is now active. Taking you home…
      </p>
    </>
  );
}
