import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeRank } from "@/lib/rank";
import { FriendStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const friendId = searchParams.get("userId");

    if (!friendId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const userId = session.user.id;

    // Verify they are friends
    const friendship = await db.friendRequest.findFirst({
      where: {
        status: FriendStatus.ACCEPTED,
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Not friends with this user" }, { status: 403 });
    }

    const [mySports, friendSports, friend] = await Promise.all([
      db.userSport.findMany({ where: { userId } }),
      db.userSport.findMany({ where: { userId: friendId } }),
      db.user.findUnique({ where: { id: friendId }, select: { id: true, name: true } }),
    ]);

    const formatSports = (sports: typeof mySports) =>
      sports.map((s) => ({ sport: s.sport, xpTotal: s.xpTotal, rank: computeRank(s.xpTotal) }));

    return NextResponse.json({
      me: { userId, sports: formatSports(mySports) },
      friend: { userId: friendId, name: friend?.name, sports: formatSports(friendSports) },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
