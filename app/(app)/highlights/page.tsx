import type { Metadata } from "next";
import { HighlightsClient } from "@/components/highlights/HighlightsClient";
import { allIdeas, feedData } from "@/lib/content";
import { requireOnboardedUser } from "@/lib/session";
import { getHighlights, getUserState } from "@/lib/state";

export const metadata: Metadata = { title: "Highlights" };

export default async function HighlightsPage() {
  const user = await requireOnboardedUser();
  const [highlights, state] = await Promise.all([getHighlights(user.id), getUserState(user.id)]);
  const ids = new Set(highlights.map((highlight) => highlight.ideaId));
  const ideas = allIdeas.filter((idea) => ids.has(idea.id));

  return (
    <HighlightsClient
      highlights={highlights}
      ideas={ideas}
      articles={feedData.articles}
      initialState={state}
    />
  );
}
