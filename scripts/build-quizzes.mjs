import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const DIR = path.join(ROOT, "content");
const feed = JSON.parse(await fs.readFile(path.join(DIR, "feed.json"), "utf8"));
const { articles, ideas } = feed;

let corpus;
try {
  corpus = JSON.parse(await fs.readFile(path.join(ROOT, ".cache", "corpus.json"), "utf8"));
} catch {
  // Fallback for a feed.json produced by an older build.
  corpus = {};
  for (const [slug, article] of Object.entries(articles)) {
    corpus[slug] = {
      title: article.title,
      date: article.date,
      category: article.category,
      categoryLabel: article.categoryLabel,
      blocks: ideas
        .filter((idea) => idea.article === slug)
        .flatMap((idea) => idea.blocks)
        .filter((block) => block.type === "p"),
    };
  }
}

const STOP = new Set(
  `key value id ids next get list text index node nodes item items data name type self return true false none null for if else in is and or not the a an of to on at by with this that it its be as from into than then so we you i our your they their`.split(
    /\s+/,
  ),
);

const FIRST_PERSON = /\b(I|my|me|we|our|us)\b/;

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

const ABBREV = /\b(vs|etc|e\.g|i\.e|cf|approx|al|fig|no|eq)\./gi;

const sentences = (text) =>
  text
    .replace(/\s+/g, " ")
    .replace(ABBREV, (match) => match.replace(".", "\u0000"))
    .split(/(?<=[.!?])\s+(?=[A-Z0-9`"(])/)
    .map((s) => s.replace(/\u0000/g, ".").trim())
    .filter(Boolean);

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

const paragraphs = [];
for (const [slug, entry] of Object.entries(corpus)) {
  for (const block of entry.blocks) {
    if (block.type === "p") {
      paragraphs.push({ article: slug, section: block.section ?? null, text: block.text });
    }
  }
}

const byArticle = {};
for (const paragraph of paragraphs) (byArticle[paragraph.article] ||= []).push(paragraph);

const firstIdea = {};
const ideaBySection = {};
for (const idea of ideas) {
  firstIdea[idea.article] ||= idea.id;
  if (idea.section) {
    const key = `${idea.article}::${idea.section}`;
    ideaBySection[key] ||= idea.id;
  }
}

function termShape(t) {
  if (/^[A-Z][A-Za-z0-9]*$/.test(t)) return "camel";
  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(t)) return "snake";
  if (/^[A-Z][A-Z0-9_]+$/.test(t)) return "const";
  if (/[<>=|(){}[\]^+*/]/.test(t)) return "math";
  if (/^\d/.test(t)) return "num";
  if (/^[a-z]+$/.test(t)) return "word";
  return "other";
}

function termScore(t, article) {
  const shape = termShape(t);
  if (shape === "word") {
    const inTitle = article.title.toLowerCase().includes(t.toLowerCase());
    const inTopics = article.topics.some((x) => x.includes(t.toLowerCase()));
    return inTitle || inTopics ? 1 : -2;
  }
  if (shape === "other") return -1;
  if (/^[a-z]-?\d{2,}$/i.test(t)) return -5;
  if (/^[a-z]+$/i.test(t) && t.length <= 4) return -2;
  let score = 2;
  if (t.length >= 5) score += 1;
  if (shape === "camel" || shape === "snake") score += 1;
  if (t.includes("_")) score += 1;
  return score;
}

const allTerms = [];
for (const paragraph of paragraphs) {
  for (const m of paragraph.text.matchAll(/`([^`]{2,40})`/g)) {
    const t = m[1].trim();
    if (!t || STOP.has(t.toLowerCase())) continue;
    allTerms.push({
      term: t,
      shape: termShape(t),
      category: articles[paragraph.article].category,
      article: paragraph.article,
    });
  }
}

const questions = [];
const usedSentences = new Set();
const usedQuestions = new Set();

function shuffleOptions(correct, distractors, id) {
  const uniq = [...new Set([correct, ...distractors])];
  const chosen = uniq.slice(0, 4);
  while (chosen.length < 4) chosen.push(`—`);
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(hash(id + i) * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  return { options: chosen, answer: chosen.indexOf(correct) };
}

const fmtNum = (n, unit) => {
  const rounded = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
  const wordUnit = /^(seconds?|minutes?|hours?|days?|times?|bits?|bytes?|nodes?|partitions?|replicas?|requests?)$/i.test(unit);
  return `${rounded}${wordUnit ? " " : ""}${unit}`;
};

function numberDistractors(value, unit) {
  const n = parseFloat(value);
  if (!isFinite(n) || n <= 0) return [];
  const out = [];
  for (const v of [n * 2, n / 2, n * 1.5, n * 0.25, n * 3]) {
    const s = fmtNum(v, unit);
    if (s !== fmtNum(n, unit) && !out.includes(s)) out.push(s);
    if (out.length === 3) break;
  }
  return out;
}

const numberRe =
  /(?<![\w.,\-–])(\d+(?:\.\d+)?)\s?(%|x|ms|s|sec|seconds?|minutes?|hours?|GB|MB|KB|TB|bits?|bytes?|nodes?|partitions?|replicas?|days?|times?|requests?)(?![\w\-–])/g;

const quantityContext = /\b(need|needs|required?|requires?|about|roughly|only|up to|less than|more than|takes?|fits?|within|budget|costs?|consumes?|adds?|saves?|instead of|compared to)\b/i;

for (const [slug, list] of Object.entries(byArticle)) {
  const article = articles[slug];
  const candidates = [];

  for (const paragraph of list) {
    const ideaId =
      (paragraph.section && ideaBySection[`${slug}::${paragraph.section}`]) || firstIdea[slug];
    if (!ideaId) continue;

    for (const sentence of sentences(paragraph.text)) {
      if (sentence.length < 65 || sentence.length > 260) continue;
      if (/https?:\/\//.test(sentence)) continue;
      if (/[:;,\-–—]$/.test(sentence)) continue;
      if (/\b(figure|illustration|shown above|shown below|image above)\b/i.test(sentence)) continue;
      if (usedSentences.has(norm(sentence))) continue;

      numberRe.lastIndex = 0;
      const nums = [...sentence.matchAll(numberRe)];
      if (
        nums.length === 1 &&
        !/`/.test(sentence) &&
        !FIRST_PERSON.test(sentence) &&
        !sentence.includes("=") &&
        quantityContext.test(sentence)
      ) {
        const m = nums[0];
        const value = m[1];
        const unit = m[2];
        if (!(value === "1" && /^(x|times?)$/.test(unit))) {
          const answer = fmtNum(parseFloat(value), unit);
          const ds = numberDistractors(value, unit);
          if (ds.length >= 3) {
            candidates.push({
              kind: "number",
              ideaId,
              sentence,
              answer,
              distractors: ds.slice(0, 3),
              weight: 4,
            });
            continue;
          }
        }
      }

      const codes = [...sentence.matchAll(/`([^`]+)`/g)];
      if (codes.length === 1 && !FIRST_PERSON.test(sentence)) {
        const term = codes[0][1].trim();
        if (term.length < 2 || term.length > 28) continue;
        if (STOP.has(term.toLowerCase())) continue;
        if (term.startsWith("\\")) continue;
        if (/^[\s.,;:!?]+$/.test(term) || /^\d+$/.test(term)) continue;
        const shape = termShape(term);
        if (termScore(term, article) < 0) continue;
        if (shape === "word" && termScore(term, article) < 0) continue;

        const pick = (pool) =>
          [...new Set(pool)]
            .filter((t) => norm(t) !== norm(term))
            .filter((t) => !norm(t).includes(norm(term)) && !norm(term).includes(norm(t)))
            .filter((t) => t.length >= term.length * 0.4 && t.length <= term.length * 1.9);
        const sameShape = (t) => termShape(t) === shape;
        const articleTerms = allTerms.filter((x) => x.article === slug).map((x) => x.term);
        const catTerms = allTerms.filter((x) => x.category === article.category).map((x) => x.term);

        let ds = pick(articleTerms.filter(sameShape));
        if (ds.length < 3) ds = [...ds, ...pick(catTerms.filter(sameShape))];
        if (ds.length < 3) ds = [...ds, ...pick(articleTerms)];
        if (ds.length < 3) ds = [...ds, ...pick(catTerms)];
        ds = [...new Set(ds)].slice(0, 3);

        if (ds.length >= 3) {
          candidates.push({
            kind: "code",
            ideaId,
            sentence,
            answer: term,
            distractors: ds,
            weight: 3 + Math.max(0, termScore(term, article)),
          });
        }
      }
    }
  }

  if (!candidates.length) continue;
  candidates.sort((a, b) => b.weight - a.weight || hash(a.sentence) - hash(b.sentence));

  const picked = [];
  const seen = new Set();
  for (const c of candidates) {
    if (picked.length >= 2) break;
    const key = norm(c.sentence);
    if (seen.has(key)) continue;
    if (picked.some((p) => p.ideaId === c.ideaId)) continue;
    seen.add(key);
    picked.push(c);
  }

  picked.forEach((c, idx) => {
    usedSentences.add(norm(c.sentence));
    const id = `${slug}-q${idx + 1}`;
    const question = c.sentence.replace(c.answer, "_____").replace(/`_____`/g, "_____");
    if (usedQuestions.has(norm(question))) return;
    usedQuestions.add(norm(question));
    const { options, answer } = shuffleOptions(c.answer, c.distractors, id);
    questions.push({
      id,
      ideaId: c.ideaId,
      article: slug,
      question,
      options,
      answer,
      explanation: c.sentence,
      kind: c.kind,
    });
  });
}

questions.sort((a, b) => (articles[b.article].date || "").localeCompare(articles[a.article].date || ""));

await fs.writeFile(path.join(DIR, "quizzes.json"), JSON.stringify(questions));
await fs.mkdir(path.join(ROOT, "public", "data"), { recursive: true });
await fs.writeFile(path.join(ROOT, "public", "data", "quizzes.json"), JSON.stringify(questions));
console.log("questions", questions.length, "articles covered", new Set(questions.map((q) => q.article)).size);
const kinds = {};
for (const q of questions) kinds[q.kind] = (kinds[q.kind] || 0) + 1;
console.log(kinds);
