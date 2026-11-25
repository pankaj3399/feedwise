import type { Metadata } from "next";
import { FeedClient } from "@/components/feed/FeedClient";
import { CATEGORIES } from "@/lib/categories";
import { feedData, quizBank } from "@/lib/content";
import { buildFeed } from "@/lib/feed";
import { requireOnboardedUser } from "@/lib/session";
import { getUserState } from "@/lib/state";
import { todayIn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your feed" };

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[]; mode?: string | string[] }>;
}) {
  const user = await requireOnboardedUser();
  const params = await searchParams;
  const requested = Array.isArray(params.topic) ? params.topic[0] : params.topic;
  const topic = CATEGORIES.some((category) => category.slug === requested) ? requested : undefined;
  const requestedMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode = !topic && requestedMode === "latest" ? "latest" : "for-you";

  const state = await getUserState(user.id);
  const seed = `${user.id}:${todayIn(user.timezone)}`;
  const ideas = buildFeed({
    data: feedData,
    read: state.read,
    liked: state.liked,
    saved: state.saved,
    interests: state.interests,
    seed: `${seed}:0`,
    mode,
    topic,
  });

  return (
    <FeedClient
      initialState={state}
      initialIdeas={ideas.slice(0, 12)}
      initialArticles={feedData.articles}
      quizzes={quizBank}
      seed={seed}
      initialTopic={topic}
      initialMode={mode === "latest" ? "latest" : undefined}
    />
  );
}
