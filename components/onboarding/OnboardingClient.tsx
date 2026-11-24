"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Brain, Check, Flame, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/Toast";
import type { Topic } from "@/components/topics/TopicsClient";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const GOALS = [
  { value: 5, label: "A sip", note: "Two minutes" },
  { value: 10, label: "Steady", note: "The sweet spot" },
  { value: 15, label: "Ambitious", note: "A real habit" },
  { value: 20, label: "Unhinged", note: "You'll learn a lot" },
];

export function OnboardingClient({
  user,
  topics,
  initialInterests,
  ideas,
  essays,
}: {
  user: User;
  topics: Topic[];
  initialInterests: string[];
  ideas: string;
  essays: string;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user.name ?? "");
  const [goal, setGoal] = useState(user.dailyGoal || 10);
  const [selected, setSelected] = useState(() => new Set(initialInterests));
  const [saving, setSaving] = useState(false);

  const firstName = name.trim().split(/\s+/)[0];

  function toggle(slug: string) {
    const updated = new Set(selected);
    if (updated.has(slug)) updated.delete(slug);
    else updated.add(slug);
    setSelected(updated);
    if (navigator.vibrate) navigator.vibrate(6);
  }

  async function finish() {
    setSaving(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const profile = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          dailyGoal: goal,
          onboarded: true,
          timezone: timezone || undefined,
        }),
      });
      if (!profile.ok) throw new Error("Could not save your profile");
      const interests = await fetch("/api/interests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: [...selected] }),
      });
      if (!interests.ok) throw new Error("Could not save your topics");
      window.location.assign("/feed");
    } catch (error) {
      toast({
        title: "Couldn't finish setup",
        description: error instanceof Error ? error.message : undefined,
        tone: "error",
      });
      setSaving(false);
    }
  }

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-[640px] flex-col overflow-hidden border-x border-white/[0.055] bg-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(90%_100%_at_50%_0%,rgba(216,255,95,0.08),transparent_70%)]" />

      <header className="relative flex h-[62px] shrink-0 items-center px-5">
        <Logo />
        <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
          Step {step + 1} of 3
        </span>
      </header>

      <div className="relative flex shrink-0 items-center gap-1.5 px-5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              index <= step ? "bg-lime" : "bg-white/[0.08]",
            )}
          />
        ))}
      </div>

      <main className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-7">
        {step === 0 ? (
          <div key="step-0" className="animate-fade-up">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime">First, a promise</p>
            <h1 className="mt-2 text-balance font-serif text-[2.65rem] leading-[1.0] tracking-[-0.02em] text-cream">
              Small enough to keep on a bad day.
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Feedwise replaces the reflex scroll with a few ideas worth keeping. Pick a pace you can
              actually hold.
            </p>

            <label className="mt-7 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              What should we call you?
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              placeholder="Your name"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[14px] text-cream outline-none placeholder:text-muted/50 focus:border-lime/40"
            />

            <label className="mt-6 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Ideas per day
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {GOALS.map((option) => {
                const active = goal === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setGoal(option.value)}
                    className={cn(
                      "tap rounded-2xl border p-3.5 text-left transition-colors",
                      active
                        ? "border-lime bg-lime/10"
                        : "border-white/[0.08] bg-white/[0.025] hover:border-white/20",
                    )}
                  >
                    <span className="flex items-baseline gap-1.5">
                      <span className={cn("font-serif text-[26px] leading-none", active ? "text-lime" : "text-cream")}>
                        {option.value}
                      </span>
                      <span className="text-[10px] text-muted">ideas</span>
                    </span>
                    <span className="mt-1.5 block text-[12px] font-medium text-cream/85">{option.label}</span>
                    <span className="block text-[10px] text-muted">{option.note}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted/60">
              You can change this anytime. Missing a day never erases what you've read.
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div key="step-1" className="animate-fade-up">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime">Your syllabus</p>
            <h1 className="mt-2 text-balance font-serif text-[2.65rem] leading-[1.0] tracking-[-0.02em] text-cream">
              What pulls you in?
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Follow a few topics to shape the <span className="text-cream/80">Following</span> tab and nudge
              your main feed. Pick nothing and we'll mix it all.
            </p>

            <div className="mt-5 space-y-2">
              {topics.map((topic) => {
                const active = selected.has(topic.slug);
                return (
                  <button
                    key={topic.slug}
                    onClick={() => toggle(topic.slug)}
                    className={cn(
                      "tap flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                      active
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-white/[0.07] bg-white/[0.02] hover:border-white/15",
                    )}
                  >
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-[10px] font-semibold"
                      style={{ background: topic.soft, color: topic.color }}
                    >
                      {topic.short.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-cream">{topic.label}</span>
                        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-muted">
                          {topic.count}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted">{topic.blurb}</span>
                    </span>
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                        active ? "border-transparent text-ink" : "border-white/15 text-transparent",
                      )}
                      style={active ? { background: topic.color } : undefined}
                    >
                      <Check size={13} strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-[10px] text-muted/60">
              {selected.size
                ? `${selected.size} ${selected.size === 1 ? "topic" : "topics"} followed`
                : "No topics yet — the main feed still works."}
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div key="step-2" className="animate-fade-up">
            <div className="mt-2 flex flex-col items-center text-center">
              <span className="grid size-20 place-items-center rounded-[28px] bg-lime text-ink shadow-[0_0_60px_rgba(216,255,95,0.28)]">
                <Check size={38} strokeWidth={2.6} />
              </span>
              <h1 className="mt-6 text-balance font-serif text-[2.8rem] leading-[0.98] tracking-[-0.02em] text-cream">
                You're set{firstName ? `, ${firstName}` : ""}.
              </h1>
              <p className="mt-3 max-w-[320px] text-[13px] leading-relaxed text-muted">
                Your feed is tuned. Read a few ideas, keep the ones that stick, and let the streak take
                care of itself.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { value: ideas, label: "ideas" },
                { value: essays, label: "essays" },
                { value: String(goal), label: "per day" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] py-3 text-center">
                  <p className="font-serif text-[22px] leading-none text-cream">{item.value}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              {[
                { icon: Sparkles, color: "text-lime", title: "An endless feed of atomic ideas", body: "One insight per card, no 20-minute commitment." },
                { icon: Flame, color: "text-orange-400", title: "Streaks and daily goals", body: "Progress that rewards showing up, not bingeing." },
                { icon: Brain, color: "text-pink-300", title: "Recall quizzes", body: "Turn passive reading into something that sticks." },
                { icon: Bookmark, color: "text-cyan-300", title: "Saved ideas and collections", body: "File the good stuff for future you." },
                { icon: BookOpen, color: "text-violet-300", title: "Works offline", body: "Install it once and read on the train." },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.05]">
                      <Icon size={14} className={feature.color} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-medium text-cream/90">{feature.title}</span>
                      <span className="block text-[10px] leading-relaxed text-muted">{feature.body}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-center text-[10px] leading-relaxed text-muted/50">
              Ideas and words by{" "}
              <a
                href="https://arpitbhayani.me/blogs/"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/20 underline-offset-2"
              >
                Arpit Bhayani
              </a>
              . Feedwise is a personal reading layer, not affiliated with the author.
            </p>
          </div>
        ) : null}
      </main>

      <footer className="relative flex shrink-0 items-center gap-2 border-t border-white/[0.06] bg-ink/95 px-4 py-3 pb-safe backdrop-blur-xl">
        {step > 0 ? (
          <button
            onClick={() => setStep(step - 1)}
            disabled={saving}
            className="tap grid size-11 shrink-0 place-items-center rounded-full border border-white/10 text-muted hover:text-cream disabled:opacity-40"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
        <button
          onClick={() => {
            if (step < 2) setStep(step + 1);
            else void finish();
          }}
          disabled={saving || (step === 0 && !name.trim())}
          className="tap flex flex-1 items-center justify-center gap-2 rounded-full bg-lime py-3.5 text-[13px] font-semibold text-ink disabled:opacity-40"
        >
          {saving ? "Setting things up…" : step === 2 ? "Start my feed" : "Continue"}
          {!saving ? <ArrowRight size={15} /> : null}
        </button>
      </footer>
    </div>
  );
}
