# Feedwise

**doomscroll, but wiser.**

Feedwise is a small, installable reading app that replaces the reflex scroll with a feed of **concepts worth learning**. Every card is one transferable idea pulled from the 112 engineering essays on [arpitbhayani.me](https://arpitbhayani.me/blogs/). One essay can yield one, two, or three concepts — never a section-by-section breakdown. Each card cites the essay and section, and adds a real further-reading link when the essay itself cites one, with streaks, XP, recall quizzes, saved ideas, collections, highlights and notes on top.

> Feedwise is an independent, personal reading layer. All ideas and underlying essays belong to Arpit Bhayani; cards are editorial paraphrases and link back to the original. It is not affiliated with the author.

## What's inside

- **An endless, swipe-style feed of standalone concepts.** Feed order is deterministic per user and per day, so it stays stable while you read, and likes/saves never reshuffle it.
- **Latest tab** for a strict newest-essay-first read, plus category tabs.
- **One card, one concept.** Every card has a declarative headline, a 2–4 sentence self-contained explanation, a "why it matters" line, and an optional concrete example. Types: concept, pattern, tradeoff, failure and action.
- **Source-first.** Every card shows the essay and section. **Source** opens the exact section of the original essay; **Further reading** opens a real paper, docs page or reference that the essay itself cites, when one exists.
- **Email + password auth** with hashed passwords (`bcryptjs`) and database-backed sessions in an httpOnly cookie.
- **Daily goal + streak** with a progress ring, a 7-day chart and a 28-day heatmap.
- **XP, levels and topic mastery** across five topics: distributed systems, algorithms, systems internals, AI systems and career growth.
- **Daily recall quiz** (6 questions a day) plus inline quiz cards inside the feed. Questions are generated from numbers and inline code in the essays.
- **Saved ideas and liked ideas**, with custom collections.
- **Highlights and notes** created by selecting text in the reader.
- **Installable PWA** with a service worker, offline shell, cached content bundle and install prompts.
- **KaTeX-rendered math** where the essays used real math, and monospace chips for identifiers.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- `postgres` for hosted Postgres (Neon, Supabase, Vercel Postgres…) and `@electric-sql/pglite` as an embedded Postgres for local development
- Raw SQL, no ORM: the schema is created on first connection
- `katex`, `lucide-react`, `canvas-confetti`, `zod`

## Run it locally

Requirements: Node 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>, create an account, pick a few topics and start reading.

No database setup is needed. Without `DATABASE_URL`, the app runs an embedded Postgres (PGlite) in `.data/feedwise`, so everything — users, sessions, reads, quizzes — persists on disk between restarts.

### Environment variables

Copy `.env.example` to `.env.local` when you want to point at a real database:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | In production | Postgres connection string. When set, PGlite is not used. |
| `PGLITE_DIR` | No | Where the local embedded database lives. Defaults to `.data/feedwise`. |
| `NEXT_PUBLIC_APP_URL` | No | Canonical app URL, used in metadata. |

> PGlite needs a writable filesystem and is meant for local development only. On Vercel (or any serverless host) set `DATABASE_URL`; the app throws a clear error if it cannot open the embedded database.

## Deploy to Vercel + Neon

1. Create a free Postgres database at [Neon](https://neon.tech) (or use Vercel Postgres / Supabase).
2. Copy its connection string, including `?sslmode=require`.
3. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
4. Add `DATABASE_URL` as a Production (and Preview) environment variable.
5. Deploy. Tables are created automatically on the first request.

Nothing else is required — there are no migrations to run and no background jobs.

## Content pipeline

The generated content is committed, so you only need this if you want to refresh the library.

```bash
pnpm content:fetch           # scrape the 112 essay pages into .cache/pages
pnpm content:merge-concepts  # merge concept batches into content/concepts.json
pnpm content:build           # rebuild content/feed.json + content/quizzes.json
pnpm content:concepts        # merge + build
pnpm content                 # fetch + build
```

The feed source is `content/concepts.json`: an array of standalone concepts with a headline, type, 2–4 sentence explanation, "why it matters", the source section, and an optional further-reading link. The six newest essays are hand-maintained in `content/concepts-manual.json`; the rest are merged from `.cache/concepts/batch-*.json`.

`scripts/merge-concepts.mjs` validates:

- every essay has 1–3 concepts, never a section-by-section breakdown
- every concept has a title, type, takeaway and body
- every section/anchor points at a real block in the essay
- every `reference` URL is one the essay itself cites
- no meta language and no duplicate concepts

`content:build` also writes client-fetchable copies to `public/data/`, which the feed uses for infinite scrolling and offline reading.

The earlier card/explainer experiment (`content/curated.json`, `content/arcs.json`) remains in the repo for reference but is not used by the feed. The concept feed is built from `content/concepts.json`.

How concepts are extracted:

- Read the whole essay, not one paragraph at a time.
- Keep only transferable lessons: a pattern, concept, tradeoff, failure mode or action that still makes sense without the essay.
- One card explains one concept in 2–4 self-contained sentences, with an example when the essay provides one.
- No intro cards, no section cards, no “where this leads” sequence. If an essay has one good concept, it gets one card.
- The essay and section are always the source; a further-reading link is added only when the essay itself cites one.
- Quiz questions are generated from the full essay text, not the cards; each answer is a cloze over one number or one inline-code term, with distractors drawn from the same article/topic.

Regenerate the app icons with `pnpm icons` (requires the committed `sharp` dev dependency).

## Project layout

```
app/
  (app)/            authenticated shell: feed, saved, highlights, topics, quiz, profile
  (auth)/           login and signup
  onboarding/       3-step first-run flow
  api/              auth, idea state, collections, profile, interests, quiz, highlights
components/
  feed/             feed cards, reader, blocks renderer, inline quiz
  saved/ topics/ quiz/ profile/ highlights/ onboarding/ auth/
  content/          markdown-ish inline renderer + KaTeX
  layout/           app shell, header, bottom nav
lib/
  db.ts             dual-driver Postgres/PGlite access + schema
  auth.ts           signup, login, session tokens, cookies
  state.ts          reads, likes, saves, highlights, stats, quiz selection
  feed.ts           deterministic feed ranking, essay grouping and category interleaving
  content.ts        server-side access to the generated content
content/            generated concept feed + quiz bank (committed)
public/             manifest icons, service worker, data bundle
scripts/            scraper, concept merger, content builder, quiz builder, icon builder
```

## Notes on the data model

- `users`, `sessions`, `interests`
- `idea_state` — one row per user/idea with `liked`, `saved`, `read_count`
- `reads` — one row per read event with a local `day` string for streaks
- `collections`, `collection_items`
- `highlights` — selected text plus an optional note
- `quiz_attempts` — per question, per day; XP is only awarded the first time a question is answered correctly

XP is derived, not stored: reads × 10 + likes × 2 + saves × 3 + distinct correct quizzes × 15 + highlights × 5 + goal-days × 25. Levels follow `floor(sqrt(xp / 120)) + 1`.

## License

The application code is yours to use. The essay content, ideas and words remain the property of Arpit Bhayani — please keep the attribution and links to the original essays if you deploy this.
