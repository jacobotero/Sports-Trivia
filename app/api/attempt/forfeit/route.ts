import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeXpEarned } from "@/lib/rank";
import { Sport } from "@prisma/client";

const schema = z.object({
  attemptId: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { attemptId } = parsed.data;
    const userId = session.user.id;

    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });

    if (!attempt || attempt.userId !== userId) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    // Already completed — idempotent
    if (attempt.completedAt) {
      return NextResponse.json({ ok: true });
    }

    // No answers — they never started, leave attempt open so they can retry
    if (attempt.answers.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const totalScore = attempt.answers.reduce((sum, a) => sum + a.score, 0);
    const xpEarned = computeXpEarned(totalScore);

    await db.attempt.update({
      where: { id: attemptId },
      data: { completedAt: new Date(), totalScore, xpEarned },
    });

    await db.userSport.upsert({
      where: { userId_sport: { userId, sport: attempt.sport as Sport } },
      update: { xpTotal: { increment: xpEarned } },
      create: { userId, sport: attempt.sport as Sport, xpTotal: xpEarned },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
