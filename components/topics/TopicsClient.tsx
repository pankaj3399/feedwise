"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Compass, Sparkles } from "lucide-react";
import { CardGlyph } from "@/components/feed/CardGlyph";
import { useUser } from "@/components/providers/UserProvider";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export type Topic = {
  slug: string;
  label: string;
  short: string;
  color: string;
  soft: string;
  blurb: string;
  glyph: string;
  count: number;
};

export function TopicsClient({
  topics,
  initialInterests,
}: {
  topics: Topic[];
  initialInterests: string[];
}) {
  const router = useRouter();
  const { stats } = useUser();
  const { toast } = useToast();
  const [selected, setSelected] = useState(() => new Set(initialInterests));
  const [saving, setSaving] = useState(false);

  const initial = [...initialInterests].sort().join("|");
  const current = [...selected].sort().join("|");
  const dirty = initial !== current;

  function toggle(slug: string) {
    const updated = new Set(selected);
    if (updated.has(slug)) updated.delete(slug);
    else updated.add(slug);
    setSelected(updated);
    if (navigator.vibrate) navigator.vibrate(6);
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/interests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: [...selected] }),
      });
      if (!response.ok) throw new Error();
      toast({
        title: selected.size ? "Topics updated" : "Following nothing specific",
        description: selected.size
          ? "Your Following tab just got more interesting."
          : "Your feed will mix everything for now.",
        tone: "success",
      });
      router.refresh();
    } catch {
      toast({ title: "Couldn't save your topics", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <div className="px-5 pb-4 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime">Your syllabus</p>
          <h1 className="mt-1 text-balance font-serif text-[2.35rem] leading-[1.02] tracking-[-0.02em] text-cream">
            Pick a few rabbit holes
          </h1>
          <p className="mt-2 max-w-[420px] text-[12px] leading-relaxed text-muted">
            Topics you follow shape the <span className="text-cream/75">Following</span> tab and nudge your
            main feed. Change your mind whenever.
          </p>
        </div>

        <div className="space-y-2.5 px-4 pb-6">
          {topics.map((topic) => {
            const active = selected.has(topic.slug);
            const mastery = stats.mastery.find((item) => item.category === topic.slug);
            const progress = mastery ? mastery.read / Math.max(1, mastery.total) : 0;
            return (
              <div
                key={topic.slug}
                className={cn(
                  "relative overflow-hidden rounded-2xl border transition-colors",
                  active
                    ? "border-white/20 bg-white/[0.055]"
                    : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14]",
                )}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: active
                      ? `radial-gradient(120% 100% at 100% 0%, ${topic.color}22, transparent 65%)`
                      : `radial-gradient(120% 100% at 100% 0%, ${topic.color}0e, transparent 65%)`,
                  }}
                />
                <CardGlyph glyph={topic.glyph} color={topic.color} />

                <button onClick={() => toggle(topic.slug)} className="relative flex w-full gap-3 p-4 text-left">
                  <span
                    className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl text-[10px] font-semibold"
                    style={{ background: topic.soft, color: topic.color }}
                  >
                    {topic.short.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-medium text-cream">{topic.label}</span>
                      <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-muted">
                        {topic.count}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-muted">{topic.blurb}</span>
                    <span className="mt-2.5 flex items-center gap-2">
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(1.5, progress * 100)}%`,
                            background: topic.color,
                          }}
                        />
                      </span>
                      <span className="shrink-0 text-[9px] text-muted">
                        {mastery?.read ?? 0}/{topic.count}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                      active ? "border-transparent text-ink" : "border-white/15 text-transparent",
                    )}
                    style={active ? { background: topic.color } : undefined}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                </button>

                <div className="relative flex items-center justify-between border-t border-white/[0.06] px-4 py-2">
                  <span className="text-[9px] uppercase tracking-[0.12em] text-muted/70">
                    {active ? "Following" : "Tap to follow"}
                  </span>
                  <Link
                    href={`/feed?topic=${topic.slug}`}
                    className="tap flex items-center gap-1 text-[10px] font-medium text-cream/70 hover:text-cream"
                  >
                    Open feed <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            );
          })}

          <Link
            href="/feed"
            className="tap flex items-center gap-3 rounded-2xl border border-dashed border-white/[0.1] px-4 py-3.5 text-[12px] text-muted hover:border-white/20 hover:text-cream"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-white/[0.04] text-lime">
              <Compass size={16} />
            </span>
            <span className="flex-1">
              <span className="block font-medium text-cream/85">Skip the picking</span>
              <span className="text-[10px]">Let the main feed surprise you instead.</span>
            </span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.06] bg-ink/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-cream">
              {selected.size} {selected.size === 1 ? "topic" : "topics"} followed
            </p>
            <p className="text-[9px] text-muted">
              {selected.size ? "Used by the Following tab and feed ranking." : "Follow at least one to personalise."}
            </p>
          </div>
          {dirty ? (
            <button
              onClick={() => void save()}
              disabled={saving}
              className="tap inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2.5 text-[11px] font-semibold text-ink disabled:opacity-50"
            >
              <Sparkles size={13} /> {saving ? "Saving…" : "Save topics"}
            </button>
          ) : (
            <Link
              href="/feed"
              className="tap inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2.5 text-[11px] font-semibold text-ink"
            >
              Open feed <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
