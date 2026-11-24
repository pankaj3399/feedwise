import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const file = (p) => path.join(ROOT, p);

const LIME = "#D8FF5F";
const INK = "#08080A";

const sparkle = (size, radius) => `
  <path d="M${size / 2} ${size * 0.195}
    C${size / 2 + size * 0.022} ${size * 0.39} ${size * 0.61} ${size * 0.478} ${size * 0.805} ${size / 2}
    C${size * 0.61} ${size / 2 + size * 0.022} ${size / 2 + size * 0.022} ${size * 0.61} ${size / 2} ${size * 0.805}
    C${size / 2 - size * 0.022} ${size * 0.61} ${size * 0.39} ${size / 2 + size * 0.022} ${size * 0.195} ${size / 2}
    C${size * 0.39} ${size * 0.478} ${size / 2 - size * 0.022} ${size * 0.39} ${size / 2} ${size * 0.195} Z"
    fill="${INK}" />
`;

const svg = (size, { rounded = true, inset = 0 } = {}) => {
  const r = rounded ? size * 0.225 : 0;
  const inner = size - inset * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${r}" fill="${LIME}" />
    <g transform="translate(${inset} ${inset}) scale(${inner / size})">${sparkle(size, r)}</g>
  </svg>`;
};

const out = async (path, size, options) => {
  await sharp(Buffer.from(svg(size, options))).png().toFile(path);
  console.log("wrote", path);
};

await out(file("public/icons/icon-32.png"), 32);
await out(file("public/icons/icon-180.png"), 180);
await out(file("public/icons/icon-192.png"), 192);
await out(file("public/icons/icon-512.png"), 512);
await out(file("public/icons/icon-1024.png"), 1024);
await out(file("public/icons/apple-touch-icon.png"), 180, { rounded: false });
await out(file("public/icons/maskable-512.png"), 512, { rounded: false, inset: 56 });
await out(file("app/icon.png"), 512);
await out(file("app/apple-icon.png"), 180, { rounded: false });

// favicon
const favicon = await sharp(Buffer.from(svg(64))).resize(48, 48).png().toBuffer();
await fs.writeFile(file("app/favicon.ico"), favicon);
console.log("wrote app/favicon.ico");

// Social share card
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="#D8FF5F" stop-opacity="0.16" />
      <stop offset="100%" stop-color="#D8FF5F" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="violet" cx="100%" cy="100%" r="60%">
      <stop offset="0%" stop-color="#A78BFA" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#A78BFA" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#08080A" />
  <rect width="1200" height="630" fill="url(#glow)" />
  <rect width="1200" height="630" fill="url(#violet)" />
  <g transform="translate(84 72)">
    <rect width="60" height="60" rx="15" fill="#D8FF5F" />
    <g transform="translate(10 10)">
      <path d="M20 3.2c1.2 8 6 12.8 14 14-8 1.2-12.8 6-14 14-1.2-8-6-12.8-14-14 8-1.2 12.8-6 14-14Z" fill="#08080A" transform="scale(1.25)" />
    </g>
    <text x="80" y="44" font-family="Georgia, serif" font-size="36" fill="#F4F1E8">feedwise<tspan fill="#D8FF5F">.</tspan></text>
  </g>
  <text x="80" y="300" font-family="Georgia, serif" font-size="132" letter-spacing="-4" fill="#F4F1E8">doomscroll,</text>
  <text x="80" y="420" font-family="Georgia, serif" font-size="132" letter-spacing="-4" fill="#F4F1E8">but <tspan font-style="italic" fill="#D8FF5F">wiser</tspan>.</text>
  <text x="84" y="506" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#8F8F9D">1,125 atomic ideas from 112 engineering essays by Arpit Bhayani.</text>
  <g transform="translate(84 548)">
    <text font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="3" fill="#D8FF5F">NO ADS · NO RAGE-BAIT · READS OFFLINE</text>
  </g>
</svg>`;

await sharp(Buffer.from(og)).png().toFile(file("public/og.png"));
console.log("wrote public/og.png");
