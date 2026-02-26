import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeRank } from "@/lib/rank";
import { RankBadge } from "@/components/RankBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const SPORT_EMOJI: Record<string, string> = {
  MLB: "⚾",
  NFL: "🏈",
  NBA: "🏀",
  NHL: "🏒",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, userSports, recentAttempts] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    db.userSport.findMany({ where: { userId } }),
    db.attempt.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: {
        id: true,
        sport: true,
        date: true,
        totalScore: true,
        xpEarned: true,
        completedAt: true,
      },
    }),
  ]);

  if (!user) redirect("/login");

  const totalXp = userSports.reduce((s, u) => s + u.xpTotal, 0);

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.name ?? "Player"}</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant="outline" className="font-mono">
            {totalXp.toLocaleString()} total XP
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Per-sport ranks */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Sport Rankings</h2>
        {userSports.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Play a quiz to start earning XP and building your rank!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userSports.map((us) => {
              const rank = computeRank(us.xpTotal);
              const progressPct = us.xpTotal > 0
                ? Math.min((rank.xpInTier / (rank.xpInTier + rank.xpToNextDivision)) * 100, 100)
                : 0;
              return (
                <Card key={us.sport}>
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{SPORT_EMOJI[us.sport]}</span>
                      <span className="font-bold">{us.sport}</span>
                    </div>
                    <RankBadge xpTotal={us.xpTotal} showXp />
                    {rank.xpToNextDivision > 0 && (
                      <div className="flex flex-col gap-1">
                        <Progress value={progressPct} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">
                          {rank.xpToNextDivision} XP to next division
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Recent attempts */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Recent Games
        </h2>
        {recentAttempts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No completed games yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentAttempts.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-xl">{SPORT_EMOJI[a.sport]}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{a.sport}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {a.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold">{a.totalScore} pts</p>
                    <p className="text-xs text-yellow-400">+{a.xpEarned} XP</p>
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
