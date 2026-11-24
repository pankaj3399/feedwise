import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { query, execute } from "./db";
import { normalizeEmail } from "./utils";
import type { User } from "./types";

const COOKIE = "fw_session";
const SESSION_DAYS = 30;

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  daily_goal: number;
  onboarded: boolean;
  timezone: string;
  created_at: string;
};

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    dailyGoal: row.daily_goal,
    onboarded: row.onboarded,
    timezone: row.timezone,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await execute("DELETE FROM sessions WHERE expires_at < now()");
  await execute("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    userId,
    expires.toISOString(),
  ]);
  await setSessionCookie(token);
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await execute("DELETE FROM sessions WHERE token = $1", [hashToken(token)]);
  }
  jar.delete(COOKIE);
}

export async function getUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await query<UserRow>(
    `SELECT u.id, u.email, u.name, u.daily_goal, u.onboarded, u.timezone, u.created_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()
     LIMIT 1`,
    [hashToken(token)],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export class AuthError extends Error {}

export async function signUp(input: {
  email: string;
  password: string;
  name?: string;
  timezone?: string;
}): Promise<User> {
  const email = normalizeEmail(input.email);
  const existing = await query<{ id: string }>("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
  if (existing.length) throw new AuthError("An account with this email already exists.");

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(input.password, 11);
  const name = input.name?.trim() || email.split("@")[0];
  const timezone = input.timezone || "UTC";

  try {
    await execute(
      `INSERT INTO users (id, email, password_hash, name, timezone, onboarded)
       VALUES ($1, $2, $3, $4, $5, FALSE)`,
      [id, email, passwordHash, name, timezone],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("duplicate key") || message.includes("unique")) {
      throw new AuthError("An account with this email already exists.");
    }
    throw error;
  }

  const collectionId = crypto.randomUUID();
  await execute("INSERT INTO collections (id, user_id, name, emoji) VALUES ($1, $2, $3, $4)", [
    collectionId,
    id,
    "Read later",
    "📚",
  ]);

  const rows = await query<UserRow>(
    "SELECT id, email, name, daily_goal, onboarded, timezone, created_at FROM users WHERE id = $1",
    [id],
  );
  await createSession(id);
  return mapUser(rows[0]);
}

export async function signIn(input: {
  email: string;
  password: string;
  timezone?: string;
}): Promise<User> {
  const email = normalizeEmail(input.email);
  const rows = await query<UserRow & { password_hash: string }>(
    `SELECT id, email, name, daily_goal, onboarded, timezone, created_at, password_hash
     FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );
  const row = rows[0];
  if (!row) throw new AuthError("Email or password is incorrect.");
  const ok = await bcrypt.compare(input.password, row.password_hash);
  if (!ok) throw new AuthError("Email or password is incorrect.");

  if (input.timezone && input.timezone !== row.timezone) {
    await execute("UPDATE users SET timezone = $1 WHERE id = $2", [input.timezone, row.id]);
    row.timezone = input.timezone;
  }

  await createSession(row.id);
  return mapUser(row);
}
