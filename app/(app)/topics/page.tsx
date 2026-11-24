import type { Metadata } from "next";
import { TopicsClient } from "@/components/topics/TopicsClient";
import { requireOnboardedUser } from "@/lib/session";
import { getUserState, topicSummary } from "@/lib/state";

export const metadata: Metadata = { title: "Topics" };

export default async function TopicsPage() {
  const user = await requireOnboardedUser();
  const state = await getUserState(user.id);

  return <TopicsClient topics={topicSummary()} initialInterests={state.interests} />;
}
