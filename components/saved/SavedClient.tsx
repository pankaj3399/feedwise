"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  FolderOpen,
  FolderPlus,
  Heart,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Article, Collection, Idea, UserState } from "@/lib/types";
import { categoryOf } from "@/lib/categories";
import { cn, readingTime } from "@/lib/utils";
import { useUser } from "@/components/providers/UserProvider";
import { useToast } from "@/components/ui/Toast";
import { IdeaReader } from "@/components/feed/IdeaReader";
import { CollectionPicker } from "@/components/feed/CollectionPicker";

type Tab = "saved" | "liked" | "collections";

const TABS: { id: Tab; label: string; icon: typeof Bookmark }[] = [
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "liked", label: "Liked", icon: Heart },
  { id: "collections", label: "Collections", icon: FolderOpen },
];

function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
  onAction,
}: {
  icon: typeof Bookmark;
  title: string;
  body: string;
  cta: string;
  onAction?: () => void;
}) {
  const className =
    "tap mt-6 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-[12px] font-semibold text-ink";
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-white/[0.04] text-muted">
        <Icon size={26} />
      </span>
      <h2 className="mt-5 font-serif text-3xl leading-tight text-cream">{title}</h2>
      <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted">{body}</p>
      {onAction ? (
        <button onClick={onAction} className={className}>
          {cta} <ArrowRight size={14} />
        </button>
      ) : (
        <Link href="/feed" className={className}>
          {cta} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function SavedClient({
  initialState,
  ideas,
  articles,
}: {
  initialState: UserState;
  ideas: Idea[];
  articles: Record<string, Article>;
}) {
  const { stats, patchStats } = useUser();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("saved");
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState(() => new Set(initialState.liked));
  const [saved, setSaved] = useState(() => new Set(initialState.saved));
  const [collections, setCollections] = useState<Collection[]>(initialState.collections);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [reader, setReader] = useState<Idea | null>(null);
  const [collectionIdea, setCollectionIdea] = useState<Idea | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const byId = useMemo(() => new Map(ideas.map((idea) => [idea.id, idea])), [ideas]);
  const currentCollection = collections.find((collection) => collection.id === activeCollection) ?? null;

  function matches(idea: Idea) {
    const article = articles[idea.article];
    if (!article) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      idea.title.toLowerCase().includes(q) ||
      article.title.toLowerCase().includes(q) ||
      article.topics.some((topic) => topic.toLowerCase().includes(q))
    );
  }

  const savedIdeas = ideas.filter((idea) => saved.has(idea.id) && matches(idea));
  const likedIdeas = ideas.filter((idea) => liked.has(idea.id) && matches(idea));
  const collectionIdeas = (currentCollection?.ideaIds ?? [])
    .map((id) => byId.get(id))
    .filter((idea): idea is Idea => Boolean(idea))
    .filter(matches);

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
    }).catch(() => {
      setLiked(new Set(liked));
      toast({ title: "Couldn't sync that like", tone: "error" });
    });
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
    if (!next) toast({ title: "Removed from saved" });
    fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", ideaId, value: next }),
    }).catch(() => {
      setSaved(new Set(saved));
      toast({ title: "Couldn't sync that save", tone: "error" });
    });
  };

  const removeFromCollection = async (collectionId: string, ideaId: string) => {
    setCollections((current) =>
      current.map((collection) =>
        collection.id === collectionId
          ? { ...collection, ideaIds: collection.ideaIds.filter((id) => id !== ideaId) }
          : collection,
      ),
    );
    toast({ title: "Removed from collection" });
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", id: collectionId, ideaId }),
      });
      if (!response.ok) throw new Error();
    } catch {
      setCollections((current) =>
        current.map((collection) =>
          collection.id === collectionId
            ? { ...collection, ideaIds: [...collection.ideaIds, ideaId] }
            : collection,
        ),
      );
      toast({ title: "Couldn't update that collection", tone: "error" });
    }
  };

  const deleteCollection = async (collection: Collection) => {
    if (!window.confirm(`Delete “${collection.name}”? The ideas stay saved, only the collection goes away.`)) {
      return;
    }
    setCollections((current) => current.filter((item) => item.id !== collection.id));
    setActiveCollection(null);
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: collection.id }),
      });
      if (!response.ok) throw new Error();
      toast({ title: "Collection deleted" });
    } catch {
      setCollections((current) => [...current, collection]);
      toast({ title: "Couldn't delete that collection", tone: "error" });
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

  const createCollection = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create collection");
      setCollections((current) => [...current, { id: payload.id, name, emoji: "🔖", ideaIds: [] }]);
      setNewName("");
      toast({ title: "Collection created", description: "Open any idea to add it.", tone: "success" });
    } catch (error) {
      toast({
        title: "Couldn't create that collection",
        description: error instanceof Error ? error.message : undefined,
        tone: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  const addHighlight = (text: string, note: string) => {
    if (!reader) return;
    patchStats((current) => ({ ...current, totalHighlights: current.totalHighlights + 1, xp: current.xp + 5 }));
    toast({ title: "Highlight saved", description: "Saved → Highlights.", tone: "success" });
    fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "highlight", ideaId: reader.id, text, note }),
    }).catch(() => toast({ title: "Couldn't save that highlight", tone: "error" }));
  };

  const shareIdea = async (idea: Idea, article: Article) => {
    const url = `${article.url}${idea.anchor ? `#${idea.anchor}` : ""}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: idea.title, text: `${idea.title} — from ${article.title}`, url });
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", tone: "success" });
    } catch {
      toast({ title: "Couldn't share that link", tone: "error" });
    }
  };

  const readerArticle = reader ? articles[reader.article] : undefined;
  const related = reader ? ideas.filter((idea) => idea.article === reader.article && idea.id !== reader.id).slice(0, 4) : [];

  const showSearch = tab !== "collections" || Boolean(currentCollection);

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="border-b border-white/[0.055] px-5 pb-3 pt-5">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime">Your library</p>
            <h1 className="mt-1 font-serif text-[2.35rem] leading-[1] tracking-[-0.02em] text-cream">
              Keep the good stuff
            </h1>
          </div>
          <span className="mb-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted">
            {stats.totalSaves} saved
          </span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          Ideas you starred, loved, or filed away for a future project.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-full border border-white/[0.07] bg-white/[0.025] p-1">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            const count =
              item.id === "saved" ? saved.size : item.id === "liked" ? liked.size : collections.length;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setQuery("");
                  if (item.id !== "collections") setActiveCollection(null);
                }}
                className={cn(
                  "tap flex items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-medium transition-colors",
                  active ? "bg-lime text-ink" : "text-muted hover:text-cream",
                )}
              >
                <Icon size={13} className={active && item.id === "liked" ? "fill-ink" : ""} />
                {item.label}
                <span className={cn("text-[9px]", active ? "text-ink/60" : "text-muted/60")}>{count}</span>
              </button>
            );
          })}
        </div>

        {showSearch ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your library"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[12px] text-cream outline-none placeholder:text-muted/60"
            />
            {query ? (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="text-muted">
                <X size={13} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="px-4 pb-24 pt-4">
        {tab === "collections" && !currentCollection ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1.5 pl-3">
              <FolderPlus size={15} className="shrink-0 text-muted" />
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createCollection();
                }}
                placeholder="New collection, e.g. interview prep"
                maxLength={40}
                className="min-w-0 flex-1 bg-transparent py-2 text-[12px] text-cream outline-none placeholder:text-muted/60"
              />
              <button
                onClick={() => void createCollection()}
                disabled={!newName.trim() || creating}
                className="tap grid size-8 shrink-0 place-items-center rounded-xl bg-lime text-ink disabled:opacity-30"
                aria-label="Create collection"
              >
                <Plus size={16} />
              </button>
            </div>

            {collections.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No collections yet"
                body="Group ideas by project, interview prep, or whatever rabbit hole you're in."
                cta="Find ideas to file"
              />
            ) : (
              collections.map((collection) => {
                const preview = collection.ideaIds
                  .map((id) => byId.get(id))
                  .filter((idea): idea is Idea => Boolean(idea))
                  .slice(0, 2);
                return (
                  <button
                    key={collection.id}
                    onClick={() => setActiveCollection(collection.id)}
                    className="tap flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 text-left hover:border-white/15 hover:bg-white/[0.05]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-xl">
                      {collection.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium text-cream">{collection.name}</span>
                        <span className="shrink-0 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-muted">
                          {collection.ideaIds.length}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted">
                        {preview.length
                          ? preview.map((idea) => idea.title).join(" · ")
                          : "Empty — add ideas from any card."}
                      </span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-muted" />
                  </button>
                );
              })
            )}
          </div>
        ) : null}

        {tab === "collections" && currentCollection ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveCollection(null);
                  setQuery("");
                }}
                className="tap grid size-8 place-items-center rounded-full bg-white/[0.04] text-muted"
                aria-label="Back to collections"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="text-lg">{currentCollection.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-cream">{currentCollection.name}</p>
                <p className="text-[10px] text-muted">
                  {currentCollection.ideaIds.length}{" "}
                  {currentCollection.ideaIds.length === 1 ? "idea" : "ideas"}
                </p>
              </div>
              <button
                onClick={() => void deleteCollection(currentCollection)}
                className="tap grid size-8 place-items-center rounded-full text-muted hover:bg-rose-400/10 hover:text-rose-300"
                aria-label="Delete collection"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {collectionIdeas.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="This one's empty"
                body="Open an idea and tap Collect to put it in here."
                cta="Browse the feed"
              />
            ) : (
              <div className="space-y-2">
                {collectionIdeas.map((idea) => {
                  const article = articles[idea.article];
                  if (!article) return null;
                  return (
                    <IdeaRow
                      key={idea.id}
                      idea={idea}
                      article={article}
                      onOpen={() => setReader(idea)}
                      action={
                        <button
                          onClick={() => void removeFromCollection(currentCollection.id, idea.id)}
                          className="tap grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-white/[0.06] hover:text-cream"
                          aria-label="Remove from collection"
                        >
                          <X size={14} />
                        </button>
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {tab === "saved" ? (
          savedIdeas.length ? (
            <div className="space-y-2">
              {savedIdeas.map((idea) => {
                const article = articles[idea.article];
                if (!article) return null;
                return (
                  <IdeaRow
                    key={idea.id}
                    idea={idea}
                    article={article}
                    onOpen={() => setReader(idea)}
                    action={
                      <button
                        onClick={() => toggleSave(idea.id)}
                        className="tap grid size-8 shrink-0 place-items-center rounded-full text-lime hover:bg-lime/10"
                        aria-label="Remove from saved"
                      >
                        <Bookmark size={15} className="fill-lime" />
                      </button>
                    }
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Bookmark}
              title={query ? "Nothing matches" : "Nothing saved yet"}
              body={
                query
                  ? "Try a shorter search, or clear it to see everything."
                  : "Tap the bookmark on any idea and it will wait for you here."
              }
              cta={query ? "Clear search" : "Find something worth keeping"}
              onAction={query ? () => setQuery("") : undefined}
            />
          )
        ) : null}

        {tab === "liked" ? (
          likedIdeas.length ? (
            <div className="space-y-2">
              {likedIdeas.map((idea) => {
                const article = articles[idea.article];
                if (!article) return null;
                return (
                  <IdeaRow
                    key={idea.id}
                    idea={idea}
                    article={article}
                    onOpen={() => setReader(idea)}
                    action={
                      <button
                        onClick={() => toggleLike(idea.id)}
                        className="tap grid size-8 shrink-0 place-items-center rounded-full text-rose-400 hover:bg-rose-400/10"
                        aria-label="Unlike"
                      >
                        <Heart size={15} className="fill-rose-400" />
                      </button>
                    }
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Heart}
              title={query ? "Nothing matches" : "No likes yet"}
              body={
                query
                  ? "Try a shorter search, or clear it to see everything."
                  : "Double-tap a card, or tap the heart when an idea lands."
              }
              cta={query ? "Clear search" : "Go find a favourite"}
              onAction={query ? () => setQuery("") : undefined}
            />
          )
        ) : null}
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
          onShare={() => void shareIdea(reader, readerArticle)}
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
        onCreate={async (name) => {
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
        }}
      />
    </div>
  );
}

function IdeaRow({
  idea,
  article,
  onOpen,
  action,
}: {
  idea: Idea;
  article: Article;
  onOpen: () => void;
  action?: React.ReactNode;
}) {
  const category = categoryOf(article.category);
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.025] pr-2 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl text-[10px] font-semibold"
          style={{ background: category.soft, color: category.color }}
        >
          {category.short.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-snug text-cream">{idea.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-muted">
            <span className="truncate">{article.title}</span>
            <span className="text-white/15">·</span>
            <span className="shrink-0">{readingTime(idea.words)} min</span>
          </span>
        </span>
      </button>
      {action}
    </div>
  );
}
