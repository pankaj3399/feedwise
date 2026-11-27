"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  FolderPlus,
  RefreshCw,
  Share2,
  Sparkles,
  Trophy,
} from "lucide-react";
import type {
  Article,
  Collection,
  EssayArc,
  FeedData,
  Idea,
  Quiz,
  Stats,
  UserState,
} from "@/lib/types";
import { buildFeed, insertQuizzes } from "@/lib/feed";
import { categoryOf } from "@/lib/categories";
import { useUser } from "@/components/providers/UserProvider";
import { useToast } from "@/components/ui/Toast";
import { Sheet } from "@/components/ui/Sheet";
import { FeedCard } from "./FeedCard";
import { QuizCard } from "./QuizCard";
import { IdeaReader } from "./IdeaReader";
import { ExplainerReader } from "./ExplainerReader";
import { TopicTabs } from "./TopicTabs";
import { CollectionPicker } from "./CollectionPicker";
import { cn } from "@/lib/utils";

let feedPromise: Promise<FeedData> | null = null;

function loadFeed(): Promise<FeedData> {
  if (!feedPromise) {
    feedPromise = fetch("/data/feed.json").then((response) => {
      if (!response.ok) throw new Error("Could not load the library");
      return response.json() as Promise<FeedData>;
    });
  }
  return feedPromise;
}

function MenuRow({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: typeof Share2;
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="tap flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-3 text-left hover:bg-white/[0.05]"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.05] text-cream/80">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-cream">{label}</span>
        {description ? <span className="mt-0.5 block truncate text-[11px] text-muted">{description}</span> : null}
      </span>
      <ArrowRight size={14} className="shrink-0 text-muted" />
    </button>
  );
}

export function FeedClient({
  initialState,
  initialIdeas,
  initialArticles,
  quizzes,
  seed,
  initialTopic,
  initialMode,
  initialArcs,
}: {
  initialState: UserState;
  initialIdeas: Idea[];
  initialArticles: Record<string, Article>;
  quizzes: Quiz[];
  seed: string;
  initialTopic?: string;
  initialMode?: string;
  initialArcs?: Record<string, EssayArc>;
}) {
  const { stats, patchStats } = useUser();
  const { toast } = useToast();

  const [data, setData] = useState<FeedData | null>(null);
  const [mode, setMode] = useState(initialMode ?? initialTopic ?? "for-you");
  const [topic, setTopic] = useState<string | undefined>(initialTopic);
  const [salt, setSalt] = useState(0);
  const [liked, setLiked] = useState(() => new Set(initialState.liked));
  const [saved, setSaved] = useState(() => new Set(initialState.saved));
  const [collections, setCollections] = useState<Collection[]>(initialState.collections);
  const [reader, setReader] = useState<Idea | null>(null);
  const [explainerArticle, setExplainerArticle] = useState<string | null>(null);
  const [menuIdea, setMenuIdea] = useState<Idea | null>(null);
  const [collectionIdea, setCollectionIdea] = useState<Idea | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const readRef = useRef(new Set(initialState.read));
  const readTodayRef = useRef(new Set(stats.todayReadIds));
  const likedRef = useRef(liked);
  const savedRef = useRef(saved);
  const statsRef = useRef(stats);
  const goalCelebrated = useRef(stats.goalMet);
  const quizXpRef = useRef(new Set<string>());

  useEffect(() => {
    likedRef.current = liked;
  }, [liked]);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    let cancelled = false;
    loadFeed()
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Using the offline mix",
            description: "The full library couldn't load. Pull to refresh when you're back online.",
            tone: "error",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    const onPop = () => {
      setReader(null);
      setExplainerArticle(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const articleMap = data?.articles ?? initialArticles;
  const arcMap = data?.arcs ?? initialArcs ?? {};

  const ideas = useMemo(() => {
    if (!data) return initialIdeas;
    return buildFeed({
      data,
      read: initialState.read,
      liked: initialState.liked,
      saved: initialState.saved,
      interests: initialState.interests,
      seed: `${seed}:${salt}`,
      mode: topic ? "for-you" : mode,
      topic,
    });
  }, [data, initialIdeas, initialState, seed, salt, mode, topic]);

  const entries = useMemo(() => insertQuizzes(ideas, quizzes, 12), [ideas, quizzes]);
  const ready = Boolean(data);
  const followingEmpty = mode === "following" && initialState.interests.length === 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    setVisibleCount(10);
    setActiveIndex(0);
    setProgress(0);
  }, [mode, topic, salt]);

  const celebrateGoal = useCallback(async () => {
    if (goalCelebrated.current) return;
    goalCelebrated.current = true;
    try {
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 100,
        spread: 78,
        origin: { y: 0.72 },
        colors: ["#D8FF5F", "#A78BFA", "#22D3EE", "#F472B6", "#FBBF24"],
        scalar: 0.9,
      });
    } catch {
      /* confetti is optional */
    }
    toast({
      title: "Daily goal complete",
      description: "+25 XP. That's the good kind of scrolling.",
      tone: "success",
      duration: 4600,
    });
    if (navigator.vibrate) navigator.vibrate([14, 50, 14]);
  }, [toast]);

  const markRead = useCallback(
    (ideaId: string, seconds: number) => {
      const isNewEver = !readRef.current.has(ideaId);
      const isNewToday = !readTodayRef.current.has(ideaId);
      readRef.current.add(ideaId);
      if (isNewToday) readTodayRef.current.add(ideaId);

      if (isNewEver || isNewToday) {
        const current = statsRef.current;
        const nextToday = current.todayReads + (isNewToday ? 1 : 0);
        const goalMet = nextToday >= current.goal;
        const justGoal = goalMet && !current.goalMet;
        const nextStats: Stats = {
          ...current,
          todayReads: nextToday,
          todayReadIds: isNewToday ? [...current.todayReadIds, ideaId] : current.todayReadIds,
          totalRead: current.totalRead + (isNewEver ? 1 : 0),
          xp: current.xp + (isNewEver ? 10 : 0) + (justGoal ? 25 : 0),
          goalMet,
          streak: isNewToday && current.todayReads === 0 ? current.streak + 1 : current.streak,
        };
        statsRef.current = nextStats;
        patchStats(nextStats);
        if (justGoal) void celebrateGoal();
      }

      fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", ideaId, seconds }),
      }).catch(() => {});
    },
    [patchStats, celebrateGoal],
  );

  useEffect(() => {
    const entry = entries[activeIndex];
    if (!entry || entry.type !== "idea") return;
    if (readTodayRef.current.has(entry.idea.id)) return;
    const timer = window.setTimeout(() => markRead(entry.idea.id, 0), 2400);
    return () => window.clearTimeout(timer);
  }, [activeIndex, entries, markRead]);

  useEffect(() => {
    if (!reader) return;
    const timer = window.setTimeout(() => markRead(reader.id, 0), 1200);
    return () => window.clearTimeout(timer);
  }, [reader, markRead]);

  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      const height = Math.max(1, el.clientHeight);
      setActiveIndex(Math.round(el.scrollTop / height));
      setProgress(el.scrollTop / Math.max(1, el.scrollHeight - height));
      if (el.scrollTop + height * 2.1 > el.scrollHeight) {
        setVisibleCount((current) =>
          current >= entries.length + 1 ? current : Math.min(entries.length + 1, current + 8),
        );
      }
    });
  }, [entries.length]);

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: index * el.clientHeight, behavior: "smooth" });
  }, []);

  const toggleLike = useCallback(
    (ideaId: string, force?: boolean) => {
      const currently = likedRef.current.has(ideaId);
      const next = typeof force === "boolean" ? force : !currently;
      if (next === currently) return;
      const updated = new Set(likedRef.current);
      if (next) updated.add(ideaId);
      else updated.delete(ideaId);
      likedRef.current = updated;
      setLiked(updated);
      patchStats((current) => ({
        ...current,
        totalLikes: Math.max(0, current.totalLikes + (next ? 1 : -1)),
        xp: Math.max(0, current.xp + (next ? 2 : -2)),
      }));
      if (next && navigator.vibrate) navigator.vibrate(8);
      fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", ideaId, value: next }),
      }).catch(() => {
        const reverted = new Set(likedRef.current);
        if (currently) reverted.add(ideaId);
        else reverted.delete(ideaId);
        likedRef.current = reverted;
        setLiked(reverted);
        toast({ title: "Couldn't sync that like", tone: "error" });
      });
    },
    [patchStats, toast],
  );

  const toggleSave = useCallback(
    (idea: Idea) => {
      const currently = savedRef.current.has(idea.id);
      const next = !currently;
      const updated = new Set(savedRef.current);
      if (next) updated.add(idea.id);
      else updated.delete(idea.id);
      savedRef.current = updated;
      setSaved(updated);
      patchStats((current) => ({
        ...current,
        totalSaves: Math.max(0, current.totalSaves + (next ? 1 : -1)),
        xp: Math.max(0, current.xp + (next ? 3 : -3)),
      }));
      if (next) {
        toast({
          title: "Saved for later",
          description: "You'll find it in Saved.",
          tone: "success",
          action: { label: "Collect", onClick: () => setCollectionIdea(idea) },
        });
      } else {
        toast({ title: "Removed from saved" });
      }
      fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", ideaId: idea.id, value: next }),
      }).catch(() => {
        const reverted = new Set(savedRef.current);
        if (currently) reverted.add(idea.id);
        else reverted.delete(idea.id);
        savedRef.current = reverted;
        setSaved(reverted);
        toast({ title: "Couldn't sync that save", tone: "error" });
      });
    },
    [patchStats, toast],
  );

  const shareIdea = useCallback(
    async (idea: Idea, article: Article) => {
      const url = `${article.url}${idea.anchor ? `#${idea.anchor}` : ""}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: idea.title, text: `${idea.title} — from ${article.title}`, url });
          return;
        } catch {
          /* fall through to copy */
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", tone: "success" });
      } catch {
        toast({ title: "Couldn't share that link", tone: "error" });
      }
    },
    [toast],
  );

  const openSource = useCallback((idea: Idea, article: Article) => {
    const url = `${article.url}${idea.anchor ? `#${idea.anchor}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const openReader = useCallback((idea: Idea) => {
    setReader(idea);
    window.history.pushState({ fwReader: true }, "");
  }, []);

  const closeReader = useCallback(() => {
    setReader(null);
    if (window.history.state?.fwReader) window.history.back();
  }, []);

  const openExplainer = useCallback((idea: Idea) => {
    setExplainerArticle(idea.article);
    window.history.pushState({ fwExplainer: true }, "");
  }, []);

  const closeExplainer = useCallback(() => {
    setExplainerArticle(null);
    if (window.history.state?.fwExplainer) window.history.back();
  }, []);

  const addHighlight = useCallback(
    (text: string, note: string) => {
      if (!reader) return;
      patchStats((current) => ({
        ...current,
        totalHighlights: current.totalHighlights + 1,
        xp: current.xp + 5,
      }));
      toast({ title: "Highlight saved", description: "Saved → Highlights.", tone: "success" });
      fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "highlight", ideaId: reader.id, text, note }),
      }).catch(() => toast({ title: "Couldn't save that highlight", tone: "error" }));
    },
    [reader, patchStats, toast],
  );

  const answerQuiz = useCallback(
    (quiz: Quiz, correct: boolean) => {
      fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.id, correct }),
      }).catch(() => {});
      if (correct && !quizXpRef.current.has(quiz.id)) {
        quizXpRef.current.add(quiz.id);
        patchStats((current) => ({
          ...current,
          quizzesCorrect: current.quizzesCorrect + 1,
          xp: current.xp + 15,
        }));
      }
    },
    [patchStats],
  );

  const refreshFeed = useCallback(() => {
    if (mode === "latest") {
      setMode("for-you");
      setTopic(undefined);
      window.history.replaceState(null, "", "/feed");
    }
    setSalt((current) => current + 1);
    toast({ title: "Fresh mix", description: "New order, same good ideas.", tone: "success" });
  }, [mode, toast]);

  const selectTab = useCallback((id: string) => {
    if (id === "for-you" || id === "following") {
      setMode(id);
      setTopic(undefined);
      window.history.replaceState(null, "", "/feed");
    } else if (id === "latest") {
      setMode("latest");
      setTopic(undefined);
      window.history.replaceState(null, "", "/feed?mode=latest");
    } else {
      setMode(id);
      setTopic(id);
      window.history.replaceState(null, "", `/feed?topic=${id}`);
    }
  }, []);

  const addToCollection = useCallback(
    (collectionId: string, value: boolean) => {
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
      if (value && !savedRef.current.has(ideaId)) {
        const updated = new Set(savedRef.current);
        updated.add(ideaId);
        savedRef.current = updated;
        setSaved(updated);
        patchStats((current) => ({ ...current, totalSaves: current.totalSaves + 1 }));
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
    },
    [collectionIdea, collections, patchStats, toast],
  );

  const createCollection = useCallback(
    async (name: string) => {
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
          const ideaId = collectionIdea.id;
          setCollections((current) =>
            current.map((item) =>
              item.id === collection.id ? { ...item, ideaIds: [ideaId] } : item,
            ),
          );
          if (!savedRef.current.has(ideaId)) {
            const updated = new Set(savedRef.current);
            updated.add(ideaId);
            savedRef.current = updated;
            setSaved(updated);
            patchStats((current) => ({ ...current, totalSaves: current.totalSaves + 1 }));
          }
          await fetch("/api/collections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add", id: collection.id, ideaId }),
          });
          toast({ title: `Saved to ${name}`, tone: "success" });
        } else {
          toast({ title: "Collection created", tone: "success" });
        }
      } catch (error) {
        toast({
          title: "Couldn't create that collection",
          description: error instanceof Error ? error.message : undefined,
          tone: "error",
        });
      }
    },
    [collectionIdea, patchStats, toast],
  );

  const series = useMemo(() => {
    if (!reader) return [];
    const source = data?.ideas ?? initialIdeas;
    return source
      .filter((idea) => idea.article === reader.article)
      .sort((a, b) => a.part - b.part || a.id.localeCompare(b.id));
  }, [reader, data, initialIdeas]);

  const related = useMemo(() => {
    if (!reader) return [];
    return series.filter((idea) => idea.id !== reader.id).slice(0, 4);
  }, [reader, series]);

  const readerArticle = reader ? articleMap[reader.article] : undefined;
  const readerArc = reader ? arcMap[reader.article] : undefined;

  const explainerIdeas = useMemo(() => {
    if (!explainerArticle) return [];
    const source = data?.ideas ?? initialIdeas;
    return source
      .filter((idea) => idea.article === explainerArticle)
      .sort((a, b) => a.part - b.part || a.id.localeCompare(b.id));
  }, [explainerArticle, data, initialIdeas]);

  const explainer = explainerArticle ? articleMap[explainerArticle] : undefined;
  const menuArticle = menuIdea ? articleMap[menuIdea.article] : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopicTabs active={topic ?? mode} onSelect={selectTab} />
      <div className="relative h-0.5 shrink-0 overflow-hidden bg-white/[0.035]">
        <div
          className="h-full bg-lime transition-[width] duration-150"
          style={{ width: `${Math.max(2, progress * 100)}%` }}
        />
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="snap-feed no-scrollbar relative min-h-0 flex-1 overflow-y-auto"
      >
        {followingEmpty ? (
          <section className="flex h-full snap-start flex-col items-center justify-center px-8 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-lime/10 text-lime">
              <Compass size={26} />
            </span>
            <h2 className="mt-5 font-serif text-4xl leading-tight text-cream">Pick a few rabbit holes</h2>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted">
              Follow topics you're curious about and this tab becomes your own syllabus.
            </p>
            <Link
              href="/topics"
              className="tap mt-6 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-[13px] font-semibold text-ink"
            >
              Choose topics <ArrowRight size={14} />
            </Link>
          </section>
        ) : (
          <>
            {entries.slice(0, visibleCount).map((entry, index) => {
              if (entry.type === "quiz") {
                const article = articleMap[entry.quiz.article];
                if (!article) return null;
                return (
                  <QuizCard
                    key={`quiz-${entry.quiz.id}-${index}`}
                    quiz={entry.quiz}
                    article={article}
                    onAnswered={(correct) => answerQuiz(entry.quiz, correct)}
                    onNext={() => scrollToIndex(index + 1)}
                  />
                );
              }
              const article = articleMap[entry.idea.article];
              if (!article) return null;
              return (
                <FeedCard
                  key={entry.idea.id}
                  idea={entry.idea}
                  article={article}
                  liked={liked.has(entry.idea.id)}
                  saved={saved.has(entry.idea.id)}
                  showHint={index === 0 && activeIndex === 0}
                  onLike={(force) => toggleLike(entry.idea.id, force)}
                  onSave={() => toggleSave(entry.idea)}
                  onOpen={() => openReader(entry.idea)}
                  onSource={() => openSource(entry.idea, article)}
                  onMore={() => setMenuIdea(entry.idea)}
                  onReadExplainer={() => openExplainer(entry.idea)}
                  nextTitle={
                    entry.idea.part < entry.idea.parts
                      ? entries
                          .slice(index + 1)
                          .find((next): next is { type: "idea"; idea: Idea } => next.type === "idea")
                          ?.idea.title
                      : undefined
                  }
                />
              );
            })}

            {ready && visibleCount > entries.length ? (
              <section className="flex h-full snap-start flex-col items-center justify-center px-8 text-center">
                <span className="grid size-16 place-items-center rounded-2xl bg-lime/10 text-lime">
                  <Sparkles size={26} />
                </span>
                <h2 className="mt-5 text-balance font-serif text-4xl leading-tight text-cream">
                  You're all caught up.
                </h2>
                <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted">
                  Every idea in this mix has been served. Reshuffle for a new angle, or test what stuck.
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <button
                    onClick={refreshFeed}
                    className="tap inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-[12px] font-semibold text-ink"
                  >
                    <RefreshCw size={13} /> Reshuffle
                  </button>
                  <Link
                    href="/quiz"
                    className="tap inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-[12px] font-medium text-cream"
                  >
                    <Trophy size={13} /> Daily quiz
                  </Link>
                </div>
                <div className="mt-8 grid w-full max-w-xs grid-cols-3 gap-2">
                  {[
                    { label: "read", value: stats.totalRead },
                    { label: "streak", value: stats.streak },
                    { label: "XP", value: stats.xp },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] py-3">
                      <p className="font-serif text-xl text-cream">{item.value}</p>
                      <p className="text-[9px] uppercase tracking-[0.14em] text-muted">{item.label}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {!ready ? (
              <section className="flex h-full snap-start flex-col items-center justify-center gap-3 px-8 text-center">
                <span className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-lime" />
                <p className="text-[12px] text-muted">Loading the rest of the library…</p>
              </section>
            ) : null}
          </>
        )}
      </div>

      {reader && readerArticle ? (
        <IdeaReader
          idea={reader}
          article={readerArticle}
          liked={liked.has(reader.id)}
          saved={saved.has(reader.id)}
          related={related}
          series={[]}
          terms={[]}
          onClose={closeReader}
          onLike={() => toggleLike(reader.id)}
          onSave={() => toggleSave(reader)}
          onSource={() => openSource(reader, readerArticle)}
          onShare={() => shareIdea(reader, readerArticle)}
          onReadExplainer={() => {
            setReader(null);
            openExplainer(reader);
          }}
          onAddToCollection={() => setCollectionIdea(reader)}
          onHighlight={addHighlight}
          onOpenRelated={(idea) => setReader(idea)}
        />
      ) : null}

      {explainer && explainerIdeas.length ? (
        <ExplainerReader
          article={explainer}
          ideas={explainerIdeas}
          onClose={closeExplainer}
          onOpenCard={(idea) => {
            setExplainerArticle(null);
            openReader(idea);
          }}
          onSource={() => openSource(explainerIdeas[0], explainer)}
        />
      ) : null}

      <CollectionPicker
        open={Boolean(collectionIdea)}
        onClose={() => setCollectionIdea(null)}
        idea={collectionIdea}
        collections={collections}
        onToggle={addToCollection}
        onCreate={createCollection}
      />

      <Sheet
        open={Boolean(menuIdea)}
        onClose={() => setMenuIdea(null)}
        title={menuIdea?.title}
        description={menuArticle ? `From ${menuArticle.title}` : undefined}
      >
        <div className="space-y-1.5">
          <MenuRow
            icon={FolderPlus}
            label="Save to a collection"
            description="Group ideas by project, interview prep, or rabbit hole."
            onClick={() => {
              if (menuIdea) setCollectionIdea(menuIdea);
              setMenuIdea(null);
            }}
          />
          <MenuRow
            icon={Share2}
            label="Share this idea"
            description="Send a link to the original essay."
            onClick={() => {
              if (menuIdea && menuArticle) void shareIdea(menuIdea, menuArticle);
              setMenuIdea(null);
            }}
          />
          {menuIdea?.reference ? (
            <MenuRow
              icon={BookOpen}
              label="Further reading"
              description={menuIdea.reference.title}
              onClick={() => {
                if (menuIdea?.reference) {
                  window.open(menuIdea.reference.url, "_blank", "noopener,noreferrer");
                }
                setMenuIdea(null);
              }}
            />
          ) : null}
          <MenuRow
            icon={ArrowUpRight}
            label="Open the original"
            description={menuArticle?.title}
            onClick={() => {
              if (menuIdea && menuArticle) openSource(menuIdea, menuArticle);
              setMenuIdea(null);
            }}
          />
          <MenuRow
            icon={RefreshCw}
            label="Reshuffle my feed"
            description="Same library, a different order."
            onClick={() => {
              refreshFeed();
              setMenuIdea(null);
            }}
          />
        </div>
        <p className={cn("mt-4 text-center text-[10px] text-muted/60")}>
          Every idea links back to Arpit Bhayani's original essay.
        </p>
      </Sheet>
    </div>
  );
}
