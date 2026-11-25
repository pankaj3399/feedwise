"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Heart,
  Highlighter,
  MoreHorizontal,
} from "lucide-react";
import type { Article, Idea } from "@/lib/types";
import { categoryOf } from "@/lib/categories";
import { insightTypeOf } from "@/lib/insightTypes";
import { cn, readingTime, relativeDate } from "@/lib/utils";
import { Blocks } from "./Blocks";
import { CardGlyph } from "./CardGlyph";

function ActionButton({
  icon: Icon,
  label,
  active,
  onClick,
  activeClass,
}: {
  icon: typeof Heart;
  label: string;
  active?: boolean;
  onClick: () => void;
  activeClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className="tap flex min-w-[54px] flex-col items-center gap-1 rounded-xl py-1 text-muted hover:text-cream"
    >
      <Icon
        size={21}
        strokeWidth={active ? 2.2 : 1.8}
        className={cn("transition-all duration-200", active && activeClass)}
      />
      <span className={cn("text-[9px] font-medium tracking-wide", active && "text-cream/80")}>{label}</span>
    </button>
  );
}

export function FeedCard({
  idea,
  article,
  liked,
  saved,
  onLike,
  onSave,
  onOpen,
  onSource,
  onMore,
  showHint = false,
}: {
  idea: Idea;
  article: Article;
  liked: boolean;
  saved: boolean;
  onLike: (force?: boolean) => void;
  onSave: () => void;
  onOpen: () => void;
  onSource: () => void;
  onMore: () => void;
  showHint?: boolean;
}) {
  const category = categoryOf(article.category);
  const insightType = insightTypeOf(idea.type);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [hint, setHint] = useState(showHint);
  const lastTap = useRef(0);

  useEffect(() => {
    if (!showHint) return;
    const timer = window.setTimeout(() => setHint(false), 4500);
    return () => window.clearTimeout(timer);
  }, [showHint]);

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    if (window.getSelection()?.toString().trim()) return;

    const now = Date.now();
    if (now - lastTap.current < 330) {
      onLike(true);
      const rect = event.currentTarget.getBoundingClientRect();
      const id = now;
      setBursts((current) => [
        ...current,
        { id, x: event.clientX - rect.left, y: event.clientY - rect.top },
      ]);
      window.setTimeout(() => setBursts((current) => current.filter((item) => item.id !== id)), 1000);
      if (navigator.vibrate) navigator.vibrate(12);
      setHint(false);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  return (
    <article className="relative flex h-full snap-start flex-col overflow-hidden px-5 pb-3 pt-5">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(110% 70% at 100% 0%, ${category.color}12, transparent 62%)`,
        }}
      />
      <CardGlyph glyph={category.glyph} color={category.color} />

      <div className="relative flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em]">
        <span className="flex items-center gap-1.5" style={{ color: category.color }}>
          <span className="size-1.5 rounded-full" style={{ background: category.color }} />
          {category.short}
        </span>
        <span className="text-white/15">/</span>
        {insightType ? (
          <span className="font-semibold" style={{ color: insightType.color }}>
            {insightType.label}
          </span>
        ) : (
          <span className="text-muted">{readingTime(idea.words)} min</span>
        )}
        <span className="text-white/15">/</span>
        <span className="text-muted">{relativeDate(article.date)}</span>
        {idea.parts > 1 ? (
          <>
            <span className="text-white/15">/</span>
            <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-muted">
              {idea.part}/{idea.parts}
            </span>
          </>
        ) : null}
        <button
          type="button"
          onClick={onMore}
          aria-label="More actions"
          className="tap ml-auto grid size-8 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-cream"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="relative mt-3 shrink-0">
        <h2
          className={cn(
            "text-balance font-serif tracking-[-0.022em] text-cream",
            idea.title.length > 130
              ? "line-clamp-6 text-[clamp(1.55rem,5.2vw,1.95rem)] leading-[1.1]"
              : idea.title.length > 82
                ? "line-clamp-4 text-[clamp(1.95rem,6.8vw,2.45rem)] leading-[1.03]"
                : "text-[clamp(2.05rem,8.4vw,3.15rem)] leading-[0.98]",
          )}
        >
          {idea.title}
        </h2>
        <p className="mt-2.5 line-clamp-1 text-[11px] text-muted/80">
          From <span className="text-cream/60">{article.title}</span>
        </p>
      </div>

      {idea.takeaway ? (
        <p className="relative mt-3 shrink-0 border-l-2 border-lime/40 pl-3 text-[12px] leading-relaxed text-cream/65">
          <span className="font-semibold text-lime/90">Why it matters · </span>
          {idea.takeaway}
        </p>
      ) : null}

      <div
        onPointerUp={handlePointerUp}
        className="relative mt-4 min-h-0 flex-1 select-text overflow-hidden"
      >
        <Blocks
          blocks={idea.blocks}
          preview
          variant={idea.type === "action" ? "action" : "default"}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink via-ink/85 to-transparent" />
        {hint ? (
          <div className="animate-fade-in pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[10px] text-cream/70 backdrop-blur-md">
            <Heart size={11} className="text-rose-400" /> double-tap to like
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="tap relative mt-3 inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-1.5 text-[11px] font-medium text-cream/80 hover:border-white/20 hover:bg-white/[0.06]"
      >
        Read this idea <ArrowRight size={12} />
      </button>

      <div className="relative mt-2 flex items-end gap-0.5 border-t border-white/[0.06] pt-2">
        <ActionButton
          icon={Heart}
          label={liked ? "Liked" : "Like"}
          active={liked}
          onClick={() => onLike()}
          activeClass="fill-rose-400 text-rose-400"
        />
        <ActionButton
          icon={Bookmark}
          label={saved ? "Saved" : "Save"}
          active={saved}
          onClick={onSave}
          activeClass="fill-lime text-lime"
        />
        <ActionButton icon={Highlighter} label="Highlight" onClick={onOpen} />
        <ActionButton icon={ArrowUpRight} label="Source" onClick={onSource} />
        <span className="ml-auto pb-1.5 pr-1 text-[9px] text-muted/60">Arpit Bhayani</span>
      </div>

      {bursts.map((burst) => (
        <Heart
          key={burst.id}
          size={88}
          className="animate-heart pointer-events-none absolute z-20 fill-rose-400 text-rose-400 drop-shadow-[0_0_24px_rgba(251,113,133,0.55)]"
          style={{ left: burst.x - 44, top: burst.y - 44 }}
        />
      ))}
    </article>
  );
}
