import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface Props {
  searchParams: Promise<{ success?: string; error?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { success, error } = await searchParams;

  if (success) {
    return (
      <div className="flex justify-center items-start pt-16">
        <div className="text-center flex flex-col items-center gap-4 max-w-sm">
          <CheckCircle2 className="h-14 w-14 text-green-500 drop-shadow-[0_0_16px_rgba(34,197,94,0.4)]" />
          <h1 className="text-2xl font-black">Email verified!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your email address has been confirmed. Your account is now fully active.
          </p>
          <Button asChild className="w-full mt-2">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (error === "expired") {
    return (
      <div className="flex justify-center items-start pt-16">
        <div className="text-center flex flex-col items-center gap-4 max-w-sm">
          <Clock className="h-14 w-14 text-yellow-400" />
          <h1 className="text-2xl font-black">Link expired</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This verification link has expired. Sign in and use the banner to request a new one.
          </p>
          <Button asChild variant="outline" className="w-full mt-2">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-start pt-16">
        <div className="text-center flex flex-col items-center gap-4 max-w-sm">
          <XCircle className="h-14 w-14 text-red-400" />
          <h1 className="text-2xl font-black">Invalid link</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This verification link is invalid or has already been used. Sign in and request a new one.
          </p>
          <Button asChild variant="outline" className="w-full mt-2">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  // No params — user navigated here directly
  return (
    <div className="flex justify-center items-start pt-16">
      <div className="text-center flex flex-col items-center gap-4 max-w-sm">
        <h1 className="text-2xl font-black">Check your email</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We sent you a verification link. Click it to confirm your email address.
          The link expires in 24 hours.
        </p>
        <Button asChild variant="outline" className="w-full mt-2">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
