import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { FriendStatus } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const userId = session.user.id;

    const [sent, received] = await Promise.all([
      db.friendRequest.findMany({
        where: { senderId: userId },
        include: { receiver: { select: { id: true, name: true, email: true } } },
      }),
      db.friendRequest.findMany({
        where: { receiverId: userId },
        include: { sender: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    const friends = [
      ...sent
        .filter((r) => r.status === FriendStatus.ACCEPTED)
        .map((r) => ({ requestId: r.id, user: r.receiver, status: r.status })),
      ...received
        .filter((r) => r.status === FriendStatus.ACCEPTED)
        .map((r) => ({ requestId: r.id, user: r.sender, status: r.status })),
    ];

    const pendingIncoming = received
      .filter((r) => r.status === FriendStatus.PENDING)
      .map((r) => ({ requestId: r.id, user: r.sender, status: r.status }));

    const pendingOutgoing = sent
      .filter((r) => r.status === FriendStatus.PENDING)
      .map((r) => ({ requestId: r.id, user: r.receiver, status: r.status }));

    return NextResponse.json({ friends, pendingIncoming, pendingOutgoing });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
