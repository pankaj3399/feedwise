import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const DIR = path.join(import.meta.dirname, "..", ".cache", "pages");
const OUT = path.join(import.meta.dirname, "..", "content");
await fs.mkdir(OUT, { recursive: true });

const MAX_WORDS = 270;
const MIN_WORDS = 90;
const MIN_SECTION_WORDS = 55;
const DROP_SECTIONS = /^(footnotes?|references?|bibliography|credits?|further reading|sources?)$/i;
const GENERIC_TITLES = new Set([
  "design",
  "the algorithm",
  "implementation",
  "implementation considerations",
  "notes",
  "example",
  "examples",
  "how it works",
  "putting it together",
  "wrapping up",
  "conclusion",
  "the idea",
  "overview",
  "background",
]);

const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

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
  if (tag === "hr") return null;
  if (tag === "div" || tag === "figure" || tag === "section") {
    const text = inlineText($, el);
    return text ? { type: "p", text } : null;
  }
  return null;
}

function blockWords(b) {
  if (b.type === "p" || b.type === "quote" || b.type === "h3") return words(b.text);
  if (b.type === "list") return b.items.reduce((n, i) => n + words(i), 0);
  if (b.type === "table") return b.rows.flat().reduce((n, c) => n + words(c), 0);
  if (b.type === "code") return Math.min(words(b.text), 120);
  return 0;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

const files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".html"));
const articles = {};
const ideas = [];
const seenTexts = new Set();

for (const file of files.sort()) {
  const slug = file.replace(/\.html$/, "");
  const html = await fs.readFile(path.join(DIR, file), "utf8");
  const $ = cheerio.load(html);

  const title = $("h1.title").first().text().replace(/\s+/g, " ").trim();
  const description = $('meta[name="description"]').attr("content")?.trim() || "";
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
  const blocks = content.children().map((_, el) => blockFrom($, el)).get().filter(Boolean);

  // split into h2 sections
  const sections = [];
  let current = { heading: null, anchor: null, blocks: [] };
  content.children().each((_, el) => {
    const tag = el.tagName;
    if (tag === "h2") {
      if (current.blocks.length || current.heading) sections.push(current);
      current = {
        heading: inlineText($, el),
        anchor: $(el).attr("id") || slugify(inlineText($, el)),
        blocks: [],
      };
      return;
    }
    const b = blockFrom($, el);
    if (b) current.blocks.push(b);
  });
  if (current.blocks.length || current.heading) sections.push(current);

  // hook card from description + preamble
  const preamble = sections[0]?.heading === null ? sections.shift() : null;
  const hookBlocks = [];
  const normText = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (description) hookBlocks.push({ type: "p", text: description });
  if (preamble) {
    for (const b of preamble.blocks) {
      if (b.type !== "p") continue;
      if (/^(in this (essay|post|article|blog)|let'?s|we will|we'?ll|this (essay|post))/i.test(b.text)) continue;
      if (words(b.text) < 25) continue;
      if (hookBlocks.length && normText(hookBlocks[0].text) === normText(b.text)) continue;
      if (normText(b.text).startsWith(normText(description).slice(0, 80)) && description) continue;
      hookBlocks.push(b);
      if (hookBlocks.reduce((n, x) => n + blockWords(x), 0) > 140) break;
    }
  }
  // cap hook at 2 paragraphs
  while (hookBlocks.reduce((n, x) => n + blockWords(x), 0) > 190 && hookBlocks.length > 1) hookBlocks.pop();

  if (hookBlocks.length) {
    const key = slug + "::hook";
    ideas.push({
      id: `${slug}--intro`,
      article: slug,
      title,
      anchor: "",
      part: 1,
      parts: 1,
      lead: null,
      blocks: hookBlocks,
      words: hookBlocks.reduce((n, x) => n + blockWords(x), 0),
      kind: "intro",
      key,
    });
  }

  for (const section of sections) {
    if (!section.heading) continue;
    if (DROP_SECTIONS.test(section.heading.trim())) continue;
    const prose = section.blocks.reduce((n, b) => n + blockWords(b), 0);
    const hasCode = section.blocks.some((b) => b.type === "code");
    const hasQuote = section.blocks.some((b) => b.type === "quote");
    if (prose < MIN_SECTION_WORDS && !hasCode && !hasQuote) continue;
    if (prose < 25) continue;

    // group blocks into cards
    const groups = [];
    let group = [];
    let gw = 0;
    const flush = () => {
      if (group.length && gw >= 25) groups.push({ blocks: group, words: gw });
      group = [];
      gw = 0;
    };
    for (const b of section.blocks) {
      const bw = blockWords(b);
      if (b.type === "h3" && group.length && gw > 60) {
        flush();
      }
      if (group.length && gw + bw > MAX_WORDS && gw >= MIN_WORDS) flush();
      // avoid orphan lead-in like "For example:" starting a card
      group.push(b);
      gw += bw;
      if (gw >= MAX_WORDS) flush();
    }
    flush();
    if (!groups.length) continue;

    groups.forEach((g, idx) => {
      // merge a tiny tail into previous card when possible
      if (g.words < 45 && groups.length > 1) {
        const prev = groups[idx - 1];
        if (prev) {
          prev.blocks.push(...g.blocks);
          prev.words += g.words;
          g.blocks = [];
        }
      }
    });
    const finalGroups = groups.filter((g) => {
      if (!g.blocks.length) return false;
      if (g.words >= 45) return true;
      return g.blocks.some((b) => b.type === "code" || b.type === "quote") && g.words >= 25;
    });
    finalGroups.forEach((g, idx) => {
      let cardTitle = section.heading;
      let cardBlocks = g.blocks;
      const first = cardBlocks[0];
      if (
        first?.type === "h3" &&
        (finalGroups.length > 1 || GENERIC_TITLES.has(cardTitle.toLowerCase().trim()))
      ) {
        cardTitle = first.text;
        cardBlocks = cardBlocks.slice(1);
      }
      if (!cardBlocks.length) return;
      const bodyText = cardBlocks
        .map((b) => (b.type === "list" ? b.items.join(" ") : b.type === "table" ? b.rows.flat().join(" ") : b.text || ""))
        .join(" ");
      const norm = bodyText.toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 120);
      if (seenTexts.has(norm)) return;
      seenTexts.add(norm);
      ideas.push({
        id: `${slug}--${slugify(cardTitle)}${finalGroups.length > 1 ? `--${idx + 1}` : ""}`,
        article: slug,
        title: cardTitle,
        anchor: section.anchor,
        part: idx + 1,
        parts: finalGroups.length,
        lead: null,
        blocks: cardBlocks,
        words: cardBlocks.reduce((n, b) => n + blockWords(b), 0),
        kind: "section",
        key: `${slug}::${section.anchor}::${idx + 1}`,
      });
    });
  }
}

// de-dupe ids
const ids = new Set();
for (const idea of ideas) {
  let id = idea.id;
  let n = 2;
  while (ids.has(id)) id = `${idea.id}-${n++}`;
  idea.id = id;
  ids.add(id);
  delete idea.key;
}

const out = { generatedAt: new Date().toISOString(), articles, ideas };
await fs.mkdir(path.join(import.meta.dirname, "..", "public", "data"), { recursive: true });
await fs.writeFile(path.join(OUT, "feed.json"), JSON.stringify(out));
await fs.writeFile(path.join(import.meta.dirname, "..", "public", "data", "feed.json"), JSON.stringify(out));

const totalWords = ideas.reduce((n, i) => n + i.words, 0);
console.log("articles", Object.keys(articles).length);
console.log("ideas", ideas.length);
console.log("avg words", Math.round(totalWords / ideas.length));
console.log("total words", totalWords);
console.log("size MB", (JSON.stringify(out).length / 1e6).toFixed(2));
const byCat = {};
for (const i of ideas) byCat[articles[i.article].categoryLabel] = (byCat[articles[i.article].categoryLabel] || 0) + 1;
console.log(byCat);
console.log("sample:", JSON.stringify(ideas[1], null, 2).slice(0, 900));
