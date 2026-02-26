import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/verify-email?error=missing", req.url));
    }

    const record = await db.verificationToken.findUnique({ where: { token } });

    if (!record) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url));
    }

    if (record.expiresAt < new Date()) {
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.redirect(new URL("/verify-email?error=expired", req.url));
    }

    // Mark user as verified and delete the token in one transaction
    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      }),
      db.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.redirect(new URL("/verify-email?success=1", req.url));
  } catch {
    return NextResponse.redirect(new URL("/verify-email?error=unknown", req.url));
  }
}
