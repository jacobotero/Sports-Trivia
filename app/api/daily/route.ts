import { NextResponse } from "next/server";
import { getOrCreateDailySet, isValidSport, isValidDate, todayString } from "@/lib/daily";
import { Sport } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sport = (searchParams.get("sport") ?? "").toUpperCase();
    const date = searchParams.get("date") ?? todayString();

    if (!isValidSport(sport)) {
      return NextResponse.json({ error: "Invalid sport" }, { status: 400 });
    }
    if (!isValidDate(date)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const dailySet = await getOrCreateDailySet(date, sport as Sport);

    // Strip answers before sending to client
    const questions = dailySet.questions.map(({ question, order }) => ({
      id: question.id,
      prompt: question.prompt,
      type: question.type,
      choices: question.choices,
      sport: question.sport,
      order,
    }));

    return NextResponse.json({
      dailySetId: dailySet.id,
      date: dailySet.date,
      sport: dailySet.sport,
      questions,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
