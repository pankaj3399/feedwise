import crypto from "node:crypto";
import { z } from "zod";
import { currentUser, apiError, assertSameOrigin, json, readJson } from "@/lib/api";
import { execute } from "@/lib/db";
import { quizBank } from "@/lib/content";
import { todayIn } from "@/lib/utils";

export const runtime = "nodejs";

const schema = z.object({
  quizId: z.string().min(1).max(160),
  correct: z.boolean(),
});

const quizIds = new Set(quizBank.map((q) => q.id));

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return apiError("Invalid request origin.", 403);
  const user = await currentUser();
  if (!user) return apiError("Unauthorized.", 401);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return apiError("Invalid request.", 400);
  if (!quizIds.has(parsed.data.quizId)) return apiError("Unknown quiz.", 404);

  await execute(
    "INSERT INTO quiz_attempts (id, user_id, quiz_id, correct, day) VALUES ($1, $2, $3, $4, $5)",
    [crypto.randomUUID(), user.id, parsed.data.quizId, parsed.data.correct, todayIn(user.timezone)],
  );
  return json({ ok: true });
}
