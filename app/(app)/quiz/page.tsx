import type { Metadata } from "next";
import { QuizClient } from "@/components/quiz/QuizClient";
import { feedData } from "@/lib/content";
import { requireOnboardedUser } from "@/lib/session";
import { getTodayQuizAttempts, getUserState, quizzesFor } from "@/lib/state";

export const metadata: Metadata = { title: "Daily quiz" };

export default async function QuizPage() {
  const user = await requireOnboardedUser();
  const [state, { today, attempts }] = await Promise.all([
    getUserState(user.id),
    getTodayQuizAttempts(user.id, user.timezone),
  ]);
  const quizzes = quizzesFor(state.read, state.interests, today, 6);

  return (
    <QuizClient
      quizzes={quizzes}
      articles={feedData.articles}
      attempts={attempts}
      today={today}
    />
  );
}
