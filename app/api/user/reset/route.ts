import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete AttemptAnswers first (FK constraint)
    const attempts = await db.attempt.findMany({
      where: { userId },
      select: { id: true },
    });
    const attemptIds = attempts.map((a) => a.id);

    await db.attemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
    await db.attempt.deleteMany({ where: { userId } });
    await db.userSport.deleteMany({ where: { userId } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
