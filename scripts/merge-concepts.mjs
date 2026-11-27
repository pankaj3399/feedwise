import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const CONTENT = path.join(ROOT, "content");
const BATCH_DIR = path.join(ROOT, ".cache", "concepts");
const batches = JSON.parse(
  await fs.readFile(path.join(ROOT, ".cache", "curated", "batches.json"), "utf8"),
);
const corpus = JSON.parse(await fs.readFile(path.join(ROOT, ".cache", "corpus.json"), "utf8"));
const links = JSON.parse(
  await fs.readFile(path.join(ROOT, ".cache", "concept-links.json"), "utf8"),
);
const TYPES = new Set(["concept", "pattern", "tradeoff", "failure", "action"]);

const errors = [];
const warnings = [];
const concepts = [];
const seenTitles = new Map();

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

  for (const slug of assigned) {
    if (!batch[slug]) {
      errors.push(`batch-${number}: ${slug} is missing`);
      continue;
    }
  }
  for (const [slug, list] of Object.entries(batch)) {
    if (!assigned.has(slug) || !corpus[slug]) {
      errors.push(`batch-${number}: unexpected slug ${slug}`);
      continue;
    }
    if (!Array.isArray(list) || list.length < 1 || list.length > 3) {
      errors.push(`${slug}: expected 1-3 concepts, got ${list?.length ?? 0}`);
      continue;
    }
    const validRefs = new Set((links[slug] ?? []).map((link) => link.url));
    list.forEach((concept, index) => {
      const where = `${slug}/${index + 1}`;
      if (!concept.title || concept.title.length > 90) {
        errors.push(`${where}: title missing or too long`);
      }
      if (!TYPES.has(concept.type)) errors.push(`${where}: invalid type ${concept.type}`);
      if (!concept.takeaway || concept.takeaway.length < 20) {
        errors.push(`${where}: takeaway missing or too short`);
      }
      if (!concept.body || concept.body.length < 80) {
        errors.push(`${where}: body missing or too short`);
      }
      if (!concept.section) warnings.push(`${where}: no section`);
      const sentences = (concept.body?.match(/[.!?](\s|$)/g) ?? []).length;
      if (sentences < 2 || sentences > 5) warnings.push(`${where}: ${sentences} sentences`);
      if (concept.reference) {
        if (!concept.reference.url || !validRefs.has(concept.reference.url)) {
          errors.push(`${where}: reference URL is not in the essay's link list`);
        }
        if (!concept.reference.title) errors.push(`${where}: reference title missing`);
      }
      const text = `${concept.title} ${concept.takeaway} ${concept.body}`;
      if (/\b(this essay|this article|the author|the essay|in this post)\b/i.test(text)) {
        warnings.push(`${where}: meta reference`);
      }
      const titleKey = concept.title.toLowerCase();
      if (seenTitles.has(titleKey)) {
        warnings.push(`${where}: duplicate title also used by ${seenTitles.get(titleKey)}`);
      } else {
        seenTitles.set(titleKey, where);
      }
      const body = String(concept.body).replace(/\s+/g, " ").trim();
      concepts.push({
        id: `${slug}--concept-${index + 1}`,
        article: slug,
        title: concept.title,
        type: concept.type,
        takeaway: concept.takeaway,
        section: concept.section ?? "",
        anchor: concept.anchor ?? "",
        part: 1,
        parts: 1,
        lead: null,
        blocks: [{ type: "p", text: body }],
        words: body.split(/\s+/).length,
        kind: "insight",
        reference: concept.reference ?? null,
      });
    });
  }
}

// Six editorially written essays are not in a batch.
try {
  const manual = JSON.parse(await fs.readFile(path.join(CONTENT, "concepts-manual.json"), "utf8"));
  for (const [slug, list] of Object.entries(manual)) {
    if (!corpus[slug]) {
      errors.push(`manual: unknown slug ${slug}`);
      continue;
    }
    if (!Array.isArray(list) || list.length < 1 || list.length > 3) {
      errors.push(`manual/${slug}: expected 1-3 concepts`);
      continue;
    }
    const validRefs = new Set((links[slug] ?? []).map((link) => link.url));
    list.forEach((concept, index) => {
      const where = `manual/${slug}/${index + 1}`;
      if (!concept.title || concept.title.length > 90) errors.push(`${where}: bad title`);
      if (!TYPES.has(concept.type)) errors.push(`${where}: bad type`);
      if (!concept.takeaway) errors.push(`${where}: missing takeaway`);
      if (!concept.body) errors.push(`${where}: missing body`);
      if (concept.reference && !validRefs.has(concept.reference.url)) {
        errors.push(`${where}: reference URL is not in the essay's link list`);
      }
      const body = String(concept.body ?? "").replace(/\s+/g, " ").trim();
      concepts.push({
        id: `${slug}--concept-${index + 1}`,
        article: slug,
        title: concept.title,
        type: concept.type,
        takeaway: concept.takeaway,
        section: concept.section ?? "",
        anchor: concept.anchor ?? "",
        part: 1,
        parts: 1,
        lead: null,
        blocks: [{ type: "p", text: body }],
        words: body.split(/\s+/).filter(Boolean).length,
        kind: "insight",
        reference: concept.reference ?? null,
      });
    });
  }
} catch {
  // Manual concepts are optional.
}

const covered = new Set(concepts.map((concept) => concept.article));
for (const slug of Object.keys(corpus)) {
  if (!covered.has(slug)) errors.push(`${slug}: no concept produced`);
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors.slice(0, 100)) console.error(" -", error);
  if (errors.length > 100) console.error(` ... and ${errors.length - 100} more`);
  process.exit(1);
}

await fs.writeFile(path.join(CONTENT, "concepts.json"), JSON.stringify(concepts, null, 2));
console.log(`concepts: ${concepts.length}`);
console.log(`essays: ${covered.size}`);
console.log(
  `with reference: ${concepts.filter((concept) => concept.reference).length}`,
);
if (warnings.length) {
  console.log(`warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 60)) console.log(" -", warning);
  if (warnings.length > 60) console.log(` ... and ${warnings.length - 60} more`);
}
