import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/db";

const createSchema = z.object({
  sport: z.enum(["MLB", "NFL", "NBA", "NHL"]),
  prompt: z.string().min(5),
  choices: z.array(z.string().min(1)).length(4),
  answer: z.string().min(1),
  difficulty: z.number().int().min(1).max(5).optional(),
});

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport");

  const questions = await db.question.findMany({
    where: sport ? { sport: sport as "MLB" | "NFL" | "NBA" | "NHL" } : undefined,
    orderBy: [{ sport: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(questions);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { sport, prompt, choices, answer, difficulty } = parsed.data;

  // Validate answer is one of the choices
  if (!choices.includes(answer)) {
    return NextResponse.json({ error: "Answer must be one of the 4 choices" }, { status: 400 });
  }

  const question = await db.question.create({
    data: {
      sport,
      type: "MULTIPLE_CHOICE",
      prompt,
      choices,
      answer,
      difficulty: difficulty ?? null,
      tags: [],
    },
  });

  return NextResponse.json(question, { status: 201 });
}
