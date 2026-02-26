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

  // Delete attempts first
  const { count: deletedAttempts } = await db.attempt.deleteMany({ where: { date: today } });

  // Delete daily sets so they regenerate fresh (MC-only) on next visit
  const dailySets = await db.dailySet.findMany({ where: { date: today } });
  for (const ds of dailySets) {
    await db.dailySetQuestion.deleteMany({ where: { dailySetId: ds.id } });
  }
  const { count: deletedSets } = await db.dailySet.deleteMany({ where: { date: today } });

  return NextResponse.json({ ok: true, deletedAttempts, deletedSets, date: today });
}
