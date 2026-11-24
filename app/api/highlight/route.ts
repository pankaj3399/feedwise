import { z } from "zod";
import { currentUser, apiError, assertSameOrigin, json, readJson } from "@/lib/api";
import { execute } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({ id: z.string().min(1).max(80) });

export async function DELETE(request: Request) {
  if (!assertSameOrigin(request)) return apiError("Invalid request origin.", 403);
  const user = await currentUser();
  if (!user) return apiError("Unauthorized.", 401);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return apiError("Invalid request.", 400);

  await execute("DELETE FROM highlights WHERE id = $1 AND user_id = $2", [parsed.data.id, user.id]);
  return json({ ok: true });
}
