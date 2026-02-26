import { Sport } from "@prisma/client";
import { db } from "./db";

const QUESTIONS_PER_DAY = 8;

/**
 * Simple deterministic hash so the same date+sport always picks the same questions.
 * This is a pure function (no DB calls) so it works without a cron job.
 */
function deterministicShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }

  for (let i = copy.length - 1; i > 0; i--) {
    hash = Math.abs((hash * 1664525 + 1013904223) | 0);
    const j = hash % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

/**
 * Gets or creates a DailySet for the given date + sport.
 * If it already exists in DB, returns it. Otherwise creates one deterministically.
 */
export async function getOrCreateDailySet(date: string, sport: Sport) {
  const existing = await db.dailySet.findUnique({
    where: { date_sport: { date, sport } },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: true },
      },
    },
  });

  if (existing) return existing;

  // Fetch all MC questions for this sport (fill-blank removed from gameplay)
  const allQuestions = await db.question.findMany({
    where: { sport, type: "MULTIPLE_CHOICE" },
  });

  if (allQuestions.length < QUESTIONS_PER_DAY) {
    throw new Error(
      `Not enough questions for sport ${sport}. Need ${QUESTIONS_PER_DAY}, have ${allQuestions.length}.`
    );
  }

  const seed = `${date}-${sport}`;
  const shuffled = deterministicShuffle(allQuestions, seed);
  const selected = shuffled.slice(0, QUESTIONS_PER_DAY);

  const dailySet = await db.dailySet.create({
    data: {
      date,
      sport,
      questions: {
        create: selected.map((q, idx) => ({
          questionId: q.id,
          order: idx,
        })),
      },
    },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: true },
      },
    },
  });

  return dailySet;
}

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isValidSport(s: string): s is Sport {
  return ["MLB", "NFL", "NBA"].includes(s);
}

export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * Generates 4 shuffled answer choices for a MC question:
 * the correct answer + 3 distinct distractors drawn from other questions.
 * Deterministic: same date+questionId always produces the same choices.
 */
export function generateMCChoices(
  questionId: string,
  correctAnswer: string,
  allAnswers: { id: string; answer: string }[],
  seed: string
): string[] {
  const distractors = allAnswers
    .filter(
      (q) =>
        q.id !== questionId &&
        q.answer.toLowerCase() !== correctAnswer.toLowerCase()
    )
    .map((q) => q.answer);

  const shuffled = deterministicShuffle(distractors, `${seed}-d`);
  const picked = shuffled.slice(0, 3);
  return deterministicShuffle([correctAnswer, ...picked], `${seed}-o`);
}
