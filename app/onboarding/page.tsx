import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";
import { requireCurrentUser } from "@/lib/session";
import { getUserState, topicSummary } from "@/lib/state";
import { allArticles, allIdeas } from "@/lib/content";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireCurrentUser();
  if (user.onboarded) redirect("/feed");
  const state = await getUserState(user.id);

  return (
    <OnboardingClient
      user={user}
      topics={topicSummary()}
      initialInterests={state.interests}
      ideas={allIdeas.length.toLocaleString("en-US")}
      essays={String(allArticles.length)}
    />
  );
}
