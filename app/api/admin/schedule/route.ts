import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/db";

const saveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sport: z.enum(["MLB", "NFL", "NBA", "NHL"]),
  questionIds: z.array(z.string()).min(1).max(20),
});

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const sport = searchParams.get("sport") as "MLB" | "NFL" | "NBA" | "NHL" | null;

  if (!date || !sport) {
    return NextResponse.json({ error: "date and sport required" }, { status: 400 });
  }

  const dailySet = await db.dailySet.findUnique({
    where: { date_sport: { date, sport } },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: true },
      },
    },
  });

  return NextResponse.json({ dailySet });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { date, sport, questionIds } = parsed.data;

  const existing = await db.dailySet.findUnique({
    where: { date_sport: { date, sport } },
  });

  if (existing) {
    // Replace questions in existing daily set
    await db.dailySetQuestion.deleteMany({ where: { dailySetId: existing.id } });
    await db.dailySetQuestion.createMany({
      data: questionIds.map((qId, idx) => ({
        dailySetId: existing.id,
        questionId: qId,
        order: idx,
      })),
    });
    return NextResponse.json({ ok: true, dailySetId: existing.id });
  }

  // Create new daily set
  const dailySet = await db.dailySet.create({
    data: {
      date,
      sport,
      questions: {
        create: questionIds.map((qId, idx) => ({
          questionId: qId,
          order: idx,
        })),
      },
    },
  });

  return NextResponse.json({ ok: true, dailySetId: dailySet.id });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const sport = searchParams.get("sport") as "MLB" | "NFL" | "NBA" | "NHL" | null;

  if (!date || !sport) {
    return NextResponse.json({ error: "date and sport required" }, { status: 400 });
  }

  const existing = await db.dailySet.findUnique({
    where: { date_sport: { date, sport } },
  });

  if (existing) {
    await db.dailySetQuestion.deleteMany({ where: { dailySetId: existing.id } });
    await db.dailySet.delete({ where: { id: existing.id } });
  }

  return NextResponse.json({ ok: true });
}
