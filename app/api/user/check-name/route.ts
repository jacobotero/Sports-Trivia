import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim() ?? "";

  if (name.length < 2) {
    return NextResponse.json({ available: false });
  }

  const existing = await db.user.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
