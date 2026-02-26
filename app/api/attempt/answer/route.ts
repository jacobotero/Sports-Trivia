import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeQuestionScore } from "@/lib/rank";
import { answerLimiter, checkRateLimit, getIp } from "@/lib/ratelimit";

const QUESTION_TIME_LIMIT_MS = 10_000;

const schema = z.object({
  attemptId: z.string(),
  questionId: z.string(),
  submittedAnswer: z.string().max(500),
  timeTakenMs: z.number().int().min(0).max(QUESTION_TIME_LIMIT_MS + 1000),
});

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const limited = await checkRateLimit(answerLimiter, getIp(req));
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { attemptId, questionId, submittedAnswer, timeTakenMs } = parsed.data;

    // Guest scoring — no DB persistence
    if (!session?.user?.id) {
      const question = await db.question.findUnique({ where: { id: questionId } });
      if (!question) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }
      const isCorrect =
        normalizeAnswer(submittedAnswer) === normalizeAnswer(question.answer);
      const remainingSeconds = Math.max(0, (QUESTION_TIME_LIMIT_MS - timeTakenMs) / 1000);
      const score = computeQuestionScore(isCorrect, remainingSeconds);
      return NextResponse.json({ isCorrect, score, correctAnswer: question.answer });
    }

    // Authenticated scoring
    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.completedAt) {
      return NextResponse.json({ error: "Attempt already completed" }, { status: 409 });
    }

    const question = await db.question.findUnique({ where: { id: questionId } });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Prevent double-answering the same question
    const existing = await db.attemptAnswer.findFirst({
      where: { attemptId, questionId },
    });
    if (existing) {
      return NextResponse.json({ error: "Question already answered" }, { status: 409 });
    }

    const isCorrect =
      normalizeAnswer(submittedAnswer) === normalizeAnswer(question.answer);
    const remainingSeconds = Math.max(0, (QUESTION_TIME_LIMIT_MS - timeTakenMs) / 1000);
    const score = computeQuestionScore(isCorrect, remainingSeconds);

    await db.attemptAnswer.create({
      data: {
        attemptId,
        questionId,
        isCorrect,
        timeTakenMs,
        submittedAnswer,
        score,
      },
    });

    return NextResponse.json({ isCorrect, score, correctAnswer: question.answer });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
