"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Highlighter, Search, Trash2, X } from "lucide-react";
import type { Article, Collection, Highlight, Idea, UserState } from "@/lib/types";
import { categoryOf } from "@/lib/categories";
import { cn, relativeDate } from "@/lib/utils";
import { useUser } from "@/components/providers/UserProvider";
import { useToast } from "@/components/ui/Toast";
import { IdeaReader } from "@/components/feed/IdeaReader";
import { CollectionPicker } from "@/components/feed/CollectionPicker";

export function HighlightsClient({
  highlights,
  ideas,
  articles,
  initialState,
}: {
  highlights: Highlight[];
  ideas: Idea[];
  articles: Record<string, Article>;
  initialState: UserState;
}) {
  const { stats, patchStats } = useUser();
  const { toast } = useToast();
  const [items, setItems] = useState(highlights);
  const [query, setQuery] = useState("");
  const [reader, setReader] = useState<Idea | null>(null);
  const [liked, setLiked] = useState(() => new Set(initialState.liked));
  const [saved, setSaved] = useState(() => new Set(initialState.saved));
  const [collections, setCollections] = useState<Collection[]>(initialState.collections);
  const [collectionIdea, setCollectionIdea] = useState<Idea | null>(null);

  const byId = useMemo(() => new Map(ideas.map((idea) => [idea.id, idea])), [ideas]);

  const filtered = items.filter((highlight) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const idea = byId.get(highlight.ideaId);
    const article = idea ? articles[idea.article] : undefined;
    return (
      highlight.text.toLowerCase().includes(q) ||
      (highlight.note ?? "").toLowerCase().includes(q) ||
      (idea?.title ?? "").toLowerCase().includes(q) ||
      (article?.title ?? "").toLowerCase().includes(q)
    );
  });

  const remove = async (highlight: Highlight) => {
    setItems((current) => current.filter((item) => item.id !== highlight.id));
    patchStats((current) => ({
      ...current,
      totalHighlights: Math.max(0, current.totalHighlights - 1),
      xp: Math.max(0, current.xp - 5),
    }));
    toast({ title: "Highlight removed" });
    try {
      const response = await fetch("/api/highlight", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: highlight.id }),
      });
      if (!response.ok) throw new Error();
    } catch {
      setItems((current) => [highlight, ...current]);
      patchStats((current) => ({ ...current, totalHighlights: current.totalHighlights + 1, xp: current.xp + 5 }));
      toast({ title: "Couldn't remove that highlight", tone: "error" });
    }
  };

  const toggleLike = (ideaId: string) => {
    const next = !liked.has(ideaId);
    const updated = new Set(liked);
    if (next) updated.add(ideaId);
    else updated.delete(ideaId);
    setLiked(updated);
    patchStats((current) => ({
      ...current,
      totalLikes: Math.max(0, current.totalLikes + (next ? 1 : -1)),
      xp: Math.max(0, current.xp + (next ? 2 : -2)),
    }));
    fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like", ideaId, value: next }),
    }).catch(() => toast({ title: "Couldn't sync that like", tone: "error" }));
  };

  const toggleSave = (ideaId: string) => {
    const next = !saved.has(ideaId);
    const updated = new Set(saved);
    if (next) updated.add(ideaId);
    else updated.delete(ideaId);
    setSaved(updated);
    patchStats((current) => ({
      ...current,
      totalSaves: Math.max(0, current.totalSaves + (next ? 1 : -1)),
      xp: Math.max(0, current.xp + (next ? 3 : -3)),
    }));
    fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", ideaId, value: next }),
    }).catch(() => toast({ title: "Couldn't sync that save", tone: "error" }));
  };

  const addHighlight = async (text: string, note: string) => {
    if (!reader) return;
    try {
      const response = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "highlight", ideaId: reader.id, text, note }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save highlight");
      setItems((current) => [
        { id: payload.id, ideaId: reader.id, text, note: note || null, createdAt: new Date().toISOString() },
        ...current,
      ]);
      patchStats((current) => ({
        ...current,
        totalHighlights: current.totalHighlights + 1,
        xp: current.xp + 5,
      }));
      toast({ title: "Highlight saved", tone: "success" });
    } catch {
      toast({ title: "Couldn't save that highlight", tone: "error" });
    }
  };

  const toggleInCollection = (collectionId: string, value: boolean) => {
    if (!collectionIdea) return;
    const ideaId = collectionIdea.id;
    const collection = collections.find((item) => item.id === collectionId);
    setCollections((current) =>
      current.map((item) =>
        item.id === collectionId
          ? {
              ...item,
              ideaIds: value
                ? [...new Set([...item.ideaIds, ideaId])]
                : item.ideaIds.filter((id) => id !== ideaId),
            }
          : item,
      ),
    );
    if (value && !saved.has(ideaId)) {
      setSaved(new Set([...saved, ideaId]));
      patchStats((current) => ({ ...current, totalSaves: current.totalSaves + 1, xp: current.xp + 3 }));
    }
    toast({
      title: value ? `Added to ${collection?.name ?? "collection"}` : "Removed from collection",
      tone: value ? "success" : "default",
    });
    fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "collection", ideaId, collectionId, value }),
    }).catch(() => toast({ title: "Couldn't update that collection", tone: "error" }));
  };

  const createCollection = async (name: string) => {
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create collection");
      const collection: Collection = { id: payload.id, name, emoji: "🔖", ideaIds: [] };
      setCollections((current) => [...current, collection]);
      if (collectionIdea) {
        setCollections((current) =>
          current.map((item) =>
            item.id === collection.id ? { ...item, ideaIds: [collectionIdea.id] } : item,
          ),
        );
        if (!saved.has(collectionIdea.id)) {
          setSaved(new Set([...saved, collectionIdea.id]));
          patchStats((current) => ({ ...current, totalSaves: current.totalSaves + 1, xp: current.xp + 3 }));
        }
        await fetch("/api/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", id: collection.id, ideaId: collectionIdea.id }),
        });
      }
      toast({ title: `Saved to ${name}`, tone: "success" });
    } catch (error) {
      toast({
        title: "Couldn't create that collection",
        description: error instanceof Error ? error.message : undefined,
        tone: "error",
      });
    }
  };

  const readerArticle = reader ? articles[reader.article] : undefined;
  const related = reader ? ideas.filter((idea) => idea.article === reader.article && idea.id !== reader.id).slice(0, 4) : [];

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="border-b border-white/[0.055] px-5 pb-4 pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime">Marginalia</p>
        <div className="mt-1 flex items-end gap-3">
          <h1 className="min-w-0 flex-1 font-serif text-[2.35rem] leading-[1] tracking-[-0.02em] text-cream">
            Lines worth keeping
          </h1>
          <span className="mb-1 shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted">
            {items.length}
          </span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          Select any passage while reading to save it here, with a note if you like.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3">
          <Search size={14} className="shrink-0 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search highlights and notes"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[12px] text-cream outline-none placeholder:text-muted/60"
          />
          {query ? (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="text-muted">
              <X size={13} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 px-4 pb-24 pt-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-white/[0.04] text-muted">
              <Highlighter size={26} />
            </span>
            <h2 className="mt-5 font-serif text-3xl leading-tight text-cream">
              {query ? "Nothing matches" : "No highlights yet"}
            </h2>
            <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted">
              {query
                ? "Try a shorter search, or clear it to see everything."
                : "Open any idea, select a line that makes you pause, and save it with a thought."}
            </p>
            {query ? (
              <button
                onClick={() => setQuery("")}
                className="tap mt-6 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-[12px] font-semibold text-ink"
              >
                Clear search <ArrowRight size={14} />
              </button>
            ) : (
              <Link
                href="/feed"
                className="tap mt-6 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-[12px] font-semibold text-ink"
              >
                Start reading <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          filtered.map((highlight) => {
            const idea = byId.get(highlight.ideaId);
            const article = idea ? articles[idea.article] : undefined;
            const category = article ? categoryOf(article.category) : null;
            return (
              <article
                key={highlight.id}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{ background: category ? `linear-gradient(90deg, transparent, ${category.color}66, transparent)` : undefined }}
                />
                <blockquote className="font-serif text-[19px] italic leading-[1.45] text-cream/90">
                  “{highlight.text}”
                </blockquote>
                {highlight.note ? (
                  <div className="mt-3 rounded-xl border-l-2 border-lime/50 bg-lime/[0.045] px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-lime/80">Your note</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-cream/70">{highlight.note}</p>
                  </div>
                ) : null}
                <div className="mt-3 flex items-center gap-2">
                  {category ? (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em]"
                      style={{ color: category.color, background: category.soft }}
                    >
                      {category.short}
                    </span>
                  ) : null}
                  <p className="min-w-0 flex-1 truncate text-[10px] text-muted">
                    {article?.title ?? "Unknown essay"} · {relativeDate(highlight.createdAt.slice(0, 10))}
                  </p>
                  {idea ? (
                    <button
                      onClick={() => setReader(idea)}
                      className="tap shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-cream/80 hover:bg-white/[0.06]"
                    >
                      Open
                    </button>
                  ) : null}
                  <button
                    onClick={() => void remove(highlight)}
                    className="tap grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-rose-400/10 hover:text-rose-300"
                    aria-label="Delete highlight"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {reader && readerArticle ? (
        <IdeaReader
          idea={reader}
          article={readerArticle}
          liked={liked.has(reader.id)}
          saved={saved.has(reader.id)}
          related={related}
          onClose={() => setReader(null)}
          onLike={() => toggleLike(reader.id)}
          onSave={() => toggleSave(reader.id)}
          onSource={() =>
            window.open(
              `${readerArticle.url}${reader.anchor ? `#${reader.anchor}` : ""}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
          onShare={async () => {
            const url = `${readerArticle.url}${reader.anchor ? `#${reader.anchor}` : ""}`;
            try {
              await navigator.clipboard.writeText(url);
              toast({ title: "Link copied", tone: "success" });
            } catch {
              toast({ title: "Couldn't share that link", tone: "error" });
            }
          }}
          onAddToCollection={() => setCollectionIdea(reader)}
          onHighlight={addHighlight}
          onOpenRelated={(idea) => setReader(idea)}
        />
      ) : null}

      <CollectionPicker
        open={Boolean(collectionIdea)}
        onClose={() => setCollectionIdea(null)}
        idea={collectionIdea}
        collections={collections}
        onToggle={toggleInCollection}
        onCreate={createCollection}
      />

      <p className={cn("px-6 pb-8 text-center text-[10px] text-muted/50")}>
        Highlights live on your account. {stats.totalHighlights} saved in total.
      </p>
    </div>
  );
}
