"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimerBar } from "@/components/TimerBar";
import { RankBadge } from "@/components/RankBadge";
import { CheckCircle2, XCircle, Trophy, Share2, Play } from "lucide-react";
import { toast } from "sonner";
import { computeRank } from "@/lib/rank";

const TIMER_MS = 10_000;
const BETWEEN_MS = 2_000;

interface Question {
  id: string;
  prompt: string;
  type: "MULTIPLE_CHOICE" | "FILL_BLANK";
  choices: string[];
  order: number;
}

interface QuizRunnerProps {
  sport: string;
  date: string;
  dailySetId: string;
  questions: Question[];
  attemptId: string | null;
  startIndex?: number;
}

interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  score: number;
  correctAnswer: string;
  submittedAnswer: string;
  timeTakenMs: number;
}

type PhaseType = "pre" | "answering" | "between" | "done";

// Circular countdown ring — animates from full to empty over `durationMs`
function CountdownRing({ durationMs, label }: { durationMs: number; label: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg
          className="absolute inset-0 -rotate-90"
          width="112"
          height="112"
          viewBox="0 0 112 112"
        >
          {/* Track */}
          <circle cx="56" cy="56" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
          {/* Animated fill */}
          <circle
            cx="56"
            cy="56"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            className="text-primary"
            strokeDasharray={circ}
            strokeDashoffset={0}
            style={{
              animation: `drainRing ${durationMs}ms linear forwards`,
            }}
          />
        </svg>
        <span className="text-2xl font-black text-foreground z-10">{label}</span>
      </div>
      <style>{`
        @keyframes drainRing {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: ${circ}; }
        }
      `}</style>
    </div>
  );
}

export function QuizRunner({
  sport,
  date,
  questions,
  attemptId: initialAttemptId,
  startIndex = 0,
}: QuizRunnerProps) {
  const { data: session } = useSession();
  const [phase, setPhase] = useState<PhaseType>("pre");
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [nextIdx, setNextIdx] = useState(startIndex);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [finalSummary, setFinalSummary] = useState<{
    totalScore: number;
    xpEarned: number;
    rankXp: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const attemptIdRef = useRef(initialAttemptId);
  const questionStartRef = useRef<number>(0);

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;

  const startQuestion = useCallback(() => {
    setPhase("answering");
    setTimerRunning(true);
    setSelectedChoice(null);
    questionStartRef.current = Date.now();
  }, []);

  // Auto-advance after BETWEEN_MS when in "between" phase
  useEffect(() => {
    if (phase !== "between") return;
    const t = setTimeout(() => {
      setCurrentIdx(nextIdx);
      setSelectedChoice(null);
      questionStartRef.current = Date.now();
      setTimerRunning(true);
      setPhase("answering");
    }, BETWEEN_MS);
    return () => clearTimeout(t);
  }, [phase, nextIdx]);

  const completeQuiz = useCallback(
    async (newResults: QuestionResult[]) => {
      if (session?.user?.id && attemptIdRef.current) {
        try {
          const res = await fetch("/api/attempt/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attemptId: attemptIdRef.current }),
          });
          const data = await res.json();
          if (res.ok) {
            setFinalSummary({
              totalScore: data.totalScore,
              xpEarned: data.xpEarned,
              rankXp: data.rank?.xpTotal ?? 0,
            });
            localStorage.setItem(`sportsdle_played_${date}_${sport}`, "1");
            setPhase("done");
            return;
          }
        } catch {
          // fall through
        }
      }
      const totalScore = newResults.reduce((s, r) => s + r.score, 0);
      localStorage.setItem(`sportsdle_played_${date}_${sport}`, "1");
      setFinalSummary({ totalScore, xpEarned: 0, rankXp: 0 });
      setPhase("done");
    },
    [session, date, sport]
  );

  const submitAnswer = useCallback(
    async (answer: string, expired = false) => {
      if (phase !== "answering" || submitting) return;

      setTimerRunning(false);
      setSubmitting(true);

      const timeTakenMs = expired
        ? TIMER_MS
        : Math.min(Date.now() - questionStartRef.current, TIMER_MS);

      const submittedAnswer = expired ? "" : answer;

      try {
        const res = await fetch("/api/attempt/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: attemptIdRef.current ?? "guest",
            questionId: currentQuestion.id,
            submittedAnswer,
            timeTakenMs,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const result: QuestionResult = {
          questionId: currentQuestion.id,
          isCorrect: data.isCorrect,
          score: data.score,
          correctAnswer: data.correctAnswer,
          submittedAnswer,
          timeTakenMs,
        };

        const newResults = [...results, result];
        setResults(newResults);

        const isLast = currentIdx === totalQuestions - 1;

        if (isLast) {
          await completeQuiz(newResults);
        } else {
          setNextIdx(currentIdx + 1);
          setPhase("between");
        }
      } catch {
        toast.error("Failed to submit answer. Try again.");
        setTimerRunning(true);
      } finally {
        setSubmitting(false);
      }
    },
    [phase, submitting, currentQuestion, results, currentIdx, totalQuestions, completeQuiz]
  );

  const handleTimerExpire = useCallback(() => {
    submitAnswer("", true);
  }, [submitAnswer]);

  const handleChoiceSelect = useCallback(
    (choice: string) => {
      if (phase !== "answering" || submitting) return;
      setSelectedChoice(choice);
      submitAnswer(choice);
    },
    [phase, submitting, submitAnswer]
  );

  const handleShare = useCallback(() => {
    const score = results.reduce((s, r) => s + r.score, 0);
    const correct = results.filter((r) => r.isCorrect).length;
    const emojis = results.map((r) => (r.isCorrect ? "✅" : "❌")).join("");
    const text = `Sportsdle ${sport} — ${date}\n${emojis}\n${correct}/${totalQuestions} correct · ${score} pts\nPlay at sportsdle.app`;
    navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
  }, [results, sport, date, totalQuestions]);

  // ── PRE ───────────────────────────────────────────────────────────────────
  if (phase === "pre") {
    return (
      <div className="flex flex-col items-center gap-6 py-10 px-4">
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-1">
            {totalQuestions} questions · 10 seconds each
          </p>
          <h2 className="text-2xl font-bold">Ready to play?</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Answer fast — speed earns bonus points.
          </p>
        </div>
        <Button size="lg" className="px-10 py-6 text-lg font-bold" onClick={startQuestion}>
          <Play className="h-5 w-5 mr-2" />
          Start Quiz
        </Button>
      </div>
    );
  }

  // ── BETWEEN ───────────────────────────────────────────────────────────────
  if (phase === "between") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 px-4">
        <CountdownRing durationMs={BETWEEN_MS} label={`${nextIdx + 1}`} />
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Next up
          </p>
          <p className="text-xl font-bold mt-1">
            Question {nextIdx + 1} <span className="text-muted-foreground font-normal">of {totalQuestions}</span>
          </p>
        </div>
      </div>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (phase === "done" && finalSummary) {
    const correct = results.filter((r) => r.isCorrect).length;
    const rankInfo = session && finalSummary.rankXp > 0 ? computeRank(finalSummary.rankXp) : null;

    return (
      <div className="flex flex-col items-center gap-5 py-4 max-w-lg mx-auto w-full px-2">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
          <h2 className="text-3xl font-bold">Quiz Complete!</h2>
          <p className="text-muted-foreground mt-1 text-sm">{sport} · {date}</p>
        </div>

        <Card className="w-full">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Score</span>
              <span className="text-2xl font-bold font-mono">
                {finalSummary.totalScore.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Correct</span>
              <span className="font-semibold">{correct} / {totalQuestions}</span>
            </div>
            {session && finalSummary.xpEarned > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">XP Earned</span>
                <span className="font-semibold text-yellow-400">+{finalSummary.xpEarned} XP</span>
              </div>
            )}
            {rankInfo && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Rank</span>
                <RankBadge xpTotal={finalSummary.rankXp} showXp />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Breakdown */}
        <div className="w-full">
          <p className="text-sm font-medium text-muted-foreground mb-2">Question Breakdown</p>
          <div className="flex flex-col gap-2">
            {results.map((r, i) => (
              <div key={r.questionId} className="flex items-start gap-3 text-sm bg-card/50 rounded-lg p-3 border border-border">
                <span className="text-muted-foreground shrink-0 pt-0.5 w-5">{i + 1}.</span>
                {r.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground text-xs line-clamp-2">{questions[i]?.prompt}</p>
                  {!r.isCorrect && (
                    <p className="text-xs mt-1">
                      <span className="text-green-400 font-medium">{r.correctAnswer}</span>
                      {r.submittedAnswer && (
                        <span className="text-muted-foreground ml-2">· you said: {r.submittedAnswer}</span>
                      )}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="font-mono text-xs shrink-0">{r.score}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 w-full pt-1">
          <Button variant="outline" className="flex-1 h-12" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />Share
          </Button>
          <Button className="flex-1 h-12" onClick={() => (window.location.href = "/")}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // ── ANSWERING ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full px-1">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="text-muted-foreground font-medium">
          {currentIdx + 1} <span className="text-muted-foreground/50">/ {totalQuestions}</span>
        </span>
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < currentIdx
                  ? "bg-muted-foreground/40 w-5"
                  : i === currentIdx
                  ? "bg-primary w-7"
                  : "bg-muted w-5"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Timer */}
      <TimerBar
        key={currentIdx}
        durationMs={TIMER_MS}
        running={timerRunning}
        onExpire={handleTimerExpire}
      />

      {/* Question card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 pt-5 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg leading-snug font-semibold">
            {currentQuestion.prompt}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 px-4 sm:px-6 pb-5">
          {currentQuestion.choices.map((choice, idx) => {
            const letter = ["A", "B", "C", "D"][idx];
            const isSelected = selectedChoice === choice;
            return (
              <button
                key={choice}
                onClick={() => handleChoiceSelect(choice)}
                disabled={submitting}
                className={`
                  w-full flex items-center gap-3 rounded-xl border px-4 py-3.5
                  text-left text-sm sm:text-base font-medium
                  transition-all duration-150 min-h-[52px]
                  ${submitting ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-primary/60 hover:bg-primary/5 active:scale-[0.99]"}
                  ${isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground"
                  }
                `}
              >
                <span className={`
                  shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                `}>
                  {letter}
                </span>
                <span className="leading-snug">{choice}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
