"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Brain,
  Check,
  ChevronLeft,
  Flame,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import type { Article, Quiz } from "@/lib/types";
import { categoryOf } from "@/lib/categories";
import { cn, longDate } from "@/lib/utils";
import { useUser } from "@/components/providers/UserProvider";
import { useToast } from "@/components/ui/Toast";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { InlineSnippet, RichText, isMathSnippet } from "@/components/content/RichText";

const LETTERS = ["A", "B", "C", "D"];

function BlankQuestion({ text }: { text: string }) {
  const parts = text.split("_____");
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          <RichText text={part} />
          {index < parts.length - 1 ? (
            <span className="mx-1 inline-flex min-w-14 items-center justify-center rounded-md border-b-2 border-lime/60 bg-lime/10 px-2 py-0.5 align-baseline font-sans text-[0.72em] text-lime">
              ?
            </span>
          ) : null}
        </span>
      ))}
    </>
  );
}

export function QuizClient({
  quizzes,
  articles,
  attempts,
  today,
}: {
  quizzes: Quiz[];
  articles: Record<string, Article>;
  attempts: { quiz_id: string; correct: boolean }[];
  today: string;
}) {
  const { stats, patchStats } = useUser();
  const { toast } = useToast();

  const initialCorrect = useMemo(
    () => new Set(attempts.filter((attempt) => attempt.correct).map((attempt) => attempt.quiz_id)),
    [attempts],
  );

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const [earned, setEarned] = useState(0);
  const awarded = useRef(new Set(initialCorrect));

  const current = quizzes[index];
  const total = quizzes.length;
  const score = quizzes.filter((quiz) => picked[quiz.id] === quiz.answer).length;
  const pickedIndex = current ? picked[current.id] : undefined;
  const revealed = pickedIndex !== undefined;
  const isCorrect = current ? pickedIndex === current.answer : false;
  const article = current ? articles[current.article] : undefined;
  const category = article ? categoryOf(article.category) : null;

  function choose(option: number) {
    if (!current || picked[current.id] !== undefined) return;
    const correct = option === current.answer;
    setPicked((previous) => ({ ...previous, [current.id]: option }));

    fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: current.id, correct }),
    }).catch(() => {});

    if (correct && !awarded.current.has(current.id)) {
      awarded.current.add(current.id);
      setEarned((value) => value + 15);
      patchStats((statsNow) => ({
        ...statsNow,
        quizzesCorrect: statsNow.quizzesCorrect + 1,
        xp: statsNow.xp + 15,
      }));
      if (navigator.vibrate) navigator.vibrate(14);
    } else if (!correct && navigator.vibrate) {
      navigator.vibrate([10, 40, 10]);
    }
  }

  function next() {
    if (index < total - 1) {
      setIndex(index + 1);
      return;
    }
    setFinished(true);
    const finalScore = quizzes.filter((quiz) => picked[quiz.id] === quiz.answer).length;
    if (finalScore >= Math.ceil(total * 0.6)) {
      void (async () => {
        try {
          const confetti = (await import("canvas-confetti")).default;
          confetti({
            particleCount: 110,
            spread: 80,
            origin: { y: 0.7 },
            colors: ["#D8FF5F", "#A78BFA", "#22D3EE", "#F472B6", "#FBBF24"],
            scalar: 0.9,
          });
        } catch {
          /* optional */
        }
      })();
    }
    toast({
      title: finalScore === total ? "Flawless recall" : "Daily quiz done",
      description: `${finalScore} of ${total} correct${earned ? ` · +${earned} XP` : ""}.`,
      tone: finalScore >= Math.ceil(total * 0.6) ? "success" : "default",
      duration: 4600,
    });
  }

  if (!total) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-lime/10 text-lime">
          <Brain size={26} />
        </span>
        <h1 className="mt-5 font-serif text-4xl text-cream">No quiz today</h1>
        <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted">
          Read a few ideas and come back — questions are built from the essays.
        </p>
        <Link
          href="/feed"
          className="tap mt-6 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-[12px] font-semibold text-ink"
        >
          Back to feed <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  if (finished) {
    const ratio = score / total;
    const headline =
      ratio === 1
        ? "Flawless recall."
        : ratio >= 0.7
          ? "That stuck."
          : ratio >= 0.4
            ? "Half remembered."
            : "Worth another look.";
    return (
      <div className="h-full overflow-y-auto no-scrollbar">
        <div className="px-5 pb-28 pt-6">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-lime">
            Daily recall · {longDate(today)}
          </p>
          <h1 className="mt-2 text-center font-serif text-[2.5rem] leading-none tracking-[-0.02em] text-cream">
            {headline}
          </h1>

          <div className="mt-7 flex flex-col items-center">
            <ProgressRing progress={ratio} size={128} stroke={6}>
              <span className="text-center">
                <span className="block font-serif text-[34px] leading-none text-cream">{score}</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted">of {total}</span>
              </span>
            </ProgressRing>
            <div className="mt-4 flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full border border-lime/25 bg-lime/10 px-3 py-1.5 text-[11px] font-medium text-lime">
                <Sparkles size={12} /> +{earned} XP this round
              </span>
              <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-muted">
                <Flame size={12} className="text-orange-400" /> {stats.streak} day streak
              </span>
            </div>
          </div>

          <div className="mt-7 space-y-2">
            {quizzes.map((quiz, quizIndex) => {
              const choice = picked[quiz.id];
              const gotIt = choice === quiz.answer;
              return (
                <div
                  key={quiz.id}
                  className={cn(
                    "rounded-2xl border p-3.5",
                    gotIt
                      ? "border-emerald-400/20 bg-emerald-400/[0.05]"
                      : "border-rose-400/20 bg-rose-400/[0.05]",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                        gotIt ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300",
                      )}
                    >
                      {gotIt ? <Check size={11} /> : <X size={11} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] leading-relaxed text-cream/75">
                        <RichText text={quiz.question.replace("_____", quiz.options[quiz.answer])} />
                      </p>
                      {!gotIt ? (
                        <p className="mt-1 text-[10px] text-muted">
                          You picked{" "}
                          <span className="text-rose-300">
                            {choice !== undefined ? <InlineSnippet text={quiz.options[choice]} /> : "—"}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[9px] text-muted/60">Q{quizIndex + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-2">
            <Link
              href="/feed"
              className="tap flex flex-1 items-center justify-center gap-1.5 rounded-full bg-lime py-3 text-[12px] font-semibold text-ink"
            >
              Back to the feed <ArrowRight size={14} />
            </Link>
            <Link
              href="/highlights"
              className="tap flex items-center justify-center gap-1.5 rounded-full border border-white/10 px-4 py-3 text-[12px] text-cream/80"
            >
              Highlights
            </Link>
          </div>
          <p className="mt-4 text-center text-[10px] text-muted/60">
            A fresh set is waiting tomorrow. XP is only awarded the first time you get a question right.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/[0.055] px-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-lime/12 text-lime">
            <Brain size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-cream">Daily recall</p>
            <p className="text-[9px] uppercase tracking-[0.12em] text-muted">{longDate(today)}</p>
          </div>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted">
            {index + 1} / {total}
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-lime transition-[width] duration-300"
            style={{ width: `${((index + (revealed ? 1 : 0)) / total) * 100}%` }}
          />
        </div>
        {initialCorrect.size > 0 ? (
          <p className="mt-2 flex items-center gap-1 text-[9px] text-muted/70">
            <Trophy size={10} className="text-lime/70" />
            {initialCorrect.size} of today's questions already answered — XP only counts once.
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 pb-6 pt-4">
          <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: category
                  ? `radial-gradient(120% 90% at 100% 0%, ${category.color}16, transparent 65%)`
                  : undefined,
              }}
            />
            <div className="relative flex flex-wrap items-center gap-2 text-[9px] font-medium uppercase tracking-[0.12em]">
              {category ? (
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{ color: category.color, background: category.soft }}
                >
                  {category.short}
                </span>
              ) : null}
              <span className="min-w-0 truncate text-muted">{article?.title}</span>
            </div>

            <h1 className="relative mt-3 text-balance font-serif text-[clamp(1.55rem,5.8vw,2.15rem)] leading-[1.22] tracking-[-0.01em] text-cream">
              <BlankQuestion text={current.question} />
            </h1>

            <div className="relative mt-5 space-y-2">
              {current.options.map((option, optionIndex) => {
                const isAnswer = optionIndex === current.answer;
                const isPicked = optionIndex === pickedIndex;
                return (
                  <button
                    key={optionIndex}
                    onClick={() => choose(optionIndex)}
                    disabled={revealed}
                    className={cn(
                      "tap flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                      !revealed &&
                        "border-white/10 bg-black/20 text-cream/85 hover:border-white/25 hover:bg-white/[0.05]",
                      revealed && isAnswer && "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
                      revealed && isPicked && !isAnswer && "border-rose-400/40 bg-rose-400/10 text-rose-200",
                      revealed &&
                        !isAnswer &&
                        !isPicked &&
                        "border-white/[0.05] bg-white/[0.015] text-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                        !revealed && "border-white/15 text-muted",
                        revealed && isAnswer && "border-emerald-400/50 bg-emerald-400/15 text-emerald-200",
                        revealed && isPicked && !isAnswer && "border-rose-400/50 bg-rose-400/15 text-rose-200",
                        revealed && !isAnswer && !isPicked && "border-white/10 text-muted/50",
                      )}
                    >
                      {revealed && isAnswer ? (
                        <Check size={12} />
                      ) : revealed && isPicked ? (
                        <X size={12} />
                      ) : (
                        LETTERS[optionIndex]
                      )}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 break-words text-[13px]",
                        current.kind === "code" && !isMathSnippet(option) && "font-mono text-[12px]",
                      )}
                    >
                      <InlineSnippet text={option} mono={current.kind === "code"} />
                    </span>
                  </button>
                );
              })}
            </div>

            {revealed ? (
              <div className="animate-rise relative mt-4">
                <div
                  className={cn(
                    "rounded-xl border p-3.5",
                    isCorrect ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-rose-400/25 bg-rose-400/[0.06]",
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-semibold tracking-[0.14em]",
                      isCorrect ? "uppercase text-emerald-300" : "text-rose-300",
                    )}
                  >
                    {isCorrect ? (
                      "Correct"
                    ) : (
                      <>
                        Answer:{" "}
                        <span className="tracking-normal text-rose-200">
                          <InlineSnippet text={current.options[current.answer]} />
                        </span>
                      </>
                    )}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-cream/65">
                    <RichText text={current.explanation} />
                  </p>
                </div>
                <button
                  onClick={next}
                  className="tap mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-lime py-3 text-[12px] font-semibold text-ink"
                >
                  {index < total - 1 ? "Next question" : "See results"} <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <p className="relative mt-4 text-center text-[10px] text-muted/60">
                Built from the essays in your feed. No pressure.
              </p>
            )}
          </section>

          <div className="mt-3 flex items-center justify-between px-1">
            <Link href="/feed" className="flex items-center gap-1 text-[10px] text-muted hover:text-cream">
              <ChevronLeft size={12} /> Back to feed
            </Link>
            <span className="text-[10px] text-muted/60">
              {score} correct so far · {earned} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
