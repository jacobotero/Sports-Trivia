export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateDailySet, generateMCChoices, isValidSport, todayString } from "@/lib/daily";
import { Sport } from "@prisma/client";
import { QuizRunner } from "@/components/QuizRunner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";

const SPORT_LABELS: Record<string, string> = {
  mlb: "MLB Baseball",
  nfl: "NFL Football",
  nba: "NBA Basketball",

};

interface PlayPageProps {
  params: Promise<{ sport: string }>;
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { sport: sportParam } = await params;
  const sportKey = sportParam.toUpperCase();

  if (!isValidSport(sportKey)) notFound();

  const sport = sportKey as Sport;
  const date = todayString();

  // Get or create the daily set (server-side, deterministic)
  let dailySet;
  try {
    dailySet = await getOrCreateDailySet(date, sport);
  } catch {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">
          No questions available yet. Check back later!
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const session = await getServerSession(authOptions);
  let attemptId: string | null = null;
  let startIndex = 0;
  let alreadyCompleted = false;

  if (session?.user?.id) {
    const existing = await db.attempt.findUnique({
      where: {
        userId_date_sport: { userId: session.user.id, date, sport },
      },
      include: { answers: true },
    });

    if (existing?.completedAt) {
      alreadyCompleted = true;
    } else if (existing) {
      attemptId = existing.id;
      startIndex = existing.answers.length;
    } else {
      // Create a new attempt server-side
      const newAttempt = await db.attempt.create({
        data: { userId: session.user.id, dailySetId: dailySet.id, date, sport },
      });
      attemptId = newAttempt.id;
    }
  }

  if (alreadyCompleted) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="text-2xl font-bold">Already played today!</h2>
        <p className="text-muted-foreground">
          Come back tomorrow for new {sport} trivia.
        </p>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  // Fetch all answers for this sport to use as MC distractors
  const allSportAnswers = await db.question.findMany({
    where: { sport },
    select: { id: true, answer: true },
  });

  const questions = dailySet.questions.map(({ question, order }) => ({
    id: question.id,
    prompt: question.prompt,
    type: question.type as "MULTIPLE_CHOICE" | "FILL_BLANK",
    choices:
      question.type === "MULTIPLE_CHOICE"
        ? generateMCChoices(
            question.id,
            question.answer,
            allSportAnswers,
            `${date}-${question.id}`
          )
        : [],
    order,
  }));

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Main quiz area */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{SPORT_LABELS[sportParam] ?? sport}</h1>
            <p className="text-muted-foreground text-sm">
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">← Home</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="py-6">
            <QuizRunner
              sport={sportKey}
              date={date}
              dailySetId={dailySet.id}
              questions={questions}
              attemptId={attemptId}
              startIndex={startIndex}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sidebar ad (desktop) */}
      <div className="hidden lg:block w-64 shrink-0">
        <AdSlot slot="sidebar" />
      </div>
    </div>
  );
}
