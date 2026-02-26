"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, User, Users, LogOut, LogIn, ChevronDown } from "lucide-react";

function UserMenu({ name, email }: { name?: string | null; email?: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (name ?? email ?? "?")[0].toUpperCase();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 hover:bg-muted/60 transition-colors group"
      >
        <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary group-hover:bg-primary/30 transition-colors">
          {initial}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* User info header */}
          <div className="px-3 py-2.5 border-b border-border/60">
            <p className="text-sm font-semibold truncate">{name ?? "Player"}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>

          {/* Menu items */}
          <div className="p-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors w-full"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Profile
            </Link>
            <Link
              href="/friends"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors w-full"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              Friends
            </Link>
            <div className="border-t border-border/60 mt-1 pt-1">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-red-500/10 hover:text-red-400 text-muted-foreground transition-colors w-full"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function NavBar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight shrink-0">
          <span className="text-primary">Fanat</span>
          <span>IQ</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/leaderboard">
              <Trophy className="h-4 w-4 mr-1.5" />
              Leaderboard
            </Link>
          </Button>

          {session ? (
            <UserMenu name={session.user?.name} email={session.user?.email} />
          ) : (
            <Button size="sm" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4 mr-1.5" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
