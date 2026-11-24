import { z } from "zod";
import { signIn, signUp, destroySession, AuthError } from "@/lib/auth";
import { apiError, assertSameOrigin, json, readJson } from "@/lib/api";

export const runtime = "nodejs";

const base = {
  email: z.string().trim().email("Enter a valid email address.").max(200),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  timezone: z.string().max(80).optional(),
};

const signupSchema = z.object({
  action: z.literal("signup"),
  name: z.string().trim().max(60).optional(),
  ...base,
});

const loginSchema = z.object({
  action: z.literal("login"),
  ...base,
});

const logoutSchema = z.object({ action: z.literal("logout") });

const schema = z.discriminatedUnion("action", [signupSchema, loginSchema, logoutSchema]);

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return apiError("Invalid request origin.", 403);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid request.", 400);
  }
  const body = parsed.data;

  try {
    if (body.action === "logout") {
      await destroySession();
      return json({ ok: true });
    }
    if (body.action === "signup") {
      const user = await signUp(body);
      return json({ ok: true, user });
    }
    const user = await signIn(body);
    return json({ ok: true, user });
  } catch (error) {
    if (error instanceof AuthError) return apiError(error.message, 400);
    console.error("auth error", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
