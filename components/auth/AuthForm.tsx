"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function AuthForm({ mode, ideas = "1,125" }: { mode: "login" | "signup"; ideas?: string }) {
  const signup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: signup ? "signup" : "login",
          email,
          password,
          name: signup ? name.trim() || undefined : undefined,
          timezone,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Something went wrong.");
      window.location.assign(payload.user?.onboarded ? "/feed" : "/onboarding");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <Logo />

      <h1 className="mt-9 text-balance font-serif text-[2.7rem] leading-[0.98] tracking-[-0.02em] text-cream">
        {signup ? "Start scrolling wiser." : "Welcome back."}
      </h1>
      <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
        {signup
          ? `One account, ${ideas} ideas worth keeping. No feed algorithm trying to make you angry.`
          : "Your streak, saved ideas, and half-finished rabbit holes are right where you left them."}
      </p>

      <form onSubmit={submit} className="mt-7 space-y-2.5">
        {signup ? (
          <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 focus-within:border-lime/40">
            <User size={15} className="shrink-0 text-muted" />
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name (optional)"
              autoComplete="name"
              maxLength={60}
              className="min-w-0 flex-1 bg-transparent py-3 text-[13px] text-cream outline-none placeholder:text-muted/50"
            />
          </label>
        ) : null}

        <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 focus-within:border-lime/40">
          <Mail size={15} className="shrink-0 text-muted" />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
            className="min-w-0 flex-1 bg-transparent py-3 text-[13px] text-cream outline-none placeholder:text-muted/50"
          />
        </label>

        <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 focus-within:border-lime/40">
          <Lock size={15} className="shrink-0 text-muted" />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder={signup ? "At least 8 characters" : "Your password"}
            autoComplete={signup ? "new-password" : "current-password"}
            className="min-w-0 flex-1 bg-transparent py-3 text-[13px] text-cream outline-none placeholder:text-muted/50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="shrink-0 text-muted hover:text-cream"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </label>

        {error ? (
          <div className="animate-fade-in flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-400/[0.07] px-3 py-2.5">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-300" />
            <p className="text-[11px] leading-relaxed text-rose-200">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-3.5 text-[13px] font-semibold text-ink disabled:opacity-60"
        >
          {loading ? "One moment…" : signup ? "Create my account" : "Sign in"}
          {!loading ? <ArrowRight size={15} /> : null}
        </button>
      </form>

      <p className="mt-4 text-center text-[11px] text-muted">
        {signup ? "Already reading here? " : "New to Feedwise? "}
        <Link
          href={signup ? "/login" : "/signup"}
          className="font-medium text-lime underline decoration-lime/30 underline-offset-2"
        >
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </p>

      <div className="mt-8 flex items-start gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
        <Sparkles size={15} className="mt-0.5 shrink-0 text-lime" />
        <p className="text-[10px] leading-relaxed text-muted">
          Every idea links back to the original essay by{" "}
          <a
            href="https://arpitbhayani.me/blogs/"
            target="_blank"
            rel="noreferrer"
            className="text-cream/70 underline decoration-white/20 underline-offset-2"
          >
            Arpit Bhayani
          </a>
          . Feedwise is a personal reading layer, not affiliated with the author.
        </p>
      </div>
    </div>
  );
}
