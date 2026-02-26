import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  sport: z.enum(["MLB", "NFL", "NBA", "NHL"]).optional(),
  prompt: z.string().min(5).optional(),
  choices: z.array(z.string().min(1)).length(4).optional(),
  answer: z.string().min(1).optional(),
  difficulty: z.number().int().min(1).max(5).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const data = parsed.data;

  // If both choices and answer provided, validate
  if (data.choices && data.answer && !data.choices.includes(data.answer)) {
    return NextResponse.json({ error: "Answer must be one of the 4 choices" }, { status: 400 });
  }

  const question = await db.question.update({
    where: { id },
    data,
  });

  return NextResponse.json(question);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await db.question.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
