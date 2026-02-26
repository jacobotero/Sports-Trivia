import { db } from "@/lib/db";
import { computeRank } from "@/lib/rank";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { RankBadge } from "@/components/RankBadge";

const SPORTS = ["MLB", "NFL", "NBA", "NHL"] as const;
const TOP_N = 50;

async function getOverallLeaderboard() {
  const raw = await db.userSport.groupBy({
    by: ["userId"],
    _sum: { xpTotal: true },
    orderBy: { _sum: { xpTotal: "desc" } },
    take: TOP_N,
  });
  const userIds = raw.map((r) => r.userId);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const map = Object.fromEntries(users.map((u) => [u.id, u]));
  return raw.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    name: map[r.userId]?.name ?? "Anonymous",
    xpTotal: r._sum.xpTotal ?? 0,
  }));
}

async function getSportLeaderboard(sport: (typeof SPORTS)[number]) {
  return db.userSport.findMany({
    where: { sport },
    orderBy: { xpTotal: "desc" },
    take: TOP_N,
    include: { user: { select: { id: true, name: true } } },
  });
}

const PLACE_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function LeaderboardTable({
  entries,
}: {
  entries: { rank: number; name: string; xpTotal: number }[];
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No players yet. Be the first!
      </p>
    );
  }
  return (
    <div className="divide-y divide-border">
      {entries.map((e) => (
        <div key={e.rank} className="flex items-center gap-4 py-3 px-1">
          <span className="w-8 text-center font-mono text-sm font-semibold text-muted-foreground">
            {PLACE_MEDALS[e.rank] ?? `#${e.rank}`}
          </span>
          <span className="flex-1 font-medium truncate">{e.name}</span>
          <RankBadge xpTotal={e.xpTotal} showXp />
        </div>
      ))}
    </div>
  );
}

export default async function LeaderboardPage() {
  const [overall, ...sportBoards] = await Promise.all([
    getOverallLeaderboard(),
    ...SPORTS.map(getSportLeaderboard),
  ]);

  const sportData = Object.fromEntries(
    SPORTS.map((sport, i) => [
      sport,
      (sportBoards[i] as Awaited<ReturnType<typeof getSportLeaderboard>>).map((e, idx) => ({
        rank: idx + 1,
        name: e.user.name ?? "Anonymous",
        xpTotal: e.xpTotal,
      })),
    ])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-yellow-400" />
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground text-sm">Top players by total XP</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="overall">
            <TabsList className="mb-4">
              <TabsTrigger value="overall">Overall</TabsTrigger>
              {SPORTS.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {s}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overall">
              <LeaderboardTable entries={overall} />
            </TabsContent>

            {SPORTS.map((sport) => (
              <TabsContent key={sport} value={sport}>
                <LeaderboardTable entries={sportData[sport]} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
