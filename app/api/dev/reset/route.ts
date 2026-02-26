import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const today = todayLocal();

  // Delete AttemptAnswers first (child records — no cascade in schema)
  const attempts = await db.attempt.findMany({
    where: { date: today },
    select: { id: true },
  });
  const attemptIds = attempts.map((a) => a.id);
  const { count: deletedAnswers } = await db.attemptAnswer.deleteMany({
    where: { attemptId: { in: attemptIds } },
  });

  // Now delete Attempts
  const { count: deletedAttempts } = await db.attempt.deleteMany({ where: { date: today } });

  // Delete DailySetQuestions then DailySets so they regenerate fresh on next visit
  const dailySets = await db.dailySet.findMany({ where: { date: today } });
  for (const ds of dailySets) {
    await db.dailySetQuestion.deleteMany({ where: { dailySetId: ds.id } });
  }
  const { count: deletedSets } = await db.dailySet.deleteMany({ where: { date: today } });

  return NextResponse.json({ ok: true, deletedAnswers, deletedAttempts, deletedSets, date: today });
}
