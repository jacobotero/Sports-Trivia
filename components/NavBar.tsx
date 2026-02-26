"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Trophy, User, Users, Home, LogOut, LogIn } from "lucide-react";

export function NavBar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight">
          <span className="text-primary">Sports</span>
          <span className="text-muted-foreground">dle</span>
        </Link>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/"><Home className="h-4 w-4 mr-1" />Home</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/leaderboard"><Trophy className="h-4 w-4 mr-1" />Leaderboard</Link>
          </Button>

          {session ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile"><User className="h-4 w-4 mr-1" />Profile</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/friends"><Users className="h-4 w-4 mr-1" />Friends</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4 mr-1" />Sign Out
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" asChild>
              <Link href="/login"><LogIn className="h-4 w-4 mr-1" />Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
