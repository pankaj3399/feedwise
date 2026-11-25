export type Block =
  | { type: "p"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; lang: string; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "h3"; text: string };

export type Idea = {
  id: string;
  article: string;
  title: string;
  anchor: string;
  part: number;
  parts: number;
  lead: string | null;
  blocks: Block[];
  words: number;
  kind: "intro" | "section" | "insight";
  /** Essay section the insight came from, when it has one. */
  section?: string | null;
};

export type Article = {
  slug: string;
  title: string;
  url: string;
  date: string;
  category: string;
  categoryLabel: string;
  topics: string[];
  wordCount: number;
};

export type FeedData = {
  generatedAt: string;
  articles: Record<string, Article>;
  ideas: Idea[];
};

export type Quiz = {
  id: string;
  ideaId: string;
  article: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  kind: "number" | "code";
};

export type Collection = {
  id: string;
  name: string;
  emoji: string;
  ideaIds: string[];
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  dailyGoal: number;
  onboarded: boolean;
  timezone: string;
  createdAt: string;
};

export type UserState = {
  liked: string[];
  saved: string[];
  read: string[];
  collected: string[];
  interests: string[];
  collections: Collection[];
};

export type Mastery = {
  category: string;
  label: string;
  color: string;
  read: number;
  total: number;
  level: number;
};

export type Stats = {
  xp: number;
  level: number;
  levelProgress: number;
  xpIntoLevel: number;
  xpForLevel: number;
  streak: number;
  todayReads: number;
  todayReadIds: string[];
  goal: number;
  goalMet: boolean;
  goalDays: number;
  totalRead: number;
  totalLikes: number;
  totalSaves: number;
  totalHighlights: number;
  quizzesCorrect: number;
  weekly: { day: string; label: string; count: number }[];
  heatmap: { day: string; count: number }[];
  mastery: Mastery[];
};

export type Highlight = {
  id: string;
  ideaId: string;
  text: string;
  note: string | null;
  createdAt: string;
};

export type FeedMode = "for-you" | "following" | string;
