import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ name: z.string().min(2).max(50) });

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const trimmed = parsed.data.name.trim();

    const nameTaken = await db.user.findFirst({
      where: {
        name: { equals: trimmed, mode: "insensitive" },
        NOT: { id: session.user.id },
      },
    });
    if (nameTaken) {
      return NextResponse.json({ error: "Display name already taken" }, { status: 409 });
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { name: trimmed },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
