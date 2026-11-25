import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const CONTENT = path.join(ROOT, "content");
const BATCH_DIR = path.join(ROOT, ".cache", "curated");
const TYPES = new Set([
  "thesis",
  "concept",
  "pattern",
  "tradeoff",
  "failure",
  "action",
  "result",
]);

// Editorial cleanup that must survive rebuilding from batch files.
const FIXUPS = [
  ["In the essay's example only about 5% of rows survive", "In one example, only about 5% of rows survive"],
  ["which the essay puts at seconds to minutes", "which typically lands at seconds to minutes"],
  ["In the essay's example it converged to value 12", "In one run it converged to value 12"],
  [
    "The author divides the 40-45 minutes across understanding, a naive design, hardening, follow-up questions and implementation detail.",
    "The slot is divided across 40–45 minutes: understanding, a naive design, hardening, follow-up questions and implementation detail.",
  ],
  [
    "The author reviewed his position twice a year and named which two Ps he was optimising for at each company: Power and Paisa at Practo, Position and Paisa at Amazon, Position and Power at Unacademy, Power and Paisa at Google.",
    "A twice-yearly review names which two Ps you are optimising for at each company. In one career, the trade moved from Power and Paisa to Position and Paisa, then Position and Power, then Power and Paisa.",
  ],
  ["The essay's habits share a structure", "The habits share a structure"],
  [
    "When a problem refuses to move, the author switches to email",
    "When a problem refuses to move, switch to email",
  ],
  [
    "The essay recommends returning to the same codebase",
    "A useful practice is returning to the same codebase",
  ],
  [
    "The essay's example is carrying callbacks from JavaScript into Python.",
    "One example is carrying callbacks from JavaScript into Python.",
  ],
  [
    "The essay calls this approach intuitive rather than the most efficient implementation.",
    "This approach is intuitive rather than the most efficient implementation.",
  ],
  [
    "The essay limits overloading to differing numbers of parameters",
    "In practice, overloading is limited to differing numbers of parameters",
  ],
  ["The essay caps runs at a fixed generation count", "Runs are capped at a fixed generation count"],
  [
    "the essay warns that a bad implementation produces misleading results",
    "A bad implementation produces misleading results",
  ],
  ["the essay replaces it with a hash", "The replacement is a hash"],
  [
    "The author treats unblocking as a structured practice",
    "Unblocking is treated as a structured practice",
  ],
  ["The author notes that the answer sometimes arrives", "The answer sometimes arrives"],
  [
    "The author recommends building rapport first, then asking for prioritization, persuading with business impact, and escalating through the proper channel if nothing moves.",
    "Build rapport first, then ask for prioritization, persuade with business impact, and escalate through the proper channel if nothing moves.",
  ],
  [
    "The author treats that output as a direction to investigate",
    "Treat that output as a direction to investigate",
  ],
  ["The essay's five-node example uses w=3 and r=3", "A five-node example uses w=3 and r=3"],
  ["The essay's 4-bit register with seed", "A 4-bit register with seed"],
  ["The essay's `NextNumber` does exactly that", "`NextNumber` does exactly that"],
  ["The essay is explicit that LFSRs", "LFSRs"],
  [
    "The essay uses this to build an IPython-style counter",
    "This builds an IPython-style counter",
  ],
  ["The author's routine assigns time to each phase", "A good routine assigns time to each phase"],
  ["The article's three skills:", "The three skills are:"],
];

function rewriteStrings(value) {
  if (typeof value === "string") {
    let next = value;
    for (const [from, to] of FIXUPS) next = next.split(from).join(to);
    return next;
  }
  if (Array.isArray(value)) return value.map(rewriteStrings);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = rewriteStrings(item);
    return out;
  }
  return value;
}

const words = (s) => (String(s).trim() ? String(s).trim().split(/\s+/).length : 0);
const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const existingCards = JSON.parse(await fs.readFile(path.join(CONTENT, "curated.json"), "utf8"));
const existingDetails = JSON.parse(
  await fs.readFile(path.join(CONTENT, "curated-details.json"), "utf8"),
);
const corpus = JSON.parse(await fs.readFile(path.join(ROOT, ".cache", "corpus.json"), "utf8"));
const batches = JSON.parse(await fs.readFile(path.join(BATCH_DIR, "batches.json"), "utf8"));

// Articles covered by a batch are rebuilt from scratch; everything else is
// preserved. This makes the merge idempotent.
const batchSlugs = new Set(batches.flat());
const existingByArticle = new Map();
for (const card of existingCards) {
  if (batchSlugs.has(card.article)) continue;
  if (!existingByArticle.has(card.article)) existingByArticle.set(card.article, []);
  existingByArticle.get(card.article).push(card);
}

const errors = [];
const warnings = [];
const seenIds = new Set(
  [...existingByArticle.values()].flat().map((card) => card.id),
);
const newCardsByArticle = new Map();
const newDetails = {};

// Source n-grams for copy detection.
const sourceGrams = new Map();
for (const [slug, article] of Object.entries(corpus)) {
  const text = article.blocks
    .map((block) => (block.type === "p" ? block.text : (block.items ?? []).join(" ")))
    .join(" ");
  const tokens = norm(text).split(" ").filter(Boolean);
  const grams = new Set();
  for (let i = 0; i + 12 <= tokens.length; i++) {
    grams.add(tokens.slice(i, i + 12).join(" "));
  }
  sourceGrams.set(slug, grams);
}

function longestCopy(slug, text) {
  const tokens = norm(text).split(" ").filter(Boolean);
  const grams = sourceGrams.get(slug);
  if (!grams) return 0;
  let longest = 0;
  for (let i = 0; i + 12 <= tokens.length; i++) {
    if (!grams.has(tokens.slice(i, i + 12).join(" "))) continue;
    let run = 12;
    while (i + run < tokens.length) {
      const next = tokens.slice(i, i + run + 1).join(" ");
      if (!grams.has(next)) break;
      run++;
    }
    longest = Math.max(longest, run);
  }
  return longest;
}

for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
  const batchNumber = batchIndex + 1;
  const file = path.join(BATCH_DIR, `batch-${batchNumber}.json`);
  let batch;
  try {
    batch = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    errors.push(`batch-${batchNumber}: missing or invalid JSON (${file})`);
    continue;
  }

  const assigned = new Set(batches[batchIndex]);
  const batchCards = Array.isArray(batch.cards) ? batch.cards : [];
  const batchDetails = batch.details ?? {};
  const covered = new Set();

  for (const card of batchCards) {
    const where = `batch-${batchNumber}/${card.id ?? "?"}`;
    if (!assigned.has(card.article)) {
      errors.push(`${where}: article ${card.article} is not in this batch`);
      continue;
    }
    covered.add(card.article);
    if (!card.id || seenIds.has(card.id)) errors.push(`${where}: missing or duplicate id`);
    seenIds.add(card.id);
    if (!TYPES.has(card.type)) errors.push(`${where}: invalid type ${card.type}`);
    if (!card.title || card.title.length > 110) {
      errors.push(`${where}: title missing or too long (${card.title?.length ?? 0})`);
    }
    if (!card.takeaway || card.takeaway.length < 20) {
      errors.push(`${where}: takeaway missing or too short`);
    }
    if (!Array.isArray(card.blocks) || !card.blocks.length) {
      errors.push(`${where}: no blocks`);
    }
    const bodyWords = (card.blocks ?? []).reduce((n, block) => {
      if (block.type === "p") return n + words(block.text);
      if (block.type === "list") return n + words((block.items ?? []).join(" "));
      return n;
    }, 0);
    if (bodyWords < 15 || bodyWords > 170) {
      warnings.push(`${where}: body has ${bodyWords} words`);
    }
    const detail = batchDetails[card.article]?.cards?.[card.id];
    if (!detail?.how) errors.push(`${where}: details.how missing`);
    if (card.type === "action") {
      const hasList = (card.blocks ?? []).some((block) => block.type === "list");
      if (!hasList) errors.push(`${where}: action card has no list`);
    } else if (!detail?.steps) {
      warnings.push(`${where}: no steps`);
    } else if (detail.steps.length < 2 || detail.steps.length > 6) {
      warnings.push(`${where}: ${detail.steps.length} steps`);
    }

    const text = [
      card.title,
      ...(card.blocks ?? []).map((block) =>
        block.type === "p" ? block.text : (block.items ?? []).join(" "),
      ),
    ].join(" ");
    const copy = longestCopy(card.article, text);
    if (copy >= 14) warnings.push(`${where}: ${copy}-word verbatim run`);

    if (!newCardsByArticle.has(card.article)) newCardsByArticle.set(card.article, []);
    newCardsByArticle.get(card.article).push(card);
  }

  for (const [slug, value] of Object.entries(batchDetails)) {
    if (!assigned.has(slug)) {
      errors.push(`batch-${batchNumber}: details for unassigned slug ${slug}`);
      continue;
    }
    if (!value.context) errors.push(`batch-${batchNumber}: ${slug} context missing`);
    newDetails[slug] = {
      ...(newDetails[slug] ?? {}),
      ...value,
      cards: { ...(newDetails[slug]?.cards ?? {}), ...(value.cards ?? {}) },
    };
  }

  for (const slug of assigned) {
    if (!covered.has(slug)) errors.push(`batch-${batchNumber}: ${slug} has no cards`);
    if (!batchDetails[slug]?.context) {
      errors.push(`batch-${batchNumber}: ${slug} is missing details.context`);
    }
    const count = newCardsByArticle.get(slug)?.length ?? 0;
    if (count && (count < 3 || count > 8)) {
      warnings.push(`batch-${batchNumber}: ${slug} has ${count} cards`);
    }
    const thesisCount = (newCardsByArticle.get(slug) ?? []).filter(
      (card) => card.type === "thesis",
    ).length;
    if (count && thesisCount === 0) warnings.push(`batch-${batchNumber}: ${slug} has no thesis`);
    if (thesisCount > 1) warnings.push(`batch-${batchNumber}: ${slug} has ${thesisCount} theses`);
  }
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors.slice(0, 100)) console.error(" -", error);
  if (errors.length > 100) console.error(` ... and ${errors.length - 100} more`);
  process.exit(1);
}

const merged = [];
for (const [slug, list] of existingByArticle) {
  if (!newCardsByArticle.has(slug)) merged.push(...list);
}
for (const list of newCardsByArticle.values()) {
  list
    .sort((a, b) => (a.part ?? 0) - (b.part ?? 0) || String(a.id).localeCompare(String(b.id)))
    .forEach((card, index, all) => {
      merged.push({ ...card, part: index + 1, parts: all.length, words: 0, kind: "insight" });
    });
}

await fs.writeFile(
  path.join(CONTENT, "curated.json"),
  JSON.stringify(rewriteStrings(merged), null, 2),
);
await fs.writeFile(
  path.join(CONTENT, "curated-details.json"),
  JSON.stringify(rewriteStrings({ ...existingDetails, ...newDetails }), null, 2),
);

console.log(`articles curated: ${new Set(merged.map((card) => card.article)).size}`);
console.log(`cards: ${merged.length}`);
if (warnings.length) {
  console.log(`warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 50)) console.log(" -", warning);
  if (warnings.length > 50) console.log(` ... and ${warnings.length - 50} more`);
}
