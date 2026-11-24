export type Category = {
  slug: string;
  label: string;
  short: string;
  color: string;
  soft: string;
  blurb: string;
  glyph: string;
};

export const CATEGORIES: Category[] = [
  {
    slug: "distributed-systems",
    label: "Distributed Systems",
    short: "Distributed",
    color: "#A78BFA",
    soft: "rgba(167,139,250,0.14)",
    blurb: "Replication, consensus, consistency and the beautiful chaos of many machines.",
    glyph: "network",
  },
  {
    slug: "algorithms-and-data-structures",
    label: "Algorithms & Data Structures",
    short: "Algorithms",
    color: "#22D3EE",
    soft: "rgba(34,211,238,0.14)",
    blurb: "Clever tricks, probabilistic structures and code that punches above its weight.",
    glyph: "graph",
  },
  {
    slug: "systems-internals",
    label: "Systems Internals",
    short: "Internals",
    color: "#FBBF24",
    soft: "rgba(251,191,36,0.14)",
    blurb: "What actually happens under the hood — caches, syscalls, memory and CPUs.",
    glyph: "cpu",
  },
  {
    slug: "ai-systems",
    label: "AI Systems",
    short: "AI",
    color: "#F472B6",
    soft: "rgba(244,114,182,0.14)",
    blurb: "LLMs, embeddings, RAG and the engineering behind intelligent systems.",
    glyph: "spark",
  },
  {
    slug: "career-growth",
    label: "Career Growth",
    short: "Career",
    color: "#34D399",
    soft: "rgba(52,211,153,0.14)",
    blurb: "Habits, leverage and the long game of becoming a better engineer.",
    glyph: "arrow",
  },
];

const FALLBACK: Category = {
  slug: "engineering",
  label: "Engineering",
  short: "Engineering",
  color: "#94A3B8",
  soft: "rgba(148,163,184,0.14)",
  blurb: "Ideas worth keeping.",
  glyph: "spark",
};

export function categoryOf(slug: string): Category {
  return CATEGORIES.find((c) => c.slug === slug) ?? FALLBACK;
}

export function categoryByLabel(label: string): Category {
  return CATEGORIES.find((c) => c.label === label) ?? FALLBACK;
}
