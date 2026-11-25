import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const DIR = path.join(import.meta.dirname, "..", ".cache", "pages");
const OUT = path.join(import.meta.dirname, "..", "content");
await fs.mkdir(OUT, { recursive: true });

// Hand-written, editorially typed cards. When an essay is present here, its
// curated cards replace the mechanical extraction for that essay.
const curated = {};
try {
  const raw = JSON.parse(await fs.readFile(path.join(OUT, "curated.json"), "utf8"));
  for (const card of raw) {
    (curated[card.article] ||= []).push(card);
  }
} catch {
  // No curated overlay yet; every essay falls back to extraction.
}

function normaliseCurated(slug, cards) {
  return cards
    .map((card, index) => {
      const blocks = (card.blocks ?? [])
        .map((block) => {
          if (block.type === "p") {
            const text = String(block.text ?? "").replace(/\s+/g, " ").trim();
            return text ? { type: "p", text } : null;
          }
          if (block.type === "list") {
            const items = (block.items ?? []).map((item) => String(item).trim()).filter(Boolean);
            return items.length ? { type: "list", ordered: Boolean(block.ordered), items } : null;
          }
          return null;
        })
        .filter(Boolean);
      const wordCount = blocks.reduce((n, block) => {
        if (block.type === "p") return n + words(block.text);
        if (block.type === "list") return n + words(block.items.join(" "));
        return n;
      }, 0);
      return {
        id: card.id || `${slug}--curated-${index + 1}`,
        article: slug,
        title: String(card.title ?? "").trim(),
        section: card.section || null,
        anchor: card.anchor || "",
        part: index + 1,
        parts: cards.length,
        lead: null,
        type: card.type || null,
        takeaway: card.takeaway || null,
        blocks,
        words: wordCount,
        kind: "insight",
      };
    })
    .filter((card) => card.title && card.blocks.length)
    .map((card, index, all) => ({ ...card, part: index + 1, parts: all.length }));
}

const DROP_SECTIONS =
  /^(footnotes?|references?|bibliography|credits?|further reading|sources?|prerequisites?|conclusion|summary|wrapping up)$/i;

const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

const STOPWORDS = new Set(
  `about above after again against because before being below between could doing down during each from further have having here into itself just like more most much must only other over same should some such than that their them then there these they this those through under until very want were what when where which while will with would your yours yourself`.split(
    /\s+/,
  ),
);

function inlineText($, el) {
  const $el = $(el);
  $el.find(".katex").each((_, k) => {
    const tex = $(k).find('annotation[encoding="application/x-tex"]').first().text().trim();
    if (tex) $(k).replaceWith("`" + tex.replace(/\s+/g, " ") + "`");
    else $(k).remove();
  });
  $el.find(".katex-mathml, .katex-html").remove();
  $el.find("code").each((_, c) => {
    const txt = $(c).text().replace(/\s+/g, " ").trim();
    $(c).replaceWith("`" + txt + "`");
  });
  $el.find("strong, b").each((_, c) => {
    const txt = $(c).text().trim();
    $(c).replaceWith("**" + txt + "**");
  });
  $el.find("em, i").each((_, c) => {
    const txt = $(c).text().trim();
    $(c).replaceWith("*" + txt + "*");
  });
  $el.find("br").replaceWith(" ");
  return $el.text().replace(/\s+/g, " ").trim();
}

function blockFrom($, el) {
  const tag = el.tagName;
  if (tag === "p") {
    const text = inlineText($, el);
    if (!text) return null;
    return { type: "p", text };
  }
  if (tag === "ul" || tag === "ol") {
    const items = $(el)
      .children("li")
      .map((_, li) => inlineText($, li))
      .get()
      .filter(Boolean);
    if (!items.length) return null;
    return { type: "list", ordered: tag === "ol", items };
  }
  if (tag === "blockquote") {
    const text = inlineText($, el);
    if (!text) return null;
    return { type: "quote", text };
  }
  if (tag === "pre") {
    const text = $(el).text().replace(/\n{3,}/g, "\n\n").trim();
    if (!text) return null;
    const lang = $(el).attr("data-language") || "";
    return { type: "code", lang, text };
  }
  if (tag === "table") {
    const rows = [];
    $(el).find("tr").each((_, tr) => {
      const cells = $(tr).children("th,td").map((_, td) => inlineText($, td)).get();
      if (cells.length) rows.push(cells);
    });
    if (!rows.length) return null;
    return { type: "table", rows };
  }
  if (tag === "h3" || tag === "h4") {
    const text = inlineText($, el);
    if (!text) return null;
    return { type: "h3", text };
  }
  if (tag === "div" || tag === "figure" || tag === "section") {
    const text = inlineText($, el);
    return text ? { type: "p", text } : null;
  }
  return null;
}

// ---------------------------------------------------------------- sentences

const ABBREV = /\b(vs|etc|e\.g|i\.e|cf|approx|al|fig|no|eq)\./gi;

function sentences(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(ABBREV, (m) => m.replace(".", "\u0000"))
    .split(/(?<=[.!?])\s+(?=[A-Z0-9`*"(])/)
    .map((s) => s.replace(/\u0000/g, ".").trim())
    .filter(Boolean);
}

const BAD_START =
  /^(in this (essay|write-?up|post|article|blog|section)|let'?s|let me|before (we|diving|going)|for example|for instance|here('s| is| are)|the following|as (shown|we saw|discussed|mentioned)|in the (previous|next)|at this point|^(and|or|but|so|yet)\b|now (when|that|if)|because (if|it|we|you|this|that|the|a|an|they)|given that\b|say (the|a|an|you)\b|probably\b|a naive\b|a quick detour\b|imagine|consider (a|an|the)|picture|take (a|an)|suppose|note that|notice that|think of|compare (this|that)|what if|first,? |second,? |third,? |finally,? |together\b|especially\b|exactly\b|good for\b|great for\b|best for\b|ideal for\b|which\b|where\b|whose\b|more on\b|more about\b|ask |use |build |start |keep |make |run |pick |watch |move |treat |expect |reserve |set |add |choose |write |read |check |verify |measure |track |focus |stop |try |automate |replace |audit |hire |pair |throw )/i;
const WEAK_SUBJECT =
  /^(this|that|these|those|it|its|they|their|them|he|she|we|our|you|your|there|someone|somebody|nobody|everyone|people)\b/i;
const FIRST_PERSON = /\b(I|my|me)\b/;

const SIGNAL =
  /\b(because|so that|which means|therefore|thus|the (key|real|main|crucial) (idea|insight|problem|point|reason|trade-?off|trick|catch|cost|risk|goal)|in practice|this is why|that is why|instead of|unlike|whereas|however|but|only (if|when)|cannot|can't|fails?|prevents?|allows?|requires?|ensures?|forces?|costs?|scales?|compounds?|degrades?|matters?|wins?|is not|isn't|are not|aren't|trade-?off|downside|upside|bottleneck|advantage|turns out|moves?|shifts?)\b/i;
const STRONG_SIGNAL =
  /\b(the (key|real|main|crucial)|in practice|trade-?off|instead of|unlike|whereas|cannot|can't|fails?|prevents?|ensures?|costs?|bottleneck|turns out|because|which means)\b/i;

const LEAD =
  /^(however|but|so|and|yet|still|now|then|therefore|thus|also|in practice|in short|in fact|of course|that said|for now|at this point)\s*,?\s+/i;

function stripLabel(text) {
  return text
    .replace(/^\*{1,2}[^*]{1,40}\*{1,2}:?\s*/, "")
    .replace(/^(tl;?dr|summary|key takeaways?|in short|the gist)\s*:\s*/i, "")
    .replace(/^footnote:\s*/i, "")
    .replace(LEAD, "")
    .trim();
}

const SETUP_START = /^(in a|in the|in most|in many|at |before |after |the old |the traditional|traditionally|for a|for the)\b/i;

const IMPERATIVE =
  /^(isolate|clean|move|prove|generate|define|rate|measure|pick|choose|prefer|skip|avoid|add|remove|replace|build|design|deploy|run|use|start|stop|watch|track|verify|check|read|write|ask|tell|let|make|keep|set|treat|expect|reserve|automate|audit|hire|pair|throw|focus|try|evaluate|test|open|close|create|delete|update|send|fetch|query|store|cache|index|chunk|rerank|split|merge|compare|remember|note|assume)\b/i;

const FINITE =
  /\b(is|are|was|were|has|have|had|does|do|did|can|cannot|can't|will|would|should|must|may|might|needs?|means?|makes?|uses?|allows?|requires?|prevents?|ensures?|forces?|costs?|reduces?|cuts?|hits?|drops?|grows?|scales?|compounds?|matters?|wins?|fails?|works?|happens?|keeps?|moves?|shifts?|turns?|runs?|takes?|gives?|adds?|creates?|builds?|breaks?|depends?|becomes?|stops?|starts?|returns?|provides?|gets?|shows?|looks?|sounds?|finds?|writes?|reads?|stores?|sends?|calls?|handles?|supports?|avoids?|improves?|saves?|reaches?|achieves?|achieved|leaves?|removes?|deletes?|splits?|merges?|joins?|includes?|contains?|holds?|carries?|brings?|leads?|follows?|sets?|puts?|appears?|seems?|emerges?|behaves?|performs?|executes?|applies?|exists?|occurs?|enables?|counts?|fits?|matches?|loses?|pays?|lacks?)\b/i;

function isComplete(title) {
  if (!title || title.length < 24 || title.length > 190) return false;
  if (!/^[A-Z0-9`]/.test(title)) return false;
  if (title.includes("?")) return false;
  if ((title.match(/`/g) || []).length % 2) return false;
  if (/[{}→]|::/.test(title)) return false;
  if (BAD_START.test(title) || WEAK_SUBJECT.test(title) || IMPERATIVE.test(title)) return false;
  if (/\b(more on that|in the next section|we will (see|cover|look|discuss))\b/i.test(title)) return false;
  const firstClause = title.split(/[,;]/)[0];
  return FINITE.test(firstClause) || FINITE.test(title);
}
const OUTCOME =
  /\b(hit|hits|reached|achieves?|cuts?|cut |reduces?|reduced|saves?|improves?|avoids?|prevents?|enables?|allows?|wins?|costs?|drops?|dropped|grew|scales?|fails?|breaks?)\b/i;

function scoreSentence(raw, article, isItem = false) {
  const s = stripLabel(raw);
  if (s.length < 55 || s.length > 330) return -1;
  if (/[{}]|::/.test(s)) return -1;
  if (BAD_START.test(s)) return -1;
  if (LEAD.test(s)) return -1;
  if (WEAK_SUBJECT.test(s)) return -1;
  if (FIRST_PERSON.test(s)) return -1;
  if (s.includes("?")) return -1;
  if ((s.match(/`/g) || []).length % 2) return -1;
  if (!/^[A-Z0-9`]/.test(s)) return -1;
  if (/^(more on|more about|as mentioned|in the next|in the previous)\b/i.test(s)) return -1;
  if (/\b(more on that|in the next section|we will (see|cover|look|discuss)|i will (cover|explain)|as mentioned (above|earlier))\b/i.test(s)) return -1;
  if (/https?:\/\//.test(s)) return -1;
  if (/\b(figure|shown below|shown above|image above|the diagram)\b/i.test(s)) return -1;
  if (/[:;—]$/.test(s)) return -1;
  if (isItem && !/[.!]$/.test(s) && s.length < 120) return -1;

  let score = 0;
  if (isItem) score -= 0.6;
  if (SIGNAL.test(s)) score += 3;
  if (STRONG_SIGNAL.test(s)) score += 2;
  if (OUTCOME.test(s)) score += 1.2;
  if (/\d+(\.\d+)?\s?(%|x|ms|s|GB|MB|tokens?|seconds?|minutes?|hours?)\b/i.test(s)) score += 1.3;
  else if (/\d/.test(s)) score += 0.8;
  if (/[A-Z][a-z]{2,}/.test(s)) score += 0.7;
  if ((s.match(/[,;:—]/g) || []).length >= 1) score += 0.5;
  if (s.length >= 80 && s.length <= 200) score += 0.9;
  if (SETUP_START.test(s)) score -= 1.1;

  const titleWords = new Set(
    article.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );
  const hits = s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => titleWords.has(w)).length;
  if (hits >= 2) score += 1;
  return score;
}

function headline(sentence) {
  let t = stripLabel(sentence)
    .replace(/\*\*/g, "")
    .replace(
      /^(however|but|so|and|yet|still|now|then|therefore|thus|also|in practice|in short|in fact|of course|that said|for now|at this point)[,:]\s+/i,
      "",
    )
    .replace(/[.:;,\s]+$/, "")
    .trim();

  // Drop short parenthetical asides, but keep the ones carrying numbers.
  t = t.replace(/\s*\((?![^)]*\d)[^)]{0,40}\)/g, "");
  // Very long headlines read better without the trailing "(vs. 92% on ...)".
  if (t.length > 120) t = t.replace(/\s*\([^)]{0,80}\)(?=[\s,.;:]|$)/g, "");

  // "When X, Y" / "If X, Y" / "Unlike X, Y" carry the point in Y.
  const notMainClause = (clause) =>
    WEAK_SUBJECT.test(clause) || /^(and|but|so|or|yet)\b/i.test(clause);
  const unlike = t.match(/^unlike\s+[^,]{10,100},\s+(?:where\s+[^,]{10,100},\s+)?(.{30,})$/i);
  if (unlike && !notMainClause(unlike[1])) t = unlike[1];
  const instead = t.match(/^instead of\s+[^,]{10,120},\s+(.{30,})$/i);
  if (instead && !notMainClause(instead[1])) t = instead[1];
  const subordinate = t.match(
    /^(when|if|while|although|though|because|since|once|as|after|before|to|by|for|with)\b[^,]{10,120},\s+(.{30,})$/i,
  );
  if (subordinate && !notMainClause(subordinate[2])) t = subordinate[2];

  if (t.length > 190) {
    const markers = [
      "; ",
      " — ",
      ", which ",
      ", but ",
      ", while ",
      ", whereas ",
      " while ",
      " whereas ",
      ", because ",
      ", so ",
      ", and ",
      ", ",
    ];
    let cut = -1;
    for (const marker of markers) {
      const index = t.lastIndexOf(marker, 160);
      if (index >= 55) {
        cut = index;
        break;
      }
    }
    if (cut < 0) return "";
    t = t.slice(0, cut);
  }
  // Never leave a dangling open quote in the headline.
  const opens = (t.match(/“/g) || []).length;
  const closes = (t.match(/”/g) || []).length;
  if (opens > closes) t = t.slice(0, t.lastIndexOf("“")).replace(/[.:;,\s]+$/, "");

  t = t.replace(/→/g, "to");
  t = t.replace(/\*+$/, "").replace(/[.:;,\s]+$/, "");
  for (let i = 0; i < 3; i++) {
    t = t.replace(
      /\s+(the|a|an|of|to|in|on|with|for|and|or|but|that|which|as|by|from|like|than|when|while|into|onto|over|under|between|about|rather)$/i,
      "",
    );
  }
  if (t) t = t[0].toUpperCase() + t.slice(1);
  return t;
}

function sameMeaning(a, b) {
  const norm = (s) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
  const A = norm(a);
  const B = norm(b);
  if (!A.size || !B.size) return false;
  let overlap = 0;
  for (const w of A) if (B.has(w)) overlap++;
  return overlap / Math.max(A.size, B.size) > 0.55;
}

// ------------------------------------------------------------- paragraphs

function thoughtUnits(blocks) {
  const units = [];
  let current = null;
  for (const block of blocks) {
    if (block.type === "p" || block.type === "quote") {
      current = {
        text: block.text,
        quote: block.type === "quote",
        items: [],
        code: null,
        section: block.section,
        anchor: block.anchor,
        h3: block.h3 ?? null,
      };
      units.push(current);
    } else if (block.type === "list" && current) {
      current.items.push(...block.items);
    } else if (block.type === "code" && current) {
      if (!current.code) current.code = block.text;
    } else if (block.type === "h3") {
      current = null;
    }
  }
  return units;
}

function insightCount(articleWords) {
  if (articleWords <= 900) return 4;
  if (articleWords <= 1600) return 6;
  if (articleWords <= 2500) return 7;
  if (articleWords <= 3500) return 8;
  return 10;
}

function insightsFor(article, blocks) {
  const units = thoughtUnits(blocks);
  const candidates = [];

  for (const unit of units) {
    const section = unit.section ?? null;
    if (section && DROP_SECTIONS.test(section.trim())) continue;
    if (/^footnote:/i.test(unit.text)) continue;

    const textSentences = sentences(unit.text);
    const validItems = unit.items.filter(
      (item) => item.length > 25 && !/\?$/.test(item) && !/^["“]/.test(item),
    );
    const scored = textSentences
      .map((s) => ({ text: stripLabel(s), score: scoreSentence(s, article, false) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const claim =
      scored.find((x) => x.score >= 3.5 && isComplete(headline(x.text))) ?? null;
    const cleanTitle = claim ? headline(claim.text) : null;
    const fallbackTitle =
      section && section.length > 3 && !DROP_SECTIONS.test(section.trim())
        ? section.replace(/[.:;,]\s*$/, "").trim()
        : null;
    const finalTitle = cleanTitle || fallbackTitle;
    if (!finalTitle) continue;

    let unitScore = (claim?.score ?? 0) + Math.min(1.4, (scored.length - 1) * 0.35);
    if (!claim) unitScore -= 2.2;
    if (unit.code) unitScore -= 0.5;
    if (unit.quote) unitScore -= 0.4;
    if (section && /^(introduction|overview|background)$/i.test(section.trim())) unitScore -= 0.6;
    if (claim && SETUP_START.test(claim.text)) unitScore -= 0.5;

    const bodyText = claim
      ? textSentences.filter((s) => stripLabel(s) !== claim.text)
      : textSentences;
    const bodyItems = validItems;
    const bodyWords = words([...bodyText, ...bodyItems].join(" "));
    if (bodyWords < 12) unitScore -= 0.9;

    candidates.push({
      unit,
      title: finalTitle,
      titleScore: claim?.score ?? 0,
      bodyText,
      bodyItems,
      bodyWords,
      order: units.indexOf(unit),
      score: unitScore,
    });
  }

  // One section, one idea: a claim headline wins over a plain section card.
  const claimedSections = new Set(
    candidates.filter((c) => c.titleScore > 0 && c.unit.section).map((c) => c.unit.section),
  );
  const fallbackSections = new Set();
  const kept = [];
  for (const candidate of candidates) {
    const section = candidate.unit.section;
    if (!section) {
      kept.push(candidate);
      continue;
    }
    if (candidate.titleScore > 0) {
      kept.push(candidate);
      continue;
    }
    if (claimedSections.has(section) || fallbackSections.has(section)) continue;
    fallbackSections.add(section);
    kept.push(candidate);
  }

  kept.sort((a, b) => b.score - a.score);

  const limit = insightCount(article.wordCount || 0);
  const picked = [];
  const perSection = new Map();

  const take = (candidate) => {
    if (picked.length >= limit) return false;
    if (picked.includes(candidate)) return false;
    if (candidate.title.length < 18) return false;
    if (picked.some((p) => sameMeaning(p.title, candidate.title))) return false;
    const key = candidate.unit.section ?? "—";
    if ((perSection.get(key) || 0) >= 2 && picked.length < limit - 1) return false;
    perSection.set(key, (perSection.get(key) || 0) + 1);
    picked.push(candidate);
    return true;
  };

  for (const candidate of kept) take(candidate);
  // if sections were too repetitive, fill the rest without the per-section cap
  if (picked.length < limit) {
    for (const candidate of kept) {
      if (picked.length >= limit) break;
      if (picked.includes(candidate)) continue;
      if (candidate.title.length < 18) continue;
      if (picked.some((p) => sameMeaning(p.title, candidate.title))) continue;
      picked.push(candidate);
    }
  }

  picked.sort((a, b) => a.order - b.order);

  return picked.map((candidate, index) => {
    let bodyText = [...candidate.bodyText];
    let bodyItems = [...candidate.bodyItems];

    const norm = (s) =>
      stripLabel(s)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    bodyText = bodyText.filter((sentence) => norm(sentence) !== norm(candidate.title));

    // A stub line like "Mitigation strategies:" adds nothing next to the bullets.
    bodyText = bodyText.filter(
      (s) => !(/[:]$/.test(s.trim()) && words(s) < 9),
    );

    // Keep one card to one thought: at most three sentences and a short list.
    let wordBudget = 125;
    const keptText = [];
    for (const sentence of bodyText) {
      const w = words(sentence);
      if (w > wordBudget) break;
      keptText.push(sentence);
      wordBudget -= w;
      if (keptText.length >= 3) break;
    }
    const keptItems = [];
    for (const item of bodyItems) {
      const w = words(item);
      if (w > wordBudget + 40) continue;
      keptItems.push(item);
      wordBudget -= w;
      if (keptItems.length >= 5) break;
    }

    if (words(keptText.join(" ")) < 12 && !keptItems.length) {
      // A one-sentence idea often needs context from elsewhere in the essay.
      // Pick the paragraph that shares the most vocabulary with the headline,
      // rather than whichever paragraph happens to come next.
      const titleWords = new Set(
        candidate.title
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 4 && !STOPWORDS.has(w)),
      );
      let best = null;
      let bestOverlap = 0;
      for (const other of units) {
        if (other === candidate.unit) continue;
        if (words(other.text) < 14) continue;
        const otherWords = new Set(
          other.text
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 4 && !STOPWORDS.has(w)),
        );
        let overlap = 0;
        for (const word of titleWords) if (otherWords.has(word)) overlap++;
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = other;
        }
      }
      if (best && bestOverlap >= 2) {
        keptText.push(...sentences(best.text).slice(0, 2));
      }
    }

    const bodyBlocks = [];
    if (keptText.length) {
      bodyBlocks.push({ type: "p", text: keptText.join(" ") });
    }
    if (keptItems.length) {
      bodyBlocks.push({ type: "list", items: keptItems });
    }
    if (!bodyBlocks.length) {
      const rest = sentences(candidate.unit.text)
        .filter((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() !==
          candidate.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
        .join(" ");
      if (rest) bodyBlocks.push({ type: "p", text: rest });
    }

    const cleanBlocks = bodyBlocks
      .map((b) => {
        if (b.type === "p") {
          const text = b.text.replace(/\s+/g, " ").trim();
          return text ? { type: "p", text } : null;
        }
        return b;
      })
      .filter(Boolean);

    const section = candidate.unit.section ?? null;
    const wordCount = cleanBlocks.reduce((n, b) => {
      if (b.type === "p") return n + words(b.text);
      if (b.type === "list") return n + words(b.items.join(" "));
      return n;
    }, 0);
    if (!cleanBlocks.length || wordCount < 10) return null;

    return {
      id: `${article.slug}--insight-${index + 1}`,
      article: article.slug,
      title: candidate.title,
      section,
      anchor: candidate.unit.anchor ?? "",
      part: index + 1,
      parts: picked.length,
      lead: null,
      blocks: cleanBlocks,
      words: wordCount,
      kind: "insight",
    };
  })
    .filter(Boolean)
    .map((idea, index, all) => ({ ...idea, part: index + 1, parts: all.length }));
}

// ---------------------------------------------------------------- articles

const files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".html"));
const articles = {};
const ideas = [];
const corpus = {};

for (const file of files.sort()) {
  const slug = file.replace(/\.html$/, "");
  const html = await fs.readFile(path.join(DIR, file), "utf8");
  const $ = cheerio.load(html);

  const title = $("h1.title").first().text().replace(/\s+/g, " ").trim();
  const published = $('meta[property="article:published_time"]').attr("content") || "";
  const date = published.slice(0, 10);
  const categorySlug = $('meta[property="article:section"]').attr("content") || "engineering";
  const crumbs = $("nav.breadcrumb li a").map((_, a) => $(a).text().trim()).get();
  const categoryLabel = crumbs[2] || categorySlug;
  const topics = $('.tags-and-category a[href^="/topics/"]')
    .map((_, a) => $(a).text().replace(/^#/, "").trim())
    .get()
    .filter((t) => t && t !== categorySlug);
  const ld = JSON.parse($('script[type="application/ld+json"]').first().text() || "{}");
  const wordCount = ld.wordCount || 0;

  const article = {
    slug,
    title,
    url: `https://arpitbhayani.me/blogs/${slug}`,
    date,
    category: categorySlug,
    categoryLabel,
    topics: [...new Set(topics)].slice(0, 6),
    wordCount,
  };
  articles[slug] = article;

  const content = $(".blog-content").first();
  const blocks = [];
  let section = null;
  let anchor = "";
  content.children().each((_, el) => {
    const tag = el.tagName;
    if (tag === "h2") {
      section = inlineText($, el);
      anchor = $(el).attr("id") || "";
      return;
    }
    const block = blockFrom($, el);
    if (!block) return;
    if (block.type === "p" && /^\*?footnote\b/i.test(block.text.trim())) return;
    if (block.type === "h3") {
      blocks.push({ ...block, section, anchor });
      return;
    }
    blocks.push({ ...block, section, anchor });
  });

  const articleIdeas = curated[slug]?.length
    ? normaliseCurated(slug, curated[slug])
    : insightsFor(article, blocks);

  // A few short, heading-less essays have no sentence that clears the normal
  // claim bar. Still give them one honest card instead of dropping the essay.
  if (!articleIdeas.length) {
    const paragraph = blocks.find((block) => block.type === "p" && words(block.text) >= 30);
    if (paragraph) {
      const parts = sentences(paragraph.text);
      const title = headline(parts[0] ?? paragraph.text) || article.title;
      const body = parts.slice(1).join(" ");
      articleIdeas.push({
        id: `${slug}--insight-1`,
        article: slug,
        title,
        section: paragraph.section ?? null,
        anchor: paragraph.anchor ?? "",
        part: 1,
        parts: 1,
        lead: null,
        blocks: body ? [{ type: "p", text: body }] : [],
        words: words(body),
        kind: "insight",
      });
    }
  }

  ideas.push(...articleIdeas);
  corpus[slug] = {
    title,
    date,
    category: categorySlug,
    categoryLabel,
    blocks: blocks.filter((b) => b.type === "p" || b.type === "list"),
  };
}

// de-dupe ids (articles are unique, but keep ids stable and unique)
const ids = new Set();
for (const idea of ideas) {
  let id = idea.id;
  let n = 2;
  while (ids.has(id)) id = `${idea.id}-${n++}`;
  idea.id = id;
  ids.add(id);
}

const out = { generatedAt: new Date().toISOString(), articles, ideas };
await fs.mkdir(path.join(import.meta.dirname, "..", "public", "data"), { recursive: true });
await fs.writeFile(path.join(OUT, "feed.json"), JSON.stringify(out));
await fs.writeFile(path.join(import.meta.dirname, "..", "public", "data", "feed.json"), JSON.stringify(out));
await fs.writeFile(
  path.join(import.meta.dirname, "..", ".cache", "corpus.json"),
  JSON.stringify(corpus),
);

const totalWords = ideas.reduce((n, i) => n + i.words, 0);
console.log("articles", Object.keys(articles).length);
console.log("insights", ideas.length);
console.log("avg words", Math.round(totalWords / ideas.length));
console.log("size MB", (JSON.stringify(out).length / 1e6).toFixed(2));
const perArticle = ideas.reduce((acc, i) => {
  acc[i.article] = (acc[i.article] || 0) + 1;
  return acc;
}, {});
console.log("per article", Math.min(...Object.values(perArticle)), "-", Math.max(...Object.values(perArticle)));
const noInsight = Object.keys(articles).filter((slug) => !perArticle[slug]);
console.log("articles with no insights", noInsight.length, noInsight.slice(0, 10));
