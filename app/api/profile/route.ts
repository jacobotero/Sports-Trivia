import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeRank } from "@/lib/rank";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

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

    return NextResponse.json({
      user,
      sports: userSports.map((s) => ({
        sport: s.sport,
        xpTotal: s.xpTotal,
        rank: computeRank(s.xpTotal),
      })),
      recentAttempts,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
