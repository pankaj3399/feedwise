import type { Article, FeedData, Idea, Quiz } from "./types";
import { categoryOf } from "./categories";
import { rand } from "./utils";

export type FeedOptions = {
  data: FeedData;
  read?: string[];
  liked?: string[];
  saved?: string[];
  interests?: string[];
  seed?: string;
  mode?: string;
  topic?: string;
};

export type FeedEntry =
  | { type: "idea"; idea: Idea }
  | { type: "quiz"; quiz: Quiz };

function articleAgeDays(article: Article, now: number) {
  const published = new Date(`${article.date}T12:00:00Z`).getTime();
  if (!Number.isFinite(published)) return 3650;
  return Math.max(0, (now - published) / 86400000);
}

/**
 * Cards are grouped by essay so a run of cards reads like the argument of the
 * essay, in order, instead of loose paragraphs floating around the feed.
 */
export function buildFeed({
  data,
  read = [],
  liked = [],
  saved = [],
  interests = [],
  seed = "0",
  mode = "for-you",
  topic,
}: FeedOptions): Idea[] {
  const readSet = new Set(read);
  const savedSet = new Set(saved);
  const interestSet = new Set(interests);
  const affinity: Record<string, number> = {};

  for (const id of read) {
    const idea = data.ideas.find((i) => i.id === id);
    if (idea) {
      const cat = data.articles[idea.article]?.category;
      if (cat) affinity[cat] = (affinity[cat] || 0) + 1;
    }
  }
  for (const id of liked) {
    const idea = data.ideas.find((i) => i.id === id);
    if (idea) {
      const cat = data.articles[idea.article]?.category;
      if (cat) affinity[cat] = (affinity[cat] || 0) + 3;
    }
  }

  const now = Date.now();
  const grouped = new Map<string, Idea[]>();

  for (const idea of data.ideas) {
    const article = data.articles[idea.article];
    if (!article) continue;
    if (topic && article.category !== topic) continue;
    if (mode === "following" && interests.length && !interestSet.has(article.category)) continue;
    const list = grouped.get(idea.article);
    if (list) list.push(idea);
    else grouped.set(idea.article, [idea]);
  }

  const articles = [...grouped.entries()]
    .map(([slug, list]) => {
      const article = data.articles[slug];
      const category = article.category;
      const age = articleAgeDays(article, now);
      const recency = Math.exp(-age / 420) * 100;
      const interest = interestSet.has(category) ? 45 : 0;
      const affinityBoost = Math.min(affinity[category] || 0, 40) * 1.5;
      const jitter = rand(`${seed}:${slug}`) * 16;
      const readCount = list.filter((idea) => readSet.has(idea.id)).length;
      const readPenalty = (readCount / Math.max(1, list.length)) * 90;
      const savedBoost = list.filter((idea) => savedSet.has(idea.id)).length * 2;
      const fresh = rand(`${seed}:fresh:${slug}`) * 3;

      return {
        article,
        ideas: list.sort((a, b) => a.part - b.part || a.id.localeCompare(b.id)),
        score: recency + interest + affinityBoost + jitter + fresh + savedBoost - readPenalty,
        date: article.date,
        category,
      };
    })
    .sort((a, b) => b.score - a.score);

  // "Latest" is a straight chronological read: newest essay first, insights in order.
  if (mode === "latest") {
    articles.sort((a, b) => b.date.localeCompare(a.date) || a.article.slug.localeCompare(b.article.slug));
    return articles.flatMap((group) => group.ideas.map((idea) => ({ ...idea })));
  }

  // Interleave essays by category so the feed does not turn into a wall of one
  // topic — but never split one essay's insights across the feed.
  const remaining = [...articles];
  const out: Idea[] = [];
  let lastCategory: string | null = null;
  let run = 0;

  while (remaining.length) {
    let pick = -1;
    for (let i = 0; i < remaining.length; i++) {
      const category = remaining[i].category;
      if (category !== lastCategory || run < 1) {
        pick = i;
        break;
      }
    }
    if (pick === -1) pick = 0;

    const [group] = remaining.splice(pick, 1);
    if (group.category === lastCategory) run++;
    else {
      lastCategory = group.category;
      run = 0;
    }

    out.push(...group.ideas);
  }

  return out;
}

export function insertQuizzes(
  ideas: Idea[],
  quizzes: Quiz[],
  every = 12,
  offset = 0,
): FeedEntry[] {
  const entries: FeedEntry[] = [];
  let q = offset;
  ideas.forEach((idea, index) => {
    entries.push({ type: "idea", idea });
    if ((index + 1) % every === 0 && quizzes.length) {
      entries.push({ type: "quiz", quiz: quizzes[q % quizzes.length] });
      q++;
    }
  });
  return entries;
}

export function categoryCounts(data: FeedData) {
  const counts: Record<string, number> = {};
  for (const idea of data.ideas) {
    const cat = data.articles[idea.article]?.category;
    if (cat) counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}

export function categoryColorOf(data: FeedData, idea: Idea): string {
  return categoryOf(data.articles[idea.article]?.category ?? "").color;
}
