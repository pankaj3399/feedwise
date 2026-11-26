import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const CONTENT = path.join(ROOT, "content");
const BATCH_DIR = path.join(ROOT, ".cache", "arcs");
const batches = JSON.parse(
  await fs.readFile(path.join(ROOT, ".cache", "curated", "batches.json"), "utf8"),
);
const corpus = JSON.parse(await fs.readFile(path.join(ROOT, ".cache", "corpus.json"), "utf8"));

const errors = [];
const warnings = [];
const merged = {};

for (let i = 0; i < batches.length; i++) {
  const number = i + 1;
  const file = path.join(BATCH_DIR, `batch-${number}.json`);
  let batch;
  try {
    batch = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    errors.push(`batch-${number}: missing or invalid JSON (${file})`);
    continue;
  }
  const assigned = new Set(batches[i]);
  for (const [slug, arc] of Object.entries(batch)) {
    if (!assigned.has(slug) || !corpus[slug]) {
      errors.push(`batch-${number}: unexpected slug ${slug}`);
      continue;
    }
    if (merged[slug]) errors.push(`batch-${number}: duplicate slug ${slug}`);
    if (!arc.problem || arc.problem.length < 20) errors.push(`${slug}: problem too short`);
    if (!arc.primer || arc.primer.length < 20) errors.push(`${slug}: primer too short`);
    if (!arc.outro || arc.outro.length < 40) errors.push(`${slug}: outro too short`);
    if (!Array.isArray(arc.terms) || arc.terms.length < 2 || arc.terms.length > 4) {
      errors.push(`${slug}: expected 2-4 terms, got ${arc.terms?.length ?? 0}`);
    }
    for (const term of arc.terms ?? []) {
      if (!term.term || !term.definition || !term.why) {
        errors.push(`${slug}: term missing term/definition/why`);
      }
      if (term.definition && term.definition.length < 30) {
        warnings.push(`${slug}/${term.term}: definition is short`);
      }
    }
    if (!Array.isArray(arc.arc) || arc.arc.length < 3 || arc.arc.length > 4) {
      errors.push(`${slug}: expected 3-4 arc steps`);
    }
    if (!Array.isArray(arc.next) || arc.next.length < 2 || arc.next.length > 3) {
      errors.push(`${slug}: expected 2-3 next steps`);
    }
    const prose = [arc.problem, arc.primer, arc.outro, ...(arc.arc ?? []), ...(arc.next ?? [])].join(" ");
    if (/\b(this essay|this article|the author|the essay|in this post)\b/i.test(prose)) {
      warnings.push(`${slug}: meta reference in arc`);
    }
    merged[slug] = arc;
  }

  for (const slug of assigned) {
    if (!batch[slug]) errors.push(`batch-${number}: ${slug} is missing`);
  }
}

// The six editorially hand-written essays are not in a batch.
try {
  const manual = JSON.parse(await fs.readFile(path.join(CONTENT, "arcs-manual.json"), "utf8"));
  for (const [slug, arc] of Object.entries(manual)) {
    if (!corpus[slug]) {
      errors.push(`manual: unknown slug ${slug}`);
      continue;
    }
    if (merged[slug]) {
      errors.push(`manual: duplicate slug ${slug}`);
      continue;
    }
    if (!arc.problem || !arc.primer || !arc.outro) errors.push(`manual/${slug}: missing prose`);
    if (!Array.isArray(arc.terms) || arc.terms.length < 2 || arc.terms.length > 4) {
      errors.push(`manual/${slug}: expected 2-4 terms`);
    }
    if (!Array.isArray(arc.arc) || arc.arc.length < 3 || arc.arc.length > 4) {
      errors.push(`manual/${slug}: expected 3-4 arc steps`);
    }
    if (!Array.isArray(arc.next) || arc.next.length < 2 || arc.next.length > 3) {
      errors.push(`manual/${slug}: expected 2-3 next steps`);
    }
    merged[slug] = arc;
  }
} catch {
  // Manual arcs are optional.
}

for (const slug of Object.keys(corpus)) {
  if (!merged[slug]) errors.push(`${slug}: no arc produced`);
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors.slice(0, 100)) console.error(" -", error);
  if (errors.length > 100) console.error(` ... and ${errors.length - 100} more`);
  process.exit(1);
}

await fs.writeFile(path.join(CONTENT, "arcs.json"), JSON.stringify(merged, null, 2));
console.log(`essays: ${Object.keys(merged).length}`);
console.log(`terms: ${Object.values(merged).reduce((n, arc) => n + arc.terms.length, 0)}`);
if (warnings.length) {
  console.log(`warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 40)) console.log(" -", warning);
  if (warnings.length > 40) console.log(` ... and ${warnings.length - 40} more`);
}
