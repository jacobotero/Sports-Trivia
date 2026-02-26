"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimerBar } from "@/components/TimerBar";
import { CheckCircle2, XCircle, Trophy, Share2, Play } from "lucide-react";
import { toast } from "sonner";

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

// ── Countdown ring ────────────────────────────────────────────────────────────
function CountdownRing({
  durationMs,
  nextQNum,
  total,
}: {
  durationMs: number;
  nextQNum: number;
  total: number;
}) {
  const r = 52;
  const circ = +(2 * Math.PI * r).toFixed(2);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Ring */}
      <div className="relative" style={{ width: 140, height: 140 }}>
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full opacity-20 blur-xl"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        />
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="absolute inset-0 -rotate-90"
        >
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx="70" cy="70" r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-white/8"
          />
          {/* Draining arc */}
          <circle
            cx="70" cy="70" r={r}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={0}
            className="animate-drain-ring"
            style={{
              "--ring-circ": circ,
              "--ring-duration": `${durationMs}ms`,
            } as React.CSSProperties}
          />
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-white leading-none">{nextQNum}</span>
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mt-0.5">
            of {total}
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-semibold">
          Next Question
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
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
  const [submitting, setSubmitting] = useState(false);
  const [finalSummary, setFinalSummary] = useState<{
    totalScore: number;
    xpEarned: number;
  } | null>(null);
  const attemptIdRef = useRef(initialAttemptId);
  const questionStartRef = useRef<number>(0);

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;

  // Auto-advance from "between" after BETWEEN_MS
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

  const startQuestion = useCallback(() => {
    setPhase("answering");
    setTimerRunning(true);
    setSelectedChoice(null);
    questionStartRef.current = Date.now();
  }, []);

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
            });
            localStorage.setItem(`sportsdle_played_${date}_${sport}`, "1");
            setPhase("done");
            return;
          }
        } catch { /* fall through */ }
      }
      const totalScore = newResults.reduce((s, r) => s + r.score, 0);
      localStorage.setItem(`sportsdle_played_${date}_${sport}`, "1");
      setFinalSummary({ totalScore, xpEarned: 0 });
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

      try {
        const res = await fetch("/api/attempt/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: attemptIdRef.current ?? "guest",
            questionId: currentQuestion.id,
            submittedAnswer: expired ? "" : answer,
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
          submittedAnswer: expired ? "" : answer,
          timeTakenMs,
        };

        const newResults = [...results, result];
        setResults(newResults);

        if (currentIdx === totalQuestions - 1) {
          await completeQuiz(newResults);
        } else {
          setNextIdx(currentIdx + 1);
          setPhase("between");
        }
      } catch {
        toast.error("Failed to submit. Try again.");
        setTimerRunning(true);
        setSelectedChoice(null);
      } finally {
        setSubmitting(false);
      }
    },
    [phase, submitting, currentQuestion, results, currentIdx, totalQuestions, completeQuiz]
  );

  const handleTimerExpire = useCallback(() => submitAnswer("", true), [submitAnswer]);

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
      <div className="animate-in fade-in duration-400 flex flex-col items-center gap-7 py-12 px-4">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">
            {sport} · {totalQuestions} Questions
          </p>
          <h2 className="text-3xl font-black">Ready?</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Each question has 10 seconds. Faster answers earn more points.
          </p>
        </div>
        <Button
          size="lg"
          onClick={startQuestion}
          className="animate-pop-in px-12 py-6 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all duration-200"
        >
          <Play className="h-5 w-5 mr-2" />
          Start Quiz
        </Button>
      </div>
    );
  }

  // ── BETWEEN ───────────────────────────────────────────────────────────────
  if (phase === "between") {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-300 flex items-center justify-center py-12 px-4">
        <CountdownRing
          durationMs={BETWEEN_MS}
          nextQNum={nextIdx + 1}
          total={totalQuestions}
        />
      </div>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (phase === "done" && finalSummary) {
    const correct = results.filter((r) => r.isCorrect).length;
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center gap-5 py-4 max-w-lg mx-auto w-full px-2">
        <div className="text-center animate-pop-in">
          <Trophy className="h-14 w-14 text-yellow-400 mx-auto mb-3 drop-shadow-[0_0_16px_rgba(250,204,21,0.5)]" />
          <h2 className="text-3xl font-black">Quiz Complete!</h2>
          <p className="text-muted-foreground mt-1 text-sm">{sport} · {date}</p>
        </div>

        <Card className="w-full shadow-xl border-border/50">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Score</span>
              <span className="text-2xl font-black font-mono tabular-nums">
                {finalSummary.totalScore.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Correct</span>
              <span className="font-bold">{correct} / {totalQuestions}</span>
            </div>
            {session && finalSummary.xpEarned > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">XP Earned</span>
                <span className="font-bold text-yellow-400">+{finalSummary.xpEarned} XP</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Breakdown */}
        <div className="w-full">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Breakdown</p>
          <div className="flex flex-col gap-2">
            {results.map((r, i) => (
              <div
                key={r.questionId}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both flex items-start gap-3 text-sm bg-card/60 rounded-xl p-3 border border-border/50"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="text-muted-foreground/60 shrink-0 pt-0.5 w-4 text-xs font-mono">{i + 1}</span>
                {r.isCorrect
                  ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  : <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">{questions[i]?.prompt}</p>
                  {!r.isCorrect && (
                    <p className="text-xs mt-1 flex gap-2 flex-wrap">
                      <span className="text-green-400 font-semibold">{r.correctAnswer}</span>
                      {r.submittedAnswer && (
                        <span className="text-muted-foreground/60">you: {r.submittedAnswer}</span>
                      )}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="font-mono text-xs shrink-0 tabular-nums">{r.score}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1 h-12 hover:scale-[1.02] transition-transform" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />Share
          </Button>
          <Button className="flex-1 h-12 hover:scale-[1.02] transition-transform" onClick={() => (window.location.href = "/")}>
            Home
          </Button>
        </div>
      </div>
    );
  }

  // ── ANSWERING ─────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-300 flex flex-col gap-4 w-full px-1">
      {/* Progress dots */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="text-muted-foreground font-semibold tabular-nums">
          {currentIdx + 1}
          <span className="text-muted-foreground/40 font-normal"> / {totalQuestions}</span>
        </span>
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i < currentIdx
                  ? "bg-primary/30 w-5"
                  : i === currentIdx
                  ? "bg-primary w-8"
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

      {/* Question card — remounts per question so animation always fires */}
      <Card
        key={`q-${currentIdx}`}
        className="animate-in fade-in slide-in-from-bottom-3 duration-350 shadow-md border-border/60"
      >
        <CardHeader className="pb-2 pt-5 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg leading-snug font-semibold">
            {currentQuestion.prompt}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 px-4 sm:px-6 pb-5">
          {currentQuestion.choices.map((choice, idx) => {
            const letter = ["A", "B", "C", "D"][idx];
            const isSelected = selectedChoice === choice;
            const isLocked = submitting;
            const isOther = isLocked && !isSelected;

            return (
              <button
                key={choice}
                onClick={() => handleChoiceSelect(choice)}
                disabled={isLocked}
                className={[
                  // Base
                  "animate-in fade-in slide-in-from-bottom-2 fill-mode-both",
                  "w-full flex items-center gap-3 rounded-xl border px-4 py-3.5",
                  "text-left text-sm sm:text-base font-medium",
                  "transition-all duration-200 min-h-[54px]",
                  // Hover / active (when not locked)
                  !isLocked && "hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer",
                  // Selected + submitting: pulse glow
                  isSelected && "border-primary bg-primary/12 scale-[1.01]",
                  isSelected && isLocked && "animate-glow-pulse",
                  // Other choices fade out while waiting
                  isOther && "opacity-35 cursor-not-allowed",
                  // Default unselected
                  !isSelected && "border-border bg-card cursor-pointer",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ animationDelay: `${idx * 55}ms` }}
              >
                <span
                  className={[
                    "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200",
                    isSelected
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-muted/60 text-muted-foreground",
                  ].join(" ")}
                >
                  {letter}
                </span>
                <span className="leading-snug">{choice}</span>

                {/* Submitting spinner on selected */}
                {isSelected && isLocked && (
                  <span className="ml-auto shrink-0">
                    <svg className="animate-spin h-4 w-4 text-primary/60" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
