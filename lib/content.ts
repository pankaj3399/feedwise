import "server-only";
import feedJson from "@/content/feed.json";
import quizJson from "@/content/quizzes.json";
import type { FeedData, Quiz } from "./types";

export const feedData = feedJson as unknown as FeedData;
export const quizBank = quizJson as unknown as Quiz[];

export const allIdeas = feedData.ideas;
export const allArticles = Object.values(feedData.articles);
export const ideaById = new Map(allIdeas.map((idea) => [idea.id, idea]));

export function articleOf(ideaId: string) {
  const idea = ideaById.get(ideaId);
  return idea ? feedData.articles[idea.article] : undefined;
}
