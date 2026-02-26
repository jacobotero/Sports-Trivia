"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

type NameStatus = "idle" | "checking" | "available" | "taken";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [nameStatus, setNameStatus] = useState<NameStatus>("idle");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time name availability check
  useEffect(() => {
    const name = form.name.trim();
    if (name.length < 2) {
      setNameStatus("idle");
      return;
    }
    setNameStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/check-name?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        setNameStatus(data.available ? "available" : "taken");
        setErrors((e) => ({
          ...e,
          name: data.available ? undefined : "This display name is already taken",
        }));
      } catch {
        setNameStatus("idle");
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.name]);

  function validate() {
    const e: typeof errors = {};
    if (form.name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (nameStatus === "taken") e.name = "This display name is already taken";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email, password: form.password }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Map server errors back to inline fields
        if (data.error?.toLowerCase().includes("email")) {
          setErrors((e) => ({ ...e, email: data.error }));
        } else if (data.error?.toLowerCase().includes("name")) {
          setErrors((e) => ({ ...e, name: data.error }));
        } else {
          toast.error(data.error ?? "Registration failed");
        }
        return;
      }

      // Redirect to login with a prompt to check email
      router.push("/login?message=check-email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center items-start pt-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Join to track XP &amp; challenge friends</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">

            {/* Display Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Display Name</Label>
              <div className="relative">
                <Input
                  id="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    setErrors((er) => ({ ...er, name: undefined }));
                  }}
                  required
                  minLength={2}
                  className={`pr-9 ${errors.name ? "border-red-500 focus-visible:ring-red-500/30" : nameStatus === "available" ? "border-green-500 focus-visible:ring-green-500/30" : ""}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {nameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {nameStatus === "available" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {nameStatus === "taken" && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              {nameStatus === "available" && !errors.name && (
                <p className="text-xs text-green-500">Display name is available</p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, email: e.target.value }));
                  setErrors((er) => ({ ...er, email: undefined }));
                }}
                required
                className={errors.email ? "border-red-500 focus-visible:ring-red-500/30" : ""}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, password: e.target.value }));
                    setErrors((er) => ({ ...er, password: undefined }));
                  }}
                  required
                  className={`pr-10 ${errors.password ? "border-red-500 focus-visible:ring-red-500/30" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, confirm: e.target.value }));
                    setErrors((er) => ({ ...er, confirm: undefined }));
                  }}
                  required
                  className={`pr-10 ${errors.confirm ? "border-red-500 focus-visible:ring-red-500/30" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
            </div>

          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-6">
            <Button type="submit" className="w-full" disabled={loading || nameStatus === "taken" || nameStatus === "checking"}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Account
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
