import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidSport } from "@/lib/daily";
import { Sport } from "@prisma/client";
import { apiLimiter, checkRateLimit, getIp } from "@/lib/ratelimit";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  try {
    const limited = await checkRateLimit(apiLimiter, getIp(req));
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const sport = (searchParams.get("sport") ?? "").toUpperCase();
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const skip = (page - 1) * PAGE_SIZE;

    if (sport && !isValidSport(sport)) {
      return NextResponse.json({ error: "Invalid sport" }, { status: 400 });
    }

    if (sport) {
      // Per-sport leaderboard by xpTotal
      const entries = await db.userSport.findMany({
        where: { sport: sport as Sport },
        orderBy: { xpTotal: "desc" },
        take: PAGE_SIZE,
        skip,
        include: { user: { select: { id: true, name: true } } },
      });

      return NextResponse.json(
        entries.map((e, idx) => ({
          rank: skip + idx + 1,
          userId: e.user.id,
          name: e.user.name ?? "Anonymous",
          xpTotal: e.xpTotal,
          sport: e.sport,
        }))
      );
    }

    // Overall leaderboard: sum xp across all sports
    const raw = await db.userSport.groupBy({
      by: ["userId"],
      _sum: { xpTotal: true },
      orderBy: { _sum: { xpTotal: "desc" } },
      take: PAGE_SIZE,
      skip,
    });

    const userIds = raw.map((r) => r.userId);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return NextResponse.json(
      raw.map((r, idx) => ({
        rank: skip + idx + 1,
        userId: r.userId,
        name: userMap[r.userId]?.name ?? "Anonymous",
        xpTotal: r._sum.xpTotal ?? 0,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
