"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, TriangleAlert } from "lucide-react";

export function ProfileActions({ currentName }: { currentName: string }) {
  const { update } = useSession();
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        await update({ name: name.trim() });
        toast.success("Display name updated!");
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update name");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!resetArmed) {
      setResetArmed(true);
      setTimeout(() => setResetArmed(false), 5000);
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/user/reset", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("All data cleared. Signing you out...");
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sportsdle_played_"))
        .forEach((k) => localStorage.removeItem(k));
      setTimeout(() => signOut({ callbackUrl: "/" }), 1500);
    } catch {
      toast.error("Reset failed. Try again.");
      setResetting(false);
      setResetArmed(false);
    }
  }

  return (
    <>
      <Separator />

      {/* Display name */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Display Name</CardTitle>
          <CardDescription>How other players see you on leaderboards.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              maxLength={50}
              minLength={2}
              className="flex-1"
            />
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-red-400">
            <TriangleAlert className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently deletes all game history and XP. Your account stays active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className={`transition-all duration-200 ${
              resetArmed
                ? "border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "border-red-500/30 text-red-400/70 hover:border-red-500/60 hover:text-red-400"
            }`}
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting...</>
            ) : resetArmed ? (
              "Click again to confirm reset"
            ) : (
              "Reset All Data"
            )}
          </Button>
          {resetArmed && (
            <p className="text-xs text-red-400/70 mt-2">
              This cannot be undone. Click again to confirm.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
