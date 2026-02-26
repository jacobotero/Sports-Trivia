import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { count } = await db.attempt.deleteMany({
    where: { date: today },
  });

  return NextResponse.json({ ok: true, deletedAttempts: count, date: today });
}
