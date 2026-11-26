"use client";

import { useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Layers } from "lucide-react";
import type { Article, Idea } from "@/lib/types";
import { categoryOf } from "@/lib/categories";
import { insightTypeOf } from "@/lib/insightTypes";
import { cn, readingTime, relativeDate } from "@/lib/utils";
import { Blocks } from "./Blocks";

export function ExplainerReader({
  article,
  ideas,
  onClose,
  onOpenCard,
  onSource,
}: {
  article: Article;
  ideas: Idea[];
  onClose: () => void;
  onOpenCard: (idea: Idea) => void;
  onSource: () => void;
}) {
  const category = categoryOf(article.category);
  const ordered = useMemo(
    () => [...ideas].sort((a, b) => a.part - b.part || a.id.localeCompare(b.id)),
    [ideas],
  );
  const totalWords = ordered.reduce((n, idea) => n + idea.words, 0);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function jump(id: string) {
    document.getElementById(`explainer-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-ink">
      <header className="z-20 flex h-[60px] shrink-0 items-center gap-2 border-b border-white/[0.06] bg-ink/95 px-3 backdrop-blur-xl">
        <button
          onClick={onClose}
          aria-label="Close explainer"
          className="tap grid size-9 place-items-center rounded-full text-cream hover:bg-white/5"
        >
          <ArrowLeft size={20} />
        </button>
        <span
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em]"
          style={{ color: category.color, background: category.soft }}
        >
          <span className="size-1.5 rounded-full" style={{ background: category.color }} />
          {category.short}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
          Explainer
        </span>
        <button
          onClick={onSource}
          aria-label="Open the original essay"
          className="tap ml-auto grid size-9 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-cream"
        >
          <ArrowUpRight size={18} />
        </button>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 pb-32 pt-7">
        <div className="mx-auto max-w-[680px]">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
            {ordered.length} cards · {readingTime(totalWords)} min · {relativeDate(article.date)}
          </p>
          <h1 className="mt-3 text-balance font-serif text-[clamp(2.2rem,9vw,3.6rem)] leading-[0.98] tracking-[-0.02em] text-cream">
            {article.title}
          </h1>
          <p className="mt-3 text-[12px] text-muted">
            {category.label} · a guided explainer from Arpit Bhayani&apos;s essay
          </p>

          <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Inside this explainer
            </p>
            <div className="mt-3 space-y-1">
              {ordered.map((idea, index) => {
                const type = insightTypeOf(idea.type);
                return (
                  <button
                    key={idea.id}
                    onClick={() => jump(idea.id)}
                    className="tap flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.04]"
                  >
                    <span className="w-4 shrink-0 text-[9px] tabular-nums text-muted/60">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-cream/80">
                      {idea.title}
                    </span>
                    {type ? (
                      <span
                        className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.1em]"
                        style={{ color: type.color }}
                      >
                        {type.label}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2">
            {ordered.map((idea) => {
              const type = insightTypeOf(idea.type);
              const isAction = idea.type === "action";
              const howLabel =
                idea.type === "result"
                  ? "How it was done"
                  : idea.type === "action"
                    ? "How to do it"
                    : "How to apply it";

              return (
                <section
                  key={idea.id}
                  id={`explainer-${idea.id}`}
                  className="scroll-mt-6 border-b border-white/[0.07] py-9 last:border-none"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em]">
                    {type ? <span style={{ color: type.color }}>{type.label}</span> : null}
                    <span className="text-white/15">/</span>
                    <span className="text-muted">
                      {idea.part} of {idea.parts}
                    </span>
                  </div>

                  <h2 className="mt-2 text-balance font-serif text-[clamp(1.75rem,6.5vw,2.55rem)] leading-[1.03] tracking-[-0.015em] text-cream">
                    {idea.title}
                  </h2>

                  {idea.takeaway ? (
                    <p className="mt-3 border-l-2 border-lime/40 pl-3.5 text-[13px] leading-relaxed text-cream/70">
                      <span className="font-semibold text-lime/90">Why it matters · </span>
                      {idea.takeaway}
                    </p>
                  ) : null}

                  <div className="mt-5 select-text">
                    <Blocks blocks={idea.blocks} variant={isAction ? "action" : "default"} />
                  </div>

                  {idea.type === "primer" && idea.terms?.length ? (
                    <div className="mt-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime/80">
                        Terms you need
                      </p>
                      <div className="mt-3 space-y-3">
                        {idea.terms.map((term) => (
                          <div
                            key={term.term}
                            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5"
                          >
                            <p className="text-[13px] font-semibold text-cream">{term.term}</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-cream/75">
                              {term.definition}
                            </p>
                            {term.why ? (
                              <p className="mt-1.5 text-[11px] leading-relaxed text-lime/70">
                                Why it matters: {term.why}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {idea.type === "primer" && idea.arc?.length ? (
                    <div className="mt-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                        What you&apos;ll learn
                      </p>
                      <ol className="mt-3 space-y-2.5">
                        {idea.arc.map((step, index) => (
                          <li
                            key={`${idea.id}-arc-${index}`}
                            className="flex gap-3 text-[13px] leading-relaxed text-cream/75"
                          >
                            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-muted">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {idea.how ? (
                    <section className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime/80">
                        {howLabel}
                      </p>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-cream/75">{idea.how}</p>
                    </section>
                  ) : null}

                  {idea.steps?.length ? (
                    <div className="mt-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                        Try it yourself
                      </p>
                      <ol className="mt-3 space-y-2.5">
                        {idea.steps.map((step, index) => (
                          <li
                            key={`${idea.id}-step-${index}`}
                            className="flex gap-3 text-[13.5px] leading-relaxed text-cream/75"
                          >
                            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-lime/10 text-[10px] font-semibold text-lime">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      onClick={() => onOpenCard(idea)}
                      className="tap inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-medium text-cream/70 hover:bg-white/[0.06]"
                    >
                      <Layers size={11} /> Open as a card <ArrowRight size={11} />
                    </button>
                  </div>
                </section>
              );
            })}
          </div>

          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-colors hover:bg-white/[0.06]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime text-ink">
              <ArrowUpRight size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-medium text-cream">Read the original essay</span>
              <span className="mt-0.5 block truncate text-[11px] text-muted">{article.title}</span>
            </span>
          </a>

          <p className={cn("mt-8 text-center text-[10px] leading-relaxed text-muted/60")}>
            Ideas and underlying essays by Arpit Bhayani.
            <br />
            Feedwise is a personal reading layer, not affiliated with the author.
          </p>
        </div>
      </div>
    </div>
  );
}
