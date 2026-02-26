import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authLimiter, checkRateLimit, getIp } from "@/lib/ratelimit";

const schema = z.object({
  token: z.string(),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  try {
    const limited = await checkRateLimit(authLimiter, getIp(req));
    if (limited) return limited;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const record = await db.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { id: true } } },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      await db.passwordResetToken.delete({ where: { token } });
      return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);

    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      db.passwordResetToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
