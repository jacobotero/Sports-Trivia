"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { toast } from "sonner";

const SPORTS = ["MLB", "NFL", "NBA"] as const;
type Sport = (typeof SPORTS)[number];

interface Question {
  id: string;
  sport: Sport;
  prompt: string;
  choices: string[];
  answer: string;
  difficulty: number | null;
}

const SPORT_COLORS: Record<Sport, string> = {
  MLB: "bg-red-500/20 text-red-400 border-red-500/30",
  NFL: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  NBA: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const emptyForm = {
  sport: "MLB" as Sport,
  prompt: "",
  choices: ["", "", "", ""],
  correctIdx: 0,
  difficulty: 3,
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState<Sport | "ALL">("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/questions");
      const data = await res.json();
      setQuestions(data);
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(q: Question) {
    const correctIdx = q.choices.indexOf(q.answer);
    setForm({
      sport: q.sport,
      prompt: q.prompt,
      choices: [...q.choices],
      correctIdx: correctIdx >= 0 ? correctIdx : 0,
      difficulty: q.difficulty ?? 3,
    });
    setEditingId(q.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.prompt.trim()) return toast.error("Question text required");
    if (form.choices.some((c) => !c.trim())) return toast.error("All 4 choices required");

    const payload = {
      sport: form.sport,
      prompt: form.prompt.trim(),
      choices: form.choices.map((c) => c.trim()),
      answer: form.choices[form.correctIdx].trim(),
      difficulty: form.difficulty,
    };

    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/admin/questions/${editingId}` : "/api/admin/questions",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      toast.success(editingId ? "Question updated" : "Question created");
      closeForm();
      fetchQuestions();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, prompt: string) {
    if (!confirm(`Delete: "${prompt.slice(0, 60)}..."?`)) return;
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Deleted");
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  }

  const filtered = sportFilter === "ALL"
    ? questions
    : questions.filter((q) => q.sport === sportFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Questions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{questions.length} total questions</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Question
        </Button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="border-primary/30 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{editingId ? "Edit Question" : "New Question"}</CardTitle>
              <Button variant="ghost" size="sm" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Sport + Difficulty row */}
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sport</label>
                <div className="flex gap-1.5">
                  {SPORTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm((f) => ({ ...f, sport: s }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        form.sport === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Difficulty</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
                      className={`w-8 h-8 rounded-lg text-sm font-medium border transition-all ${
                        form.difficulty === d
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Question prompt */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Question</label>
              <textarea
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                placeholder="Enter the question..."
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Choices */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Answer Choices — click the circle to mark correct
              </label>
              <div className="flex flex-col gap-2">
                {["A", "B", "C", "D"].map((letter, idx) => (
                  <div key={letter} className="flex items-center gap-2">
                    <button
                      onClick={() => setForm((f) => ({ ...f, correctIdx: idx }))}
                      className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        form.correctIdx === idx
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-border text-muted-foreground hover:border-green-500/50"
                      }`}
                      title="Mark as correct answer"
                    >
                      {form.correctIdx === idx ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{letter}</span>}
                    </button>
                    <input
                      type="text"
                      value={form.choices[idx]}
                      onChange={(e) => {
                        const next = [...form.choices];
                        next[idx] = e.target.value;
                        setForm((f) => ({ ...f, choices: next }));
                      }}
                      placeholder={`Choice ${letter}`}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                ))}
              </div>
              {form.choices[form.correctIdx]?.trim() && (
                <p className="text-xs text-green-400 mt-1">
                  ✓ Correct answer: <strong>{form.choices[form.correctIdx]}</strong>
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none sm:px-8">
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Question"}
              </Button>
              <Button variant="outline" onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sport filter */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", ...SPORTS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSportFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              sportFilter === s
                ? "bg-primary/20 border-primary text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {s} {s !== "ALL" && `(${questions.filter((q) => q.sport === s).length})`}
          </button>
        ))}
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          No questions yet.{" "}
          <button onClick={openCreate} className="text-primary underline">Create one</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((q) => (
            <div
              key={q.id}
              className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors"
            >
              <Badge className={`shrink-0 text-xs border ${SPORT_COLORS[q.sport]}`}>
                {q.sport}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug line-clamp-2">{q.prompt}</p>
                <p className="text-xs text-green-400 mt-1">✓ {q.answer}</p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {q.choices.filter((c) => c !== q.answer).map((c) => (
                    <span key={c} className="text-xs text-muted-foreground/70 bg-muted/40 px-1.5 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(q)} className="h-8 w-8 p-0">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(q.id, q.prompt)}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
