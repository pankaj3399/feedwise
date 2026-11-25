"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  FolderPlus,
  Heart,
  Highlighter,
  Share2,
  X,
} from "lucide-react";
import type { Article, Idea } from "@/lib/types";
import { categoryOf } from "@/lib/categories";
import { readingTime, relativeDate } from "@/lib/utils";
import { Blocks } from "./Blocks";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";

export function IdeaReader({
  idea,
  article,
  liked,
  saved,
  related,
  onClose,
  onLike,
  onSave,
  onSource,
  onShare,
  onAddToCollection,
  onHighlight,
  onOpenRelated,
}: {
  idea: Idea;
  article: Article;
  liked: boolean;
  saved: boolean;
  related: Idea[];
  onClose: () => void;
  onLike: () => void;
  onSave: () => void;
  onSource: () => void;
  onShare: () => void;
  onAddToCollection: () => void;
  onHighlight: (text: string, note: string) => void;
  onOpenRelated: (idea: Idea) => void;
}) {
  const category = categoryOf(article.category);
  const [selected, setSelected] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    setSelected(null);
    setNote("");
    setNoteOpen(false);
  }, [idea.id]);

  function captureSelection() {
    window.setTimeout(() => {
      const text = window.getSelection()?.toString().trim() ?? "";
      if (text.length < 8 || text.length > 800) {
        setSelected(null);
        return;
      }
      setSelected(text.replace(/\s+/g, " "));
    }, 120);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-ink">
      <header className="z-20 flex h-[60px] shrink-0 items-center gap-2 border-b border-white/[0.06] bg-ink/95 px-3 backdrop-blur-xl">
        <button
          onClick={onClose}
          aria-label="Close reader"
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
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={onLike}
            aria-label={liked ? "Unlike" : "Like"}
            className={cn(
              "tap grid size-9 place-items-center rounded-full hover:bg-white/5",
              liked ? "text-rose-400" : "text-muted",
            )}
          >
            <Heart size={19} className={liked ? "fill-rose-400" : ""} />
          </button>
          <button
            onClick={onSave}
            aria-label={saved ? "Remove from saved" : "Save"}
            className={cn(
              "tap grid size-9 place-items-center rounded-full hover:bg-white/5",
              saved ? "text-lime" : "text-muted",
            )}
          >
            <Bookmark size={19} className={saved ? "fill-lime" : ""} />
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="tap grid size-9 place-items-center rounded-full text-muted hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 pb-36 pt-6">
        <div className="mx-auto max-w-[620px]">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
            <span>{readingTime(idea.words)} min read</span>
            <span className="text-white/15">/</span>
            <span>{relativeDate(article.date)}</span>
            {idea.parts > 1 ? (
              <>
                <span className="text-white/15">/</span>
                <span>
                  part {idea.part} of {idea.parts}
                </span>
              </>
            ) : null}
          </div>

          <h1
            className={cn(
              "mt-3 text-balance font-serif tracking-[-0.02em] text-cream",
              idea.title.length > 130
                ? "text-[clamp(1.7rem,6.2vw,2.35rem)] leading-[1.1]"
                : idea.title.length > 82
                  ? "text-[clamp(2rem,7.2vw,2.8rem)] leading-[1.02]"
                  : "text-[clamp(2.2rem,9vw,3.4rem)] leading-[0.98]",
            )}
          >
            {idea.title}
          </h1>
          <p className="mt-3 text-[12px] text-muted">
            From <span className="text-cream/70">{article.title}</span> by Arpit Bhayani
          </p>

          <div
            className="mt-7 select-text"
            onMouseUp={captureSelection}
            onTouchEnd={captureSelection}
          >
            <Blocks blocks={idea.blocks} />
          </div>

          <a
            href={`${article.url}${idea.anchor ? `#${idea.anchor}` : ""}`}
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

          {related.length ? (
            <div className="mt-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                More from this essay
              </p>
              <div className="mt-3 space-y-2">
                {related.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onOpenRelated(item)}
                    className="tap flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-left hover:bg-white/[0.05]"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] text-cream/85">{item.title}</span>
                    <ArrowUpRight size={14} className="shrink-0 text-muted" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-8 text-center text-[10px] leading-relaxed text-muted/60">
            Ideas and words by Arpit Bhayani.
            <br />
            Feedwise is a personal reading layer, not affiliated with the author.
          </p>
        </div>
      </div>

      {selected ? (
        <button
          onClick={() => setNoteOpen(true)}
          className="animate-rise fixed bottom-[88px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-[12px] font-semibold text-ink shadow-2xl shadow-black/40"
        >
          <Highlighter size={14} /> Highlight selection
        </button>
      ) : null}

      <div className="z-20 flex shrink-0 items-center gap-1 border-t border-white/[0.06] bg-ink/95 px-3 pb-safe pt-2 backdrop-blur-xl">
        <button
          onClick={onLike}
          className={cn(
            "tap flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-muted",
            liked && "text-rose-400",
          )}
        >
          <Heart size={20} className={liked ? "fill-rose-400" : ""} />
          <span className="text-[9px]">{liked ? "Liked" : "Like"}</span>
        </button>
        <button
          onClick={onSave}
          className={cn(
            "tap flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-muted",
            saved && "text-lime",
          )}
        >
          <Bookmark size={20} className={saved ? "fill-lime" : ""} />
          <span className="text-[9px]">{saved ? "Saved" : "Save"}</span>
        </button>
        <button
          onClick={onAddToCollection}
          className="tap flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-muted"
        >
          <FolderPlus size={20} />
          <span className="text-[9px]">Collect</span>
        </button>
        <button
          onClick={onShare}
          className="tap flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-muted"
        >
          <Share2 size={19} />
          <span className="text-[9px]">Share</span>
        </button>
        <button
          onClick={onSource}
          className="tap flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-muted"
        >
          <ArrowUpRight size={20} />
          <span className="text-[9px]">Original</span>
        </button>
      </div>

      <Sheet
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Save a highlight"
        description="Keep the line that made you stop scrolling."
      >
        <blockquote className="max-h-32 overflow-y-auto rounded-xl border-l-2 border-lime/60 bg-white/[0.03] px-4 py-3 font-serif text-[17px] italic leading-snug text-cream/90">
          {selected}
        </blockquote>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add a thought, a question, or why it matters…"
          rows={3}
          className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3.5 py-3 text-[13px] text-cream outline-none placeholder:text-muted/60 focus:border-lime/40"
        />
        <button
          onClick={() => {
            if (!selected) return;
            onHighlight(selected, note.trim());
            setNoteOpen(false);
            setSelected(null);
            setNote("");
            window.getSelection()?.removeAllRanges();
          }}
          className="tap mt-3 w-full rounded-xl bg-lime py-3 text-[13px] font-semibold text-ink"
        >
          Save highlight
        </button>
      </Sheet>
    </div>
  );
}
