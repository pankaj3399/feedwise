import type { FeedData, Idea, Quiz } from "./types";
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
  const pool = data.ideas
    .filter((idea) => {
      const article = data.articles[idea.article];
      if (!article) return false;
      if (topic && article.category !== topic) return false;
      if (mode === "following" && interests.length) return interestSet.has(article.category);
      return true;
    })
    .map((idea) => {
      const article = data.articles[idea.article];
      const cat = article.category;
      let score = rand(`${seed}:${idea.id}`) * 38;
      if (readSet.has(idea.id)) score -= 400;
      else score += 130;
      if (interestSet.has(cat)) score += 60;
      score += Math.min(affinity[cat] || 0, 40) * 1.8;
      if (idea.kind === "intro") score += 4;
      if (savedSet.has(idea.id)) score += 6;
      const ageDays = (now - new Date(`${article.date}T12:00:00Z`).getTime()) / 86400000;
      if (ageDays < 240) score += 14;
      else if (ageDays < 500) score += 7;
      return { idea, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.idea);

  // Interleave categories so the feed does not turn into a wall of one topic.
  const out: Idea[] = [];
  let lastCategory: string | null = null;
  let run = 0;
  while (pool.length) {
    let pick = -1;
    for (let i = 0; i < pool.length; i++) {
      const cat = data.articles[pool[i].article]?.category ?? "other";
      if (cat !== lastCategory || run < 2) {
        pick = i;
        break;
      }
    }
    if (pick === -1) pick = 0;
    const [idea] = pool.splice(pick, 1);
    const cat = data.articles[idea.article]?.category ?? "other";
    if (cat === lastCategory) run++;
    else {
      lastCategory = cat;
      run = 1;
    }
    out.push(idea);
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
