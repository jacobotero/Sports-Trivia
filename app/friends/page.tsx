"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RankBadge } from "@/components/RankBadge";
import { toast } from "sonner";
import { Users, Search, UserPlus, Check, X, Loader2 } from "lucide-react";

interface UserEntry {
  id: string;
  name: string | null;
  email: string;
}

interface FriendEntry {
  requestId: string;
  user: UserEntry;
  status: string;
}

interface CompareEntry {
  sport: string;
  xpTotal: number;
}

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserEntry[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [pendingIn, setPendingIn] = useState<FriendEntry[]>([]);
  const [pendingOut, setPendingOut] = useState<FriendEntry[]>([]);
  const [comparing, setComparing] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<{
    me: { sports: CompareEntry[] };
    friend: { name: string | null; sports: CompareEntry[] };
  } | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadFriends = useCallback(async () => {
    const res = await fetch("/api/friends/list");
    if (res.ok) {
      const data = await res.json();
      setFriends(data.friends);
      setPendingIn(data.pendingIncoming);
      setPendingOut(data.pendingOutgoing);
    }
  }, []);

  useEffect(() => {
    if (session?.user) loadFriends();
  }, [session, loadFriends]);

  async function handleSearch() {
    if (searchQuery.trim().length < 2) return;
    setLoadingSearch(true);
    try {
      const res = await fetch(`/api/user/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } finally {
      setLoadingSearch(false);
    }
  }

  async function sendRequest(receiverId: string) {
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId }),
    });
    if (res.ok) {
      toast.success("Friend request sent!");
      setSearchResults([]);
      setSearchQuery("");
      loadFriends();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to send request");
    }
  }

  async function acceptRequest(requestId: string) {
    const res = await fetch("/api/friends/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    if (res.ok) {
      toast.success("Friend request accepted!");
      loadFriends();
    }
  }

  async function removeRequest(requestId: string) {
    const res = await fetch("/api/friends/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    if (res.ok) {
      toast.success("Removed.");
      loadFriends();
      if (comparing) setComparing(null);
    }
  }

  async function compareStats(userId: string) {
    if (comparing === userId) {
      setComparing(null);
      setCompareData(null);
      return;
    }
    setComparing(userId);
    const res = await fetch(`/api/friends/compare?userId=${userId}`);
    if (res.ok) {
      setCompareData(await res.json());
    }
  }

  if (status === "loading") return null;

  const SPORT_EMOJI: Record<string, string> = { MLB: "⚾", NFL: "🏈", NBA: "🏀", NHL: "🏒" };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7" />
        <h1 className="text-3xl font-bold">Friends</h1>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Friend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loadingSearch}>
              {loadingSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {searchResults.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
              <div className="flex-1">
                <p className="font-medium text-sm">{u.name ?? "Player"}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Button size="sm" onClick={() => sendRequest(u.id)}>
                <UserPlus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          ))}
          {searchResults.length === 0 && searchQuery.trim().length >= 2 && !loadingSearch && (
            <p className="text-sm text-muted-foreground">No users found.</p>
          )}
        </CardContent>
      </Card>

      {/* Pending incoming */}
      {pendingIn.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Pending Requests
              <Badge>{pendingIn.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pendingIn.map((r) => (
              <div key={r.requestId} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                <div className="flex-1">
                  <p className="font-medium text-sm">{r.user.name ?? "Player"}</p>
                  <p className="text-xs text-muted-foreground">{r.user.email}</p>
                </div>
                <Button size="sm" onClick={() => acceptRequest(r.requestId)}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => removeRequest(r.requestId)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Friends list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Friends ({friends.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {friends.length === 0 ? (
            <p className="text-muted-foreground text-sm">No friends yet. Add some above!</p>
          ) : (
            friends.map((f) => (
              <div key={f.requestId} className="flex flex-col gap-2">
                <div className="flex items-center gap-3 p-2 rounded-lg border border-border">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{f.user.name ?? "Player"}</p>
                    <p className="text-xs text-muted-foreground">{f.user.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={comparing === f.user.id ? "default" : "outline"}
                    onClick={() => compareStats(f.user.id)}
                  >
                    Compare
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => removeRequest(f.requestId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {comparing === f.user.id && compareData && (
                  <div className="border border-border rounded-lg p-3 bg-card/50">
                    <p className="text-sm font-semibold mb-2">Stats Comparison</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="font-medium text-muted-foreground">Sport</div>
                      <div className="font-medium text-center">You</div>
                      <div className="font-medium text-center">{compareData.friend.name ?? "Friend"}</div>
                      {["MLB", "NFL", "NBA", "NHL"].map((s) => {
                        const mine = compareData.me.sports.find((x) => x.sport === s)?.xpTotal ?? 0;
                        const theirs = compareData.friend.sports.find((x) => x.sport === s)?.xpTotal ?? 0;
                        return (
                          <>
                            <div key={s} className="flex items-center gap-1">{SPORT_EMOJI[s]} {s}</div>
                            <div className={`text-center font-mono ${mine > theirs ? "text-green-400" : ""}`}>{mine}</div>
                            <div className={`text-center font-mono ${theirs > mine ? "text-green-400" : ""}`}>{theirs}</div>
                          </>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
