import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Trophy } from "lucide-react";

const SPORT_EMOJI: Record<string, string> = { MLB: "⚾", NFL: "🏈", NBA: "🏀" };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, userSports, recentAttempts] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    db.userSport.findMany({ where: { userId }, orderBy: { xpTotal: "desc" } }),
    db.attempt.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: { id: true, sport: true, date: true, totalScore: true, xpEarned: true },
    }),
  ]);

  if (!user) redirect("/login");

  const totalXp = userSports.reduce((s, u) => s + u.xpTotal, 0);

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-400 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center ring-2 ring-primary/20">
          <User className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.name ?? "Player"}</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-sm tabular-nums">
          {totalXp.toLocaleString()} XP
        </Badge>
      </div>

      <Separator />

      {/* Per-sport XP */}
      {userSports.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">XP by Sport</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {userSports.filter(us => SPORT_EMOJI[us.sport]).map((us) => (
              <Card key={us.sport} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-2xl">{SPORT_EMOJI[us.sport]}</span>
                  <div>
                    <p className="font-bold text-sm">{us.sport}</p>
                    <p className="text-yellow-400 font-mono text-sm tabular-nums">
                      {us.xpTotal.toLocaleString()} XP
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {userSports.length > 0 && <Separator />}

      {/* Recent games */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-400" />
          Recent Games
        </h2>
        {recentAttempts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No completed games yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentAttempts.map((a) => (
              <Card key={a.id} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-xl">{SPORT_EMOJI[a.sport] ?? "🎯"}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{a.sport}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{a.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold tabular-nums">{a.totalScore.toLocaleString()} pts</p>
                    <p className="text-xs text-yellow-400 tabular-nums">+{a.xpEarned} XP</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
