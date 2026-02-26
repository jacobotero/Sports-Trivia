export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateDailySet, generateMCChoices, isValidSport, todayString } from "@/lib/daily";
import { computeXpEarned } from "@/lib/rank";
import { Sport } from "@prisma/client";
import { QuizRunner } from "@/components/QuizRunner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { SetPlayedFlag } from "@/components/SetPlayedFlag";

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
  let alreadyCompleted = false;

  if (session?.user?.id) {
    const userId = session.user.id;
    const existing = await db.attempt.findUnique({
      where: { userId_date_sport: { userId, date, sport } },
      include: { answers: true },
    });

    if (existing?.completedAt) {
      alreadyCompleted = true;
    } else if (existing && existing.answers.length > 0) {
      // User abandoned mid-quiz — auto-complete with partial score, no resume
      const totalScore = existing.answers.reduce((sum, a) => sum + a.score, 0);
      const xpEarned = computeXpEarned(totalScore);
      const answeredCount = existing.answers.length;
      const totalQuestions = dailySet.questions.length;

      await db.attempt.update({
        where: { id: existing.id },
        data: { completedAt: new Date(), totalScore, xpEarned },
      });

      await db.userSport.upsert({
        where: { userId_sport: { userId, sport } },
        update: { xpTotal: { increment: xpEarned } },
        create: { userId, sport, xpTotal: xpEarned },
      });

      return (
        <div className="flex flex-col items-center gap-4 py-16 text-center max-w-sm mx-auto">
          <SetPlayedFlag date={date} sport={sportKey} />
          <div className="text-4xl">⚠️</div>
          <h2 className="text-2xl font-bold">Quiz Forfeited</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You left mid-quiz. Only {answeredCount} of {totalQuestions} questions were answered —
            the rest counted as 0.
          </p>
          <div className="w-full rounded-xl border border-border bg-card/50 p-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Score</span>
              <span className="font-mono font-bold">{totalScore.toLocaleString()} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Questions answered</span>
              <span className="font-bold">{answeredCount} / {totalQuestions}</span>
            </div>
            {xpEarned > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">XP earned</span>
                <span className="font-bold text-yellow-400">+{xpEarned} XP</span>
              </div>
            )}
          </div>
          <Button asChild className="w-full">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      );
    } else if (existing) {
      // Visited the page but answered nothing — allow playing
      attemptId = existing.id;
    } else {
      // First visit — create attempt
      const newAttempt = await db.attempt.create({
        data: { userId, dailySetId: dailySet.id, date, sport },
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
              startIndex={0}
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
