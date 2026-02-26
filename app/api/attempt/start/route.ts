import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateDailySet, isValidSport, todayString } from "@/lib/daily";
import { Sport } from "@prisma/client";

const schema = z.object({
  sport: z.enum(["MLB", "NFL", "NBA", "NHL"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { sport, date = todayString() } = parsed.data;
    const userId = session?.user?.id;

    const dailySet = await getOrCreateDailySet(date, sport as Sport);

    // Check for existing completed attempt (logged-in users only)
    if (userId) {
      const existing = await db.attempt.findUnique({
        where: { userId_date_sport: { userId, date, sport: sport as Sport } },
      });

      if (existing?.completedAt) {
        return NextResponse.json(
          { error: "You have already completed this quiz today" },
          { status: 409 }
        );
      }

      // Resume in-progress attempt
      if (existing) {
        const answeredCount = await db.attemptAnswer.count({
          where: { attemptId: existing.id },
        });
        return NextResponse.json({
          attemptId: existing.id,
          dailySetId: dailySet.id,
          resumed: true,
          currentQuestionIndex: answeredCount,
        });
      }

      // Create new attempt
      const attempt = await db.attempt.create({
        data: { userId, dailySetId: dailySet.id, date, sport: sport as Sport },
      });

      return NextResponse.json({
        attemptId: attempt.id,
        dailySetId: dailySet.id,
        resumed: false,
        currentQuestionIndex: 0,
      });
    }

    // Guest: return a guest attempt token (no DB persistence)
    return NextResponse.json({
      attemptId: null,
      dailySetId: dailySet.id,
      resumed: false,
      currentQuestionIndex: 0,
      guest: true,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
