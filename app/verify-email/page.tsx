import { Mail, Clock, XCircle } from "lucide-react";
import { PendingState } from "./PendingState";
import { SuccessState } from "./SuccessState";

interface Props {
  searchParams: Promise<{ success?: string; error?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { success, error } = await searchParams;

  // ── Verification success ────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex justify-center items-start pt-16">
        <div className="text-center flex flex-col items-center gap-4 max-w-sm">
          <SuccessState />
        </div>
      </div>
    );
  }

  // ── Link expired ────────────────────────────────────────────────────────────
  if (error === "expired") {
    return (
      <div className="flex justify-center items-start pt-16">
        <div className="text-center flex flex-col items-center gap-4 max-w-sm">
          <Clock className="h-14 w-14 text-yellow-400" />
          <h1 className="text-2xl font-black">Link expired</h1>
          <PendingState />
        </div>
      </div>
    );
  }

  // ── Invalid / already-used link ─────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex justify-center items-start pt-16">
        <div className="text-center flex flex-col items-center gap-4 max-w-sm">
          <XCircle className="h-14 w-14 text-red-400" />
          <h1 className="text-2xl font-black">Invalid link</h1>
          <PendingState />
        </div>
      </div>
    );
  }

  // ── Default: unverified user blocked by middleware ──────────────────────────
  return (
    <div className="flex justify-center items-start pt-16">
      <div className="text-center flex flex-col items-center gap-4 max-w-sm">
        <div className="p-4 rounded-full bg-yellow-500/10 border border-yellow-500/20">
          <Mail className="h-10 w-10 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-black">Verify your email</h1>
        <PendingState />
      </div>
    </div>
  );
}
