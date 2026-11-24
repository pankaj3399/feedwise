import "server-only";
import { query } from "./db";
import { feedData, allIdeas, quizBank } from "./content";
import { categoryOf, CATEGORIES } from "./categories";
import type { Collection, Highlight, Mastery, Stats, User, UserState } from "./types";
import { addDays, dayLabel, todayIn } from "./utils";

export async function getUserState(userId: string): Promise<UserState> {
  const [stateRows, interestRows, collectionRows] = await Promise.all([
    query<{ idea_id: string; liked: boolean; saved: boolean; read_count: number }>(
      "SELECT idea_id, liked, saved, read_count FROM idea_state WHERE user_id = $1",
      [userId],
    ),
    query<{ topic: string }>("SELECT topic FROM interests WHERE user_id = $1", [userId]),
    query<{ id: string; name: string; emoji: string; idea_id: string | null }>(
      `SELECT c.id, c.name, c.emoji, ci.idea_id
       FROM collections c LEFT JOIN collection_items ci ON ci.collection_id = c.id
       WHERE c.user_id = $1
       ORDER BY c.created_at ASC`,
      [userId],
    ),
  ]);

  const collections = new Map<string, Collection>();
  for (const row of collectionRows) {
    if (!collections.has(row.id)) {
      collections.set(row.id, { id: row.id, name: row.name, emoji: row.emoji, ideaIds: [] });
    }
    if (row.idea_id) collections.get(row.id)!.ideaIds.push(row.idea_id);
  }

  return {
    liked: stateRows.filter((r) => r.liked).map((r) => r.idea_id),
    saved: stateRows.filter((r) => r.saved).map((r) => r.idea_id),
    read: stateRows.filter((r) => r.read_count > 0).map((r) => r.idea_id),
    collected: [...new Set(collectionRows.map((r) => r.idea_id).filter(Boolean))] as string[],
    interests: interestRows.map((r) => r.topic),
    collections: [...collections.values()],
  };
}

export async function getStats(user: User): Promise<Stats> {
  const today = todayIn(user.timezone);
  const [counts, dayRows, readRows, todayRows] = await Promise.all([
    query<{ likes: number; saves: number; reads: number; highlights: number; quizzes: number }>(
      `SELECT
        (SELECT count(*)::int FROM idea_state WHERE user_id = $1 AND liked) AS likes,
        (SELECT count(*)::int FROM idea_state WHERE user_id = $1 AND saved) AS saves,
        (SELECT count(*)::int FROM idea_state WHERE user_id = $1 AND read_count > 0) AS reads,
        (SELECT count(*)::int FROM highlights WHERE user_id = $1) AS highlights,
        (SELECT count(distinct quiz_id)::int FROM quiz_attempts WHERE user_id = $1 AND correct) AS quizzes`,
      [user.id],
    ),
    query<{ day: string; n: number }>(
      "SELECT day, count(distinct idea_id)::int AS n FROM reads WHERE user_id = $1 GROUP BY day",
      [user.id],
    ),
    query<{ idea_id: string }>(
      "SELECT idea_id FROM idea_state WHERE user_id = $1 AND read_count > 0",
      [user.id],
    ),
    query<{ idea_id: string }>(
      "SELECT DISTINCT idea_id FROM reads WHERE user_id = $1 AND day = $2",
      [user.id, today],
    ),
  ]);

  const row = counts[0] ?? { likes: 0, saves: 0, reads: 0, highlights: 0, quizzes: 0 };
  const dayMap = new Map(dayRows.map((r) => [r.day, Number(r.n)]));
  const todayReads = dayMap.get(today) ?? 0;
  const goal = user.dailyGoal || 10;
  const goalMet = todayReads >= goal;
  const goalDays = dayRows.filter((r) => Number(r.n) >= goal).length;

  let streak = 0;
  let cursor = todayReads > 0 ? today : addDays(today, -1);
  while ((dayMap.get(cursor) ?? 0) > 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  const weekly = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    return { day, label: dayLabel(day), count: dayMap.get(day) ?? 0 };
  });
  const heatmap = Array.from({ length: 28 }, (_, i) => {
    const day = addDays(today, i - 27);
    return { day, count: dayMap.get(day) ?? 0 };
  });

  const xp =
    Number(row.reads) * 10 +
    Number(row.likes) * 2 +
    Number(row.saves) * 3 +
    Number(row.quizzes) * 15 +
    Number(row.highlights) * 5 +
    goalDays * 25;
  const level = Math.floor(Math.sqrt(xp / 120)) + 1;
  const base = 120 * (level - 1) ** 2;
  const next = 120 * level ** 2;
  const xpIntoLevel = xp - base;
  const xpForLevel = next - base;

  const readByCategory: Record<string, number> = {};
  for (const r of readRows) {
    const idea = allIdeas.find((i) => i.id === r.idea_id);
    const cat = idea ? feedData.articles[idea.article]?.category : undefined;
    if (cat) readByCategory[cat] = (readByCategory[cat] || 0) + 1;
  }
  const totals: Record<string, number> = {};
  for (const idea of allIdeas) {
    const cat = feedData.articles[idea.article]?.category;
    if (cat) totals[cat] = (totals[cat] || 0) + 1;
  }

  const mastery: Mastery[] = CATEGORIES.map((cat) => {
    const total = totals[cat.slug] || 1;
    const read = readByCategory[cat.slug] || 0;
    return {
      category: cat.slug,
      label: cat.label,
      color: cat.color,
      read,
      total,
      level: 1 + Math.min(4, Math.floor((read / total) * 5)),
    };
  });

  return {
    xp,
    level,
    levelProgress: xpForLevel ? Math.min(1, xpIntoLevel / xpForLevel) : 0,
    xpIntoLevel,
    xpForLevel,
    streak,
    todayReads,
    todayReadIds: todayRows.map((r) => r.idea_id),
    goal,
    goalMet,
    goalDays,
    totalRead: Number(row.reads),
    totalLikes: Number(row.likes),
    totalSaves: Number(row.saves),
    totalHighlights: Number(row.highlights),
    quizzesCorrect: Number(row.quizzes),
    weekly,
    heatmap,
    mastery,
  };
}

export async function getHighlights(userId: string): Promise<Highlight[]> {
  const rows = await query<{ id: string; idea_id: string; text: string; note: string | null; created_at: string }>(
    "SELECT id, idea_id, text, note, created_at FROM highlights WHERE user_id = $1 ORDER BY created_at DESC LIMIT 300",
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    ideaId: r.idea_id,
    text: r.text,
    note: r.note,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export async function getTodayQuizAttempts(userId: string, timezone: string) {
  const today = todayIn(timezone);
  const rows = await query<{ quiz_id: string; correct: boolean }>(
    "SELECT quiz_id, correct FROM quiz_attempts WHERE user_id = $1 AND day = $2",
    [userId, today],
  );
  return { today, attempts: rows };
}

export function quizzesFor(ideas: string[], interests: string[], today: string, count = 5) {
  const readSet = new Set(ideas);
  const interestSet = new Set(interests);
  const preferred = quizBank.filter((q) => {
    if (readSet.has(q.ideaId)) return true;
    const article = feedData.articles[q.article];
    return article ? interestSet.has(article.category) : false;
  });
  const source = preferred.length >= count ? preferred : quizBank;
  const seed = Number(today.replace(/-/g, "")) || 1;
  return [...source]
    .sort((a, b) => {
      const ah = (seed * 2654435761 + a.id.length * 97 + a.id.charCodeAt(0)) % 1000;
      const bh = (seed * 2654435761 + b.id.length * 97 + b.id.charCodeAt(0)) % 1000;
      return ah - bh;
    })
    .slice(0, count);
}

export function relatedIdeas(ideaId: string, limit = 4) {
  const idea = allIdeas.find((i) => i.id === ideaId);
  if (!idea) return [];
  const article = feedData.articles[idea.article];
  return allIdeas
    .filter((i) => i.id !== ideaId && i.article === idea.article)
    .slice(0, limit)
    .map((i) => ({ idea: i, article }));
}

export function topicSummary() {
  const counts: Record<string, number> = {};
  for (const idea of allIdeas) {
    const cat = feedData.articles[idea.article]?.category;
    if (cat) counts[cat] = (counts[cat] || 0) + 1;
  }
  return CATEGORIES.map((cat) => ({ ...cat, count: counts[cat.slug] || 0 }));
}

export function categoryLabel(slug: string) {
  return categoryOf(slug).label;
}
