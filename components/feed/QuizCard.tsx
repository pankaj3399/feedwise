"use client";

import { useState } from "react";
import { ArrowRight, Brain, Check, Sparkles, X } from "lucide-react";
import type { Article, Quiz } from "@/lib/types";
import { categoryOf } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { InlineSnippet, RichText } from "@/components/content/RichText";

const LETTERS = ["A", "B", "C", "D"];

export function QuizCard({
  quiz,
  article,
  onAnswered,
  onNext,
}: {
  quiz: Quiz;
  article: Article;
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const category = categoryOf(article.category);
  const correct = selected === quiz.answer;

  function choose(index: number) {
    if (selected !== null) return;
    setSelected(index);
    onAnswered(index === quiz.answer);
    if (index === quiz.answer && navigator.vibrate) navigator.vibrate(18);
  }

  return (
    <section className="relative flex h-full snap-start flex-col overflow-hidden px-5 pb-5 pt-5">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 100% 0%, ${category.color}18, transparent 62%)`,
        }}
      />
      <div className="relative flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-lime">
        <span className="grid size-7 place-items-center rounded-full bg-lime/12 text-lime">
          <Brain size={14} />
        </span>
        Quick recall
        <span className="ml-auto flex items-center gap-1 text-muted">
          <Sparkles size={11} /> +15 XP
        </span>
      </div>

      <div className="relative mt-5 shrink-0">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{article.title}</p>
        <h2 className="mt-2 text-balance font-serif text-[clamp(1.7rem,6.4vw,2.4rem)] leading-[1.05] text-cream">
          {quiz.question.split("_____").map((part, index, all) => (
            <span key={index}>
              <RichText text={part} />
              {index < all.length - 1 ? (
                <span className="mx-1 inline-block min-w-14 rounded-md border-b-2 border-lime/60 bg-lime/10 px-1 text-center text-lime">
                  ?
                </span>
              ) : null}
            </span>
          ))}
        </h2>
      </div>

      <div className="relative mt-5 flex min-h-0 flex-1 flex-col justify-center gap-2.5">
        {quiz.options.map((option, index) => {
          const isAnswer = index === quiz.answer;
          const isSelected = index === selected;
          const revealed = selected !== null;
          return (
            <button
              key={index}
              onClick={() => choose(index)}
              disabled={revealed}
              className={cn(
                "tap flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-[13px] transition-all",
                !revealed && "border-white/10 bg-white/[0.035] text-cream/85 hover:border-white/25 hover:bg-white/[0.06]",
                revealed && isAnswer && "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
                revealed && isSelected && !isAnswer && "border-rose-400/40 bg-rose-400/10 text-rose-200",
                revealed && !isAnswer && !isSelected && "border-white/[0.05] bg-white/[0.015] text-muted/60",
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                  !revealed && "border-white/15 text-muted",
                  revealed && isAnswer && "border-emerald-400/50 bg-emerald-400/15 text-emerald-200",
                  revealed && isSelected && !isAnswer && "border-rose-400/50 bg-rose-400/15 text-rose-200",
                  revealed && !isAnswer && !isSelected && "border-white/10 text-muted/50",
                )}
              >
                {revealed && isAnswer ? <Check size={12} /> : revealed && isSelected ? <X size={12} /> : LETTERS[index]}
              </span>
              <span className="min-w-0 flex-1 break-words"><InlineSnippet text={option} mono /></span>
            </button>
          );
        })}
      </div>

      {selected !== null ? (
        <div className="animate-rise relative mt-4 shrink-0 rounded-2xl border border-white/10 bg-black/25 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lime">
            {correct ? "Nailed it" : "Not quite — here's the line"}
          </p>
          <p className="mt-1.5 line-clamp-4 text-[12px] leading-relaxed text-cream/70"><RichText text={quiz.explanation} /></p>
          <button
            onClick={onNext}
            className="tap mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-lime py-2.5 text-[12px] font-semibold text-ink"
          >
            Keep scrolling <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <p className="relative mt-4 shrink-0 text-center text-[10px] text-muted/60">
          Pulled from something you just read.
        </p>
      )}
    </section>
  );
}
