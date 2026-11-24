import type { Metadata } from "next";
import { SavedClient } from "@/components/saved/SavedClient";
import { allIdeas, feedData } from "@/lib/content";
import { requireOnboardedUser } from "@/lib/session";
import { getUserState } from "@/lib/state";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const user = await requireOnboardedUser();
  const state = await getUserState(user.id);
  const ids = new Set([...state.saved, ...state.liked, ...state.collected]);
  const ideas = allIdeas.filter((idea) => ids.has(idea.id));

  return <SavedClient initialState={state} ideas={ideas} articles={feedData.articles} />;
}
