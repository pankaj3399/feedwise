import fs from "node:fs/promises";
import path from "node:path";

const BASE = "https://arpitbhayani.me";
const OUT = path.join(import.meta.dirname, "..", ".cache", "pages");
await fs.mkdir(OUT, { recursive: true });

const listing = await fetch(`${BASE}/blogs/`).then((r) => r.text());
const slugs = [...new Set(
  [...listing.matchAll(/href="\/blogs\/([a-z0-9-]+)"/g)].map((m) => m[1]),
)];

console.log(`Found ${slugs.length} posts`);

let done = 0;
const queue = [...slugs];
async function worker() {
  while (queue.length) {
    const slug = queue.shift();
    const file = path.join(OUT, `${slug}.html`);
    try {
      await fs.access(file);
    } catch {
      const res = await fetch(`${BASE}/blogs/${slug}`);
      if (!res.ok) {
        console.error(`FAIL ${slug} ${res.status}`);
        continue;
      }
      await fs.writeFile(file, await res.text());
    }
    done++;
    if (done % 10 === 0) console.log(`${done}/${slugs.length}`);
  }
}

await Promise.all(Array.from({ length: 8 }, worker));
console.log("DONE", done);
