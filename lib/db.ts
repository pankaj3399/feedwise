import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";

type Row = Record<string, unknown>;

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    daily_goal INTEGER NOT NULL DEFAULT 10,
    onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS idea_state (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idea_id TEXT NOT NULL,
    liked BOOLEAN NOT NULL DEFAULT FALSE,
    saved BOOLEAN NOT NULL DEFAULT FALSE,
    read_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, idea_id)
  )`,
  `CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🔖',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS collection_items (
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    idea_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, idea_id)
  )`,
  `CREATE TABLE IF NOT EXISTS highlights (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idea_id TEXT NOT NULL,
    text TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS reads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idea_id TEXT NOT NULL,
    day TEXT NOT NULL,
    seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS reads_user_day ON reads(user_id, day)`,
  `CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL,
    correct BOOLEAN NOT NULL,
    day TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS quiz_user_day ON quiz_attempts(user_id, day)`,
  `CREATE TABLE IF NOT EXISTS interests (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    PRIMARY KEY (user_id, topic)
  )`,
];

type Db = {
  query: (text: string, params?: unknown[]) => Promise<Row[]>;
  exec: (text: string) => Promise<void>;
};

const globalForDb = globalThis as unknown as { __feedwiseDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, {
      max: 3,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
    });
    for (const statement of STATEMENTS) {
      await sql.unsafe(statement);
    }
    return {
      query: async (text, params = []) => (await sql.unsafe(text, params as never[])) as unknown as Row[],
      exec: async (text) => {
        await sql.unsafe(text);
      },
    };
  }

  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is not set. Add your Postgres connection string in Vercel → Project → Settings → Environment Variables.",
    );
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || ".data/feedwise";
  await mkdir(path.dirname(dir), { recursive: true });
  const pglite = new PGlite(dir);
  await pglite.waitReady;
  for (const statement of STATEMENTS) {
    await pglite.exec(statement);
  }
  return {
    query: async (text, params = []) => {
      const result = await pglite.query(text, params);
      return result.rows as Row[];
    },
    exec: async (text) => {
      await pglite.exec(text);
    },
  };
}

function getDb(): Promise<Db> {
  if (!globalForDb.__feedwiseDb) {
    globalForDb.__feedwiseDb = connect().catch((error) => {
      globalForDb.__feedwiseDb = undefined;
      throw error;
    });
  }
  return globalForDb.__feedwiseDb;
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return (await db.query(text, params)) as T[];
}

export async function execute(text: string, params: unknown[] = []): Promise<void> {
  const db = await getDb();
  await db.query(text, params);
}
