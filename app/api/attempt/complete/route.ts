import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeXpEarned, computeRank } from "@/lib/rank";
import { Sport } from "@prisma/client";

const schema = z.object({
  attemptId: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { attemptId } = parsed.data;
    const userId = session.user.id;

    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });

    if (!attempt || attempt.userId !== userId) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.completedAt) {
      return NextResponse.json({ error: "Attempt already completed" }, { status: 409 });
    }

    const totalScore = attempt.answers.reduce((sum, a) => sum + a.score, 0);
    const xpEarned = computeXpEarned(totalScore);

    // Update attempt
    await db.attempt.update({
      where: { id: attemptId },
      data: { completedAt: new Date(), totalScore, xpEarned },
    });

    // Update or create UserSport XP
    const userSport = await db.userSport.upsert({
      where: { userId_sport: { userId, sport: attempt.sport as Sport } },
      update: { xpTotal: { increment: xpEarned } },
      create: { userId, sport: attempt.sport as Sport, xpTotal: xpEarned },
    });

    const newXp = userSport.xpTotal;
    const rankInfo = computeRank(newXp);

    // Update rank tier and division
    await db.userSport.update({
      where: { userId_sport: { userId, sport: attempt.sport as Sport } },
      data: { rankTier: rankInfo.tier, division: rankInfo.division },
    });

    return NextResponse.json({
      totalScore,
      xpEarned,
      rank: rankInfo,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
