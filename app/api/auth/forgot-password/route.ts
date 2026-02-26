import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { generateToken, hoursFromNow } from "@/lib/tokens";
import { authLimiter, checkRateLimit, getIp } from "@/lib/ratelimit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    // Strict rate limit — prevent email enumeration abuse
    const limited = await checkRateLimit(authLimiter, getIp(req));
    if (limited) return limited;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();

    // Always return the same response — don't reveal if email exists
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      // Delete any existing reset tokens and issue a fresh one
      await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

      const token = generateToken();
      await db.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt: hoursFromNow(1) },
      });

      await sendPasswordResetEmail(user.email, user.name ?? "there", token);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
