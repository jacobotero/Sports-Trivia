import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ receiverId: z.string() });

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

    const senderId = session.user.id;
    const { receiverId } = parsed.data;

    if (senderId === receiverId) {
      return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
    }

    const receiver = await db.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await db.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Request already exists" }, { status: 409 });
    }

    const request = await db.friendRequest.create({
      data: { senderId, receiverId },
    });

    return NextResponse.json(request, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
