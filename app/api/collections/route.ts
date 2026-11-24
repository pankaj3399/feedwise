import crypto from "node:crypto";
import { z } from "zod";
import { currentUser, apiError, assertSameOrigin, json, readJson } from "@/lib/api";
import { execute, query } from "@/lib/db";
import { ideaById } from "@/lib/content";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(1, "Give the collection a name.").max(40),
    emoji: z.string().trim().min(1).max(8).optional(),
  }),
  z.object({
    action: z.literal("update"),
    id: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(40),
    emoji: z.string().trim().min(1).max(8).optional(),
  }),
  z.object({ action: z.literal("delete"), id: z.string().min(1).max(80) }),
  z.object({
    action: z.literal("add"),
    id: z.string().min(1).max(80),
    ideaId: z.string().min(1).max(160),
  }),
  z.object({
    action: z.literal("remove"),
    id: z.string().min(1).max(80),
    ideaId: z.string().min(1).max(160),
  }),
]);

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return apiError("Invalid request origin.", 403);
  const user = await currentUser();
  if (!user) return apiError("Unauthorized.", 401);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid request.", 400);
  const body = parsed.data;

  if (body.action === "create") {
    const count = await query<{ n: number }>(
      "SELECT count(*)::int AS n FROM collections WHERE user_id = $1",
      [user.id],
    );
    if (Number(count[0]?.n || 0) >= 30) return apiError("You have reached the collection limit.", 400);
    const id = crypto.randomUUID();
    await execute("INSERT INTO collections (id, user_id, name, emoji) VALUES ($1, $2, $3, $4)", [
      id,
      user.id,
      body.name,
      body.emoji || "🔖",
    ]);
    return json({ ok: true, id });
  }

  if (body.action === "update") {
    await execute("UPDATE collections SET name = $1, emoji = COALESCE($2, emoji) WHERE id = $3 AND user_id = $4", [
      body.name,
      body.emoji || null,
      body.id,
      user.id,
    ]);
    return json({ ok: true });
  }

  if (body.action === "delete") {
    await execute("DELETE FROM collections WHERE id = $1 AND user_id = $2", [body.id, user.id]);
    return json({ ok: true });
  }

  if (!ideaById.has(body.ideaId)) return apiError("Unknown idea.", 404);
  const owned = await query<{ id: string }>(
    "SELECT id FROM collections WHERE id = $1 AND user_id = $2 LIMIT 1",
    [body.id, user.id],
  );
  if (!owned.length) return apiError("Collection not found.", 404);

  if (body.action === "add") {
    await execute(
      "INSERT INTO collection_items (collection_id, idea_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [body.id, body.ideaId],
    );
    await execute(
      `INSERT INTO idea_state (user_id, idea_id, saved)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (user_id, idea_id)
       DO UPDATE SET saved = TRUE, updated_at = now()`,
      [user.id, body.ideaId],
    );
  } else {
    await execute("DELETE FROM collection_items WHERE collection_id = $1 AND idea_id = $2", [
      body.id,
      body.ideaId,
    ]);
  }
  return json({ ok: true });
}
