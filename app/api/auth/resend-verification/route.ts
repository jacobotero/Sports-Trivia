import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { generateToken, hoursFromNow } from "@/lib/tokens";
import { apiLimiter, checkRateLimit, getIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  try {
    const limited = await checkRateLimit(apiLimiter, getIp(req));
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 409 });
    }

    // Delete any existing tokens for this user and create a fresh one
    await db.verificationToken.deleteMany({ where: { userId: user.id } });

    const token = generateToken();
    await db.verificationToken.create({
      data: { userId: user.id, token, expiresAt: hoursFromNow(24) },
    });

    await sendVerificationEmail(user.email, user.name ?? "there", token);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
