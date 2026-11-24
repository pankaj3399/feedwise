import crypto from "node:crypto";
import { z } from "zod";
import { currentUser, apiError, assertSameOrigin, json, readJson } from "@/lib/api";
import { execute, query } from "@/lib/db";
import { ideaById } from "@/lib/content";
import { todayIn } from "@/lib/utils";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("like"), ideaId: z.string().min(1).max(160), value: z.boolean() }),
  z.object({ action: z.literal("save"), ideaId: z.string().min(1).max(160), value: z.boolean() }),
  z.object({
    action: z.literal("read"),
    ideaId: z.string().min(1).max(160),
    seconds: z.number().int().min(0).max(3600).optional(),
  }),
  z.object({
    action: z.literal("highlight"),
    ideaId: z.string().min(1).max(160),
    text: z.string().trim().min(2).max(800),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("collection"),
    ideaId: z.string().min(1).max(160),
    collectionId: z.string().min(1).max(80),
    value: z.boolean(),
  }),
]);

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return apiError("Invalid request origin.", 403);
  const user = await currentUser();
  if (!user) return apiError("Unauthorized.", 401);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return apiError("Invalid request.", 400);
  const body = parsed.data;

  if (!ideaById.has(body.ideaId)) return apiError("Unknown idea.", 404);

  if (body.action === "like" || body.action === "save") {
    const column = body.action === "like" ? "liked" : "saved";
    await execute(
      `INSERT INTO idea_state (user_id, idea_id, ${column})
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, idea_id)
       DO UPDATE SET ${column} = $3, updated_at = now()`,
      [user.id, body.ideaId, body.value],
    );
    return json({ ok: true });
  }

  if (body.action === "read") {
    const day = todayIn(user.timezone);
    await execute(
      `INSERT INTO idea_state (user_id, idea_id, read_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, idea_id)
       DO UPDATE SET read_count = idea_state.read_count + 1, updated_at = now()`,
      [user.id, body.ideaId],
    );
    await execute(
      "INSERT INTO reads (id, user_id, idea_id, day, seconds) VALUES ($1, $2, $3, $4, $5)",
      [crypto.randomUUID(), user.id, body.ideaId, day, body.seconds ?? 0],
    );
    return json({ ok: true, day });
  }

  if (body.action === "highlight") {
    const id = crypto.randomUUID();
    await execute(
      "INSERT INTO highlights (id, user_id, idea_id, text, note) VALUES ($1, $2, $3, $4, $5)",
      [id, user.id, body.ideaId, body.text, body.note || null],
    );
    return json({ ok: true, id });
  }

  // collection toggle
  const owned = await query<{ id: string }>(
    "SELECT id FROM collections WHERE id = $1 AND user_id = $2 LIMIT 1",
    [body.collectionId, user.id],
  );
  if (!owned.length) return apiError("Collection not found.", 404);

  if (body.value) {
    await execute(
      "INSERT INTO collection_items (collection_id, idea_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [body.collectionId, body.ideaId],
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
      body.collectionId,
      body.ideaId,
    ]);
  }
  return json({ ok: true });
}
