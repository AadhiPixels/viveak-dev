// Renders the static social-sharing image (1200 by 630) from the site's own
// typography and content, then writes it as the App Router file conventions:
//   src/app/opengraph-image.png, src/app/twitter-image.png and their .alt.txt files.
// Usage: node --no-warnings scripts/generate-og.mjs
// (Node 22.18+ strips the types from the content import; no build step needed.)
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { site } = await import(path.join(root, "src/content/site.ts"));

const WIDTH = 1200;
const HEIGHT = 630;

async function fontDataUri(file) {
  const buf = await fs.readFile(path.join(root, "src/app/fonts", file));
  return `data:font/woff2;base64,${buf.toString("base64")}`;
}

const [display, sans, mono] = await Promise.all([
  fontDataUri("InterTight-Variable-latin.woff2"),
  fontDataUri("Geist-Variable.woff2"),
  fontDataUri("GeistMono-Variable.woff2"),
]);

const escape = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const host = site.url.replace(/^https?:\/\//, "");

// The site mark, identical to src/components/ui/Monogram.tsx.
const monogram = (size, className = "") => `
  <svg class="${className}" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M3 8.5 10.5 24l4-8.2M13.2 8.5 20.5 24 29 8.5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9 8.5h6.4" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" opacity="0.55"/>
  </svg>`;

const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<style>
  @font-face { font-family: "Inter Tight"; src: url("${display}") format("woff2"); font-weight: 100 900; }
  @font-face { font-family: "Geist"; src: url("${sans}") format("woff2"); font-weight: 100 900; }
  @font-face { font-family: "Geist Mono"; src: url("${mono}") format("woff2"); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
  body {
    position: relative;
    background: #050507;
    color: #f4f5f7;
    font-family: "Geist", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .frame { position: absolute; inset: 0; padding: 64px 72px; display: flex; flex-direction: column; }
  .top { display: flex; align-items: center; justify-content: space-between; color: #c9ccd3; }
  .brand { display: flex; align-items: center; }
  .eyebrow { font-family: "Geist Mono", ui-monospace, monospace; font-size: 15px; letter-spacing: 0.16em; text-transform: uppercase; color: #9a9ea8; }
  .main { margin-top: auto; }
  .rule { width: 112px; height: 2px; background: #5fe0c6; margin-bottom: 28px; }
  h1 {
    font-family: "Inter Tight", "Helvetica Neue", Arial, sans-serif;
    font-weight: 600; font-size: 96px; line-height: 0.94; letter-spacing: -0.045em;
    max-width: 900px; text-wrap: balance;
  }
  .concept { margin-top: 24px; font-family: "Inter Tight", sans-serif; font-weight: 540; font-size: 40px; letter-spacing: -0.03em; color: #c9ccd3; }
  .role { margin-top: 20px; font-family: "Geist Mono", ui-monospace, monospace; font-size: 18px; letter-spacing: 0.02em; color: #9a9ea8; }
  .bottom {
    margin-top: 44px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,0.12);
    display: flex; justify-content: space-between; align-items: center;
    font-family: "Geist Mono", ui-monospace, monospace; font-size: 16px; color: #9a9ea8; letter-spacing: 0.02em;
  }
  .bottom .url { color: #f4f5f7; }
  .mark-large { position: absolute; right: -40px; top: 70px; color: #c9ccd3; opacity: 0.07; }
</style>
</head>
<body>
  ${monogram(560, "mark-large")}
  <div class="frame">
    <div class="top">
      <div class="brand">${monogram(34)}</div>
      <span class="eyebrow">${escape(site.location)}</span>
    </div>
    <div class="main">
      <div class="rule"></div>
      <h1>${escape(site.name)}</h1>
      <p class="concept">${escape(site.concept)}</p>
      <p class="role">${escape(site.roleLine)}</p>
    </div>
    <div class="bottom">
      <span class="url">${escape(host)}</span>
      <span>${escape(site.tagline)}</span>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });

  const alt = `${site.name}. ${site.concept}. ${site.roleLine}. ${host}`;
  const outDir = path.join(root, "src/app");
  await Promise.all([
    fs.writeFile(path.join(outDir, "opengraph-image.png"), png),
    fs.writeFile(path.join(outDir, "twitter-image.png"), png),
    fs.writeFile(path.join(outDir, "opengraph-image.alt.txt"), alt),
    fs.writeFile(path.join(outDir, "twitter-image.alt.txt"), alt),
  ]);
  console.log(`wrote src/app/opengraph-image.png and twitter-image.png (${(png.length / 1024).toFixed(0)}KB, ${WIDTH}x${HEIGHT})`);
} finally {
  await browser.close();
}
