"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

const SPORTS = ["MLB", "NFL", "NBA"] as const;
type Sport = (typeof SPORTS)[number];

interface Question {
  id: string;
  sport: Sport;
  prompt: string;
  answer: string;
  difficulty: number | null;
}

const SPORT_COLORS: Record<Sport, string> = {
  MLB: "bg-red-500/20 text-red-400 border-red-500/30",
  NFL: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  NBA: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const QUESTIONS_PER_DAY = 8;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminSchedulePage() {
  const [date, setDate] = useState(todayStr());
  const [sport, setSport] = useState<Sport>("MLB");
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  const fetchQuestions = useCallback(async () => {
    const res = await fetch(`/api/admin/questions?sport=${sport}`);
    const data = await res.json();
    setAllQuestions(data);
  }, [sport]);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    setIsCustom(false);
    try {
      const res = await fetch(`/api/admin/schedule?date=${date}&sport=${sport}`);
      const data = await res.json();
      if (data.dailySet) {
        const ids = data.dailySet.questions.map((q: { question: Question }) => q.question.id);
        setSelectedIds(ids);
        setIsCustom(true);
      }
    } finally {
      setLoading(false);
    }
  }, [date, sport]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);
  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  function toggleQuestion(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= QUESTIONS_PER_DAY) {
        toast.error(`Maximum ${QUESTIONS_PER_DAY} questions per day`);
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleSave() {
    if (selectedIds.length !== QUESTIONS_PER_DAY) {
      toast.error(`Select exactly ${QUESTIONS_PER_DAY} questions (${selectedIds.length} selected)`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, sport, questionIds: selectedIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Schedule saved for ${sport} on ${date}`);
      setIsCustom(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("Remove custom schedule? The day will revert to auto-generated questions.")) return;
    try {
      await fetch(`/api/admin/schedule?date=${date}&sport=${sport}`, { method: "DELETE" });
      toast.success("Custom schedule removed — will auto-generate");
      setSelectedIds([]);
      setIsCustom(false);
    } catch {
      toast.error("Reset failed");
    }
  }

  const filtered = allQuestions.filter(
    (q) => !search || q.prompt.toLowerCase().includes(search.toLowerCase()) || q.answer.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCount = selectedIds.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Pick {QUESTIONS_PER_DAY} questions for a specific date and sport.
        </p>
      </div>

      {/* Date + Sport selector */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sport</label>
            <div className="flex gap-1.5">
              {SPORTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSport(s)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    sport === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {isCustom ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
                Custom schedule saved
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Auto-generated
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-sm font-medium ${selectedCount === QUESTIONS_PER_DAY ? "text-green-400" : "text-muted-foreground"}`}>
          {selectedCount} / {QUESTIONS_PER_DAY} selected
        </span>
        <Button
          onClick={handleSave}
          disabled={saving || selectedCount !== QUESTIONS_PER_DAY}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Schedule"}
        </Button>
        {isCustom && (
          <Button variant="outline" onClick={handleReset} className="gap-2 text-muted-foreground">
            <RotateCcw className="h-4 w-4" />
            Reset to Auto
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedIds([])}
          disabled={selectedCount === 0}
          className="text-muted-foreground ml-auto"
        >
          Clear all
        </Button>
      </div>

      {/* Selected order preview */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id, i) => {
            const q = allQuestions.find((x) => x.id === id);
            return (
              <button
                key={id}
                onClick={() => toggleQuestion(id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
                title="Click to remove"
              >
                <span className="font-bold">{i + 1}.</span>
                <span className="max-w-[160px] truncate">{q?.prompt ?? id}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search questions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />

      {/* Question list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((q) => {
            const isSelected = selectedIds.includes(q.id);
            const selIdx = selectedIds.indexOf(q.id);
            return (
              <button
                key={q.id}
                onClick={() => toggleQuestion(q.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card/50 hover:bg-card hover:border-border/80"
                }`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                }`}>
                  {isSelected ? selIdx + 1 : <Check className="h-3.5 w-3.5 opacity-0" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2">{q.prompt}</p>
                  <p className="text-xs text-green-400 mt-0.5">✓ {q.answer}</p>
                </div>
                <Badge className={`shrink-0 text-xs border ${SPORT_COLORS[q.sport]}`}>
                  {q.sport}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
