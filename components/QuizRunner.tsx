"use client";

import { useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimerBar } from "@/components/TimerBar";
import { RankBadge } from "@/components/RankBadge";
import { CheckCircle2, XCircle, Trophy, Share2, Play } from "lucide-react";
import { toast } from "sonner";
import { computeRank } from "@/lib/rank";

const TIMER_MS = 10_000;

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

type PhaseType = "pre" | "answering" | "done";

export function QuizRunner({
  sport,
  date,
  dailySetId,
  questions,
  attemptId: initialAttemptId,
  startIndex = 0,
}: QuizRunnerProps) {
  const { data: session } = useSession();
  const [phase, setPhase] = useState<PhaseType>("pre");
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [fillAnswer, setFillAnswer] = useState("");
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
    setFillAnswer("");
    setSelectedChoice(null);
    questionStartRef.current = Date.now();
  }, []);

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
          // Complete the attempt
          if (session?.user?.id && attemptIdRef.current) {
            try {
              const completeRes = await fetch("/api/attempt/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attemptId: attemptIdRef.current }),
              });
              const completeData = await completeRes.json();
              if (completeRes.ok) {
                setFinalSummary({
                  totalScore: completeData.totalScore,
                  xpEarned: completeData.xpEarned,
                  rankXp: completeData.rank?.xpTotal ?? 0,
                });
                localStorage.setItem(`sportsdle_played_${date}_${sport}`, "1");
                setPhase("done");
                return;
              }
            } catch {
              // fall through to guest done
            }
          }
          // Guest or fallback
          const totalScore = newResults.reduce((s, r) => s + r.score, 0);
          localStorage.setItem(`sportsdle_played_${date}_${sport}`, "1");
          setFinalSummary({ totalScore, xpEarned: 0, rankXp: 0 });
          setPhase("done");
        } else {
          setCurrentIdx((i) => i + 1);
          setPhase("pre");
        }
      } catch {
        toast.error("Failed to submit answer. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [phase, submitting, currentQuestion, results, currentIdx, totalQuestions, session, date, sport]
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

  const handleFillSubmit = useCallback(() => {
    if (!fillAnswer.trim() || phase !== "answering") return;
    submitAnswer(fillAnswer.trim());
  }, [fillAnswer, phase, submitAnswer]);

  const handleShare = useCallback(() => {
    const score = results.reduce((s, r) => s + r.score, 0);
    const correct = results.filter((r) => r.isCorrect).length;
    const emojis = results.map((r) => (r.isCorrect ? "✅" : "❌")).join("");

    const text = `Sportsdle ${sport} — ${date}\n${emojis}\n${correct}/${totalQuestions} correct · ${score} pts\nPlay at sportsdle.app`;
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard!"));
  }, [results, sport, date, totalQuestions]);

  // ── PRE-QUESTION ──────────────────────────────────────────────────────────
  if (phase === "pre") {
    const isFirst = currentIdx === startIndex;
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-1">
            Question {currentIdx + 1} of {totalQuestions}
          </p>
          <h2 className="text-2xl font-bold">
            {isFirst ? "Ready to play?" : "Next question ready"}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            You have 10 seconds per question. Your score depends on speed.
          </p>
        </div>
        <Button size="lg" className="px-8 font-bold" onClick={startQuestion}>
          <Play className="h-5 w-5 mr-2" />
          {isFirst ? "Start Quiz" : "Next Question"}
        </Button>
      </div>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (phase === "done" && finalSummary) {
    const correct = results.filter((r) => r.isCorrect).length;
    const rankInfo = session && finalSummary.rankXp > 0 ? computeRank(finalSummary.rankXp) : null;

    return (
      <div className="flex flex-col items-center gap-6 py-6 max-w-lg mx-auto w-full">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-3xl font-bold">Quiz Complete!</h2>
          <p className="text-muted-foreground mt-1">
            {sport} · {date}
          </p>
        </div>

        <Card className="w-full">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Score</span>
              <span className="text-2xl font-bold font-mono">
                {finalSummary.totalScore.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Correct</span>
              <span className="font-semibold">
                {correct} / {totalQuestions}
              </span>
            </div>
            {session && finalSummary.xpEarned > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">XP Earned</span>
                <span className="font-semibold text-yellow-400">
                  +{finalSummary.xpEarned} XP
                </span>
              </div>
            )}
            {rankInfo && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Rank</span>
                <RankBadge xpTotal={finalSummary.rankXp} showXp />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-question breakdown */}
        <div className="w-full">
          <p className="text-sm font-medium text-muted-foreground mb-2">Breakdown</p>
          <div className="flex flex-col gap-2">
            {results.map((r, i) => (
              <div key={r.questionId} className="flex items-start gap-3 text-sm">
                <span className="text-muted-foreground w-4 shrink-0 pt-0.5">{i + 1}.</span>
                {r.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground truncate">{questions[i]?.prompt}</p>
                  {!r.isCorrect && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Answer: <strong className="text-foreground">{r.correctAnswer}</strong>
                      {r.submittedAnswer && (
                        <span className="ml-2 text-red-400">You: {r.submittedAnswer}</span>
                      )}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {r.score}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button className="flex-1" onClick={() => (window.location.href = "/")}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // ── ANSWERING ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Question {currentIdx + 1} of {totalQuestions}
        </span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full ${
                i < currentIdx
                  ? "bg-muted-foreground/40"
                  : i === currentIdx
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Timer */}
      <TimerBar
        durationMs={TIMER_MS}
        running={timerRunning}
        onExpire={handleTimerExpire}
      />

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-relaxed">
            {currentQuestion.prompt}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {currentQuestion.type === "MULTIPLE_CHOICE" ? (
            <div className="grid gap-2">
              {currentQuestion.choices.map((choice) => {
                const isSelected = selectedChoice === choice;

                return (
                  <Button
                    key={choice}
                    variant="outline"
                    className={`justify-start h-auto py-3 px-4 text-left whitespace-normal ${
                      isSelected ? "border-primary bg-primary/10" : ""
                    }`}
                    onClick={() => handleChoiceSelect(choice)}
                    disabled={submitting}
                  >
                    <span className="text-sm">{choice}</span>
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Type your answer..."
                value={fillAnswer}
                onChange={(e) => setFillAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFillSubmit()}
                disabled={submitting}
              />
              <Button
                onClick={handleFillSubmit}
                disabled={!fillAnswer.trim() || submitting}
              >
                Submit
              </Button>
            </div>
          )}

          {submitting && (
            <p className="text-xs text-muted-foreground text-center animate-pulse">
              Submitting...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
