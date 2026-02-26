import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ requestId: z.string() });

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { requestId } = parsed.data;
    const userId = session.user.id;

    const request = await db.friendRequest.findUnique({ where: { id: requestId } });
    if (!request || (request.senderId !== userId && request.receiverId !== userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.friendRequest.delete({ where: { id: requestId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
