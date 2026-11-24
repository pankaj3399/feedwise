"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bookmark,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Download,
  Flame,
  Heart,
  Highlighter,
  LogOut,
  Pencil,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useUser } from "@/components/providers/UserProvider";
import { usePwa } from "@/components/providers/PwaProvider";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { cn } from "@/lib/utils";

const GOALS = [5, 10, 15, 20];

function rankFor(level: number) {
  if (level >= 10) return "Systems Thinker";
  if (level >= 7) return "Deep Diver";
  if (level >= 4) return "Explorer";
  if (level >= 2) return "Curious Reader";
  return "Fresh Start";
}

function heatColor(count: number) {
  if (count <= 0) return "rgba(255,255,255,0.045)";
  if (count < 3) return "rgba(216,255,95,0.22)";
  if (count < 6) return "rgba(216,255,95,0.42)";
  if (count < 10) return "rgba(216,255,95,0.66)";
  return "rgba(216,255,95,0.92)";
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProfileClient() {
  const router = useRouter();
  const { user, stats, patchStats } = useUser();
  const { toast } = useToast();
  const { canInstall, isStandalone, online, install, clearCaches } = usePwa();

  const [name, setName] = useState(user.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [goal, setGoal] = useState(stats.goal);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(user.name ?? "");
  }, [user.name]);

  useEffect(() => {
    setGoal(stats.goal);
  }, [stats.goal]);

  const rank = rankFor(stats.level);
  const goalProgress = goal ? Math.min(1, stats.todayReads / goal) : 0;

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === user.name || savingName) return;
    setSavingName(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) throw new Error();
      toast({ title: "Name updated", tone: "success" });
      router.refresh();
    } catch {
      toast({ title: "Couldn't update your name", tone: "error" });
    } finally {
      setSavingName(false);
    }
  };

  const changeGoal = async (value: number) => {
    if (value === goal) return;
    setGoal(value);
    patchStats((current) => ({
      ...current,
      goal: value,
      goalMet: current.todayReads >= value,
    }));
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyGoal: value }),
      });
      if (!response.ok) throw new Error();
      toast({
        title: `Daily goal set to ${value}`,
        description: value <= stats.todayReads ? "You've already cleared it today." : "Small enough to actually do.",
        tone: "success",
      });
      router.refresh();
    } catch {
      setGoal(stats.goal);
      toast({ title: "Couldn't update your goal", tone: "error" });
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      /* the cookie may already be gone */
    }
    await clearCaches();
    router.replace("/");
    router.refresh();
  };

  const statsGrid = [
    { label: "Day streak", value: stats.streak, icon: Flame, color: "text-orange-400" },
    { label: "Ideas read", value: stats.totalRead, icon: BookOpen, color: "text-lime" },
    { label: "Liked", value: stats.totalLikes, icon: Heart, color: "text-rose-400" },
    { label: "Saved", value: stats.totalSaves, icon: Bookmark, color: "text-cyan-300" },
    { label: "Highlights", value: stats.totalHighlights, icon: Highlighter, color: "text-violet-300" },
    { label: "Quiz wins", value: stats.quizzesCorrect, icon: Brain, color: "text-pink-300" },
  ];

  const weeklyMax = Math.max(...stats.weekly.map((day) => day.count), goal, 1);

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="px-4 pb-28 pt-5">
        <div className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-gradient-to-br from-white/[0.07] via-white/[0.025] to-transparent p-5">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-lime/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <Avatar name={user.name} email={user.email} size={58} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-[26px] leading-tight text-cream">
                {user.name || user.email.split("@")[0]}
              </p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
            <span className="shrink-0 rounded-full border border-lime/25 bg-lime/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-lime">
              Lvl {stats.level}
            </span>
          </div>

          <div className="relative mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="font-serif text-[2.4rem] leading-none tracking-[-0.02em] text-cream">
                {stats.xp.toLocaleString()}
                <span className="ml-1.5 text-[13px] font-sans font-medium tracking-normal text-muted">XP</span>
              </p>
              <p className="mt-1 text-[11px] text-muted">{rank}</p>
            </div>
            <span className="mb-1 flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] text-cream/70">
              <Sparkles size={11} className="text-lime" />
              {stats.goalDays} goal days
            </span>
          </div>

          <div className="relative mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lime/70 to-lime transition-[width] duration-500"
                style={{ width: `${Math.max(2, stats.levelProgress * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted/70">
              <span>
                {stats.xpIntoLevel} / {stats.xpForLevel} XP this level
              </span>
              <span>Level {stats.level + 1} next</span>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {statsGrid.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-3"
              >
                <Icon size={15} className={item.color} />
                <p className="mt-2 font-serif text-[22px] leading-none text-cream">{item.value}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-muted">{item.label}</p>
              </div>
            );
          })}
        </div>

        <Section
          title="Today"
          action={
            <Link href="/quiz" className="flex items-center gap-0.5 text-[10px] font-medium text-lime">
              Daily quiz <ChevronRight size={12} />
            </Link>
          }
        >
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-center gap-4">
              <ProgressRing progress={goalProgress} size={68} stroke={4}>
                <span className="text-[13px] font-semibold text-cream">
                  {Math.round(goalProgress * 100)}%
                </span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[22px] leading-tight text-cream">
                  {stats.todayReads} of {goal} ideas
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  {stats.goalMet
                    ? "Goal cleared. Everything else is a bonus."
                    : `${Math.max(0, goal - stats.todayReads)} more to keep the streak alive.`}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  {GOALS.map((value) => (
                    <button
                      key={value}
                      onClick={() => void changeGoal(value)}
                      className={cn(
                        "tap rounded-full border px-2.5 py-1 text-[10px] font-medium",
                        value === goal
                          ? "border-lime bg-lime text-ink"
                          : "border-white/10 text-muted hover:border-white/20 hover:text-cream",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Last 7 days">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex h-28 items-end gap-2">
              {stats.weekly.map((day, index) => {
                const height = Math.max(4, Math.round((day.count / weeklyMax) * 100));
                const isToday = index === stats.weekly.length - 1;
                return (
                  <div key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-[9px] text-muted/70">{day.count || ""}</span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={cn(
                          "w-full rounded-t-[5px] transition-[height] duration-500",
                          isToday ? "bg-lime" : "bg-lime/35",
                        )}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className={cn("text-[9px]", isToday ? "font-semibold text-cream" : "text-muted")}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-2.5 text-[10px] text-muted">
              <Target size={12} className="text-lime" />
              Goal is {goal} ideas a day · {stats.goalDays} days cleared so far
            </div>
          </div>
        </Section>

        <Section title="Last 28 days">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="grid grid-cols-7 gap-1.5">
              {stats.heatmap.map((day) => (
                <div
                  key={day.day}
                  title={`${day.day} — ${day.count} ${day.count === 1 ? "idea" : "ideas"}`}
                  className="aspect-square rounded-[5px] border border-white/[0.03]"
                  style={{ background: heatColor(day.count) }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[9px] text-muted/70">
              less
              {[0, 2, 5, 8, 12].map((count) => (
                <span
                  key={count}
                  className="size-2.5 rounded-[3px]"
                  style={{ background: heatColor(count) }}
                />
              ))}
              more
            </div>
          </div>
        </Section>

        <Section title="Topic mastery">
          <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            {stats.mastery.map((topic) => (
              <div key={topic.category}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex min-w-0 items-center gap-1.5 text-cream/85">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: topic.color }} />
                    <span className="truncate">{topic.label}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-muted">
                    {topic.read}/{topic.total} · Lv {topic.level}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.max(1.5, (topic.read / Math.max(1, topic.total)) * 100)}%`,
                      background: topic.color,
                    }}
                  />
                </div>
              </div>
            ))}
            <Link
              href="/topics"
              className="tap mt-1 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[11px] text-cream/80"
            >
              Pick more topics
              <ChevronRight size={13} className="text-muted" />
            </Link>
          </div>
        </Section>

        <Section title="Shortcuts">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/highlights"
              className="tap flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"
            >
              <Highlighter size={16} className="text-violet-300" />
              <span className="text-[12px] text-cream/85">Highlights</span>
            </Link>
            <Link
              href="/saved"
              className="tap flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"
            >
              <Bookmark size={16} className="text-cyan-300" />
              <span className="text-[12px] text-cream/85">Collections</span>
            </Link>
          </div>
        </Section>

        <Section title="Account">
          <div className="space-y-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
              Display name
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3">
              <Pencil size={13} className="shrink-0 text-muted" />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveName();
                }}
                maxLength={60}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-[12px] text-cream outline-none"
              />
              <button
                onClick={() => void saveName()}
                disabled={!name.trim() || name.trim() === user.name || savingName}
                className="tap rounded-lg bg-lime px-3 py-1.5 text-[10px] font-semibold text-ink disabled:opacity-30"
              >
                {savingName ? "Saving" : "Save"}
              </button>
            </div>

            <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full",
                  online ? "bg-lime/10 text-lime" : "bg-rose-400/10 text-rose-300",
                )}
              >
                {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-cream/85">{online ? "Online" : "Offline"}</p>
                <p className="text-[10px] text-muted">
                  {online ? "Progress syncs automatically." : "Cached ideas are still readable."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.05] text-cream/70">
                <ShieldCheck size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-cream/85">
                  {isStandalone ? "Installed" : canInstall ? "Ready to install" : "Add to home screen"}
                </p>
                <p className="text-[10px] text-muted">
                  {isStandalone
                    ? "Running as an app. Nice."
                    : canInstall
                      ? "One tap and it lives on your phone."
                      : "iPhone: Share → Add to Home Screen."}
                </p>
              </div>
              {canInstall && !isStandalone ? (
                <button
                  onClick={() => void install()}
                  className="tap flex shrink-0 items-center gap-1 rounded-lg bg-lime px-2.5 py-1.5 text-[10px] font-semibold text-ink"
                >
                  <Download size={12} /> Install
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3">
              <button
                onClick={async () => {
                  await clearCaches();
                  toast({ title: "Cached files cleared", tone: "success" });
                }}
                className="tap flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-muted hover:text-cream"
              >
                <Trash2 size={12} /> Clear cache
              </button>
              <span className="flex items-center gap-1 text-[9px] text-muted/50">
                <Check size={10} /> v1.0
              </span>
            </div>
          </div>
        </Section>

        <button
          onClick={() => void logout()}
          disabled={busy}
          className="tap mt-7 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] py-3 text-[12px] font-medium text-rose-300 disabled:opacity-50"
        >
          <LogOut size={14} /> {busy ? "Signing out…" : "Sign out"}
        </button>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-muted/50">
          Ideas and words by{" "}
          <a
            href="https://arpitbhayani.me/blogs/"
            target="_blank"
            rel="noreferrer"
            className="text-muted underline decoration-white/20 underline-offset-2"
          >
            Arpit Bhayani
          </a>
          .
          <br />
          Feedwise is a personal reading layer, not affiliated with the author.
        </p>
      </div>
    </div>
  );
}
