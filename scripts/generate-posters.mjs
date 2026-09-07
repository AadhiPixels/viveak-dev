// Renders the signature scene at fixed keyframes and writes poster images.
// Usage: node scripts/generate-posters.mjs [baseUrl]
import { chromium } from "@playwright/test";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const outDir = path.resolve("public/posters");
await fs.mkdir(outDir, { recursive: true });

const targets = [
  { variant: "desktop", width: 1920, height: 1080, dsf: 1 },
  { variant: "mobile", width: 390, height: 844, dsf: 2 },
];
const keyframes = [
  { name: "k0", p: 0 },
  { name: "k2", p: 0.7 },
  { name: "k3", p: 1 },
];

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
for (const t of targets) {
  const context = await browser.newContext({
    viewport: { width: t.width, height: t.height },
    deviceScaleFactor: t.dsf,
  });
  const page = await context.newPage();
  for (const k of keyframes) {
    const url = `${base}/poster?p=${k.p}&variant=${t.variant}&quality=high`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-poster-ready]", { timeout: 60000 });
    await page.waitForTimeout(600);
    const png = await page.screenshot({ type: "png" });
    const name = `hero-${k.name}-${t.variant}`;
    const img = sharp(png);
    await img.clone().webp({ quality: 80, effort: 6 }).toFile(path.join(outDir, `${name}.webp`));
    try {
      await img.clone().avif({ quality: 55, effort: 6 }).toFile(path.join(outDir, `${name}.avif`));
    } catch (e) {
      console.warn("avif failed", e.message);
    }
    const stats = await Promise.all(
      ["webp", "avif"].map(async (ext) => {
        try {
          const s = await fs.stat(path.join(outDir, `${name}.${ext}`));
          return `${ext} ${(s.size / 1024).toFixed(0)}KB`;
        } catch {
          return `${ext} n/a`;
        }
      }),
    );
    console.log(name, stats.join(", "));
  }
  await context.close();
}
await browser.close();
