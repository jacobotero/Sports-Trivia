import { db } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

const SPORTS = ["MLB", "NFL", "NBA"] as const;
const TOP_N = 50;

async function getOverallLeaderboard() {
  const raw = await db.userSport.groupBy({
    by: ["userId"],
    _sum: { xpTotal: true },
    orderBy: { _sum: { xpTotal: "desc" } },
    take: TOP_N,
  });
  const users = await db.user.findMany({
    where: { id: { in: raw.map((r) => r.userId) } },
    select: { id: true, name: true },
  });
  const map = Object.fromEntries(users.map((u) => [u.id, u]));
  return raw.map((r, i) => ({
    place: i + 1,
    name: map[r.userId]?.name ?? "Anonymous",
    xp: r._sum.xpTotal ?? 0,
  }));
}

async function getSportLeaderboard(sport: (typeof SPORTS)[number]) {
  const rows = await db.userSport.findMany({
    where: { sport },
    orderBy: { xpTotal: "desc" },
    take: TOP_N,
    include: { user: { select: { name: true } } },
  });
  return rows.map((r, i) => ({
    place: i + 1,
    name: r.user.name ?? "Anonymous",
    xp: r.xpTotal,
  }));
}

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function LeaderboardTable({ entries }: { entries: { place: number; name: string; xp: number }[] }) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">No players yet. Be the first!</p>;
  }
  return (
    <div className="divide-y divide-border">
      {entries.map((e) => (
        <div key={e.place} className="flex items-center gap-4 py-3 px-1">
          <span className="w-8 text-center font-mono text-sm font-semibold text-muted-foreground">
            {MEDALS[e.place] ?? `#${e.place}`}
          </span>
          <span className="flex-1 font-medium truncate">{e.name}</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-yellow-400">
            {e.xp.toLocaleString()} XP
          </span>
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
    SPORTS.map((sport, i) => [sport, sportBoards[i]])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
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
                <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
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
