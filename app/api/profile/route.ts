import { z } from "zod";
import { currentUser, apiError, assertSameOrigin, json, readJson } from "@/lib/api";
import { execute } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  dailyGoal: z.number().int().min(3).max(50).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  onboarded: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  if (!assertSameOrigin(request)) return apiError("Invalid request origin.", 403);
  const user = await currentUser();
  if (!user) return apiError("Unauthorized.", 401);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return apiError("Invalid request.", 400);
  const body = parsed.data;

  if (body.name !== undefined) {
    await execute("UPDATE users SET name = $1 WHERE id = $2", [body.name, user.id]);
  }
  if (body.dailyGoal !== undefined) {
    await execute("UPDATE users SET daily_goal = $1 WHERE id = $2", [body.dailyGoal, user.id]);
  }
  if (body.timezone !== undefined) {
    await execute("UPDATE users SET timezone = $1 WHERE id = $2", [body.timezone, user.id]);
  }
  if (body.onboarded !== undefined) {
    await execute("UPDATE users SET onboarded = $1 WHERE id = $2", [body.onboarded, user.id]);
  }
  return json({ ok: true });
}
