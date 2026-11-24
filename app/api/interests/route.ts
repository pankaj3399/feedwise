import { z } from "zod";
import { currentUser, apiError, assertSameOrigin, json, readJson } from "@/lib/api";
import { execute } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

export const runtime = "nodejs";

const schema = z.object({
  topics: z.array(z.string().max(80)).max(10),
});

export async function PUT(request: Request) {
  if (!assertSameOrigin(request)) return apiError("Invalid request origin.", 403);
  const user = await currentUser();
  if (!user) return apiError("Unauthorized.", 401);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return apiError("Invalid request.", 400);

  const allowed = new Set(CATEGORIES.map((c) => c.slug));
  const topics = [...new Set(parsed.data.topics)].filter((t) => allowed.has(t));

  await execute("DELETE FROM interests WHERE user_id = $1", [user.id]);
  for (const topic of topics) {
    await execute("INSERT INTO interests (user_id, topic) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
      user.id,
      topic,
    ]);
  }
  return json({ ok: true, topics });
}
