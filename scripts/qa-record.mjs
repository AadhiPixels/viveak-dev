// Records a slow scroll down and back up the homepage as WebM video.
//
//   node scripts/qa-record.mjs [--base=http://localhost:3400] [--out=qa/video] [--seconds=25]
//
// Produces qa/video/home-1440x900.webm and qa/video/home-390x844.webm using
// Playwright's recordVideo, Chromium on SwiftShader (software WebGL) and the
// homepage with ambient pulses disabled (?vv-ambient=0). The scroll is driven
// in small steps so the scrubbed choreography has time to follow.
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? "true"] : [a, "true"];
  }),
);
const BASE = (args.base ?? "http://localhost:3400").replace(/\/$/, "");
const OUT = args.out ?? "qa/video";
const SECONDS = Number(args.seconds ?? 25);
const CHROMIUM_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

const SETS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: CHROMIUM_ARGS });

try {
  for (const set of SETS) {
    const context = await browser.newContext({
      viewport: set,
      isMobile: set.width < 700,
      hasTouch: set.width < 700,
      recordVideo: { dir: OUT, size: set },
    });
    const page = await context.newPage();
    const t0 = Date.now();
    const mark = (label) => console.log(`  ${label} at ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    await page.goto(`${BASE}/?vv-ambient=0`, { waitUntil: "load" });
    mark("loaded");
    await page.waitForFunction(() => document.documentElement.getAttribute("data-hydrated") === "true", null, { timeout: 15000 });
    await page.waitForSelector(".pin-spacer", { timeout: 15000 }).catch(() => {});
    await page
      .waitForFunction(() => document.querySelector("[data-signature-stage]")?.getAttribute("data-mode") === "canvas", null, {
        timeout: 12000,
      })
      .catch(() => {});
    mark("stage ready");
    // A short hold on the opening image, then down and back up in small steps.
    await page.waitForTimeout(1500);
    const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const stepMs = 40;
    const stepsEachWay = Math.max(1, Math.round(((SECONDS - 3) * 1000) / 2 / stepMs));
    const stepPx = total / stepsEachWay;
    await page.evaluate(
      async ({ total, stepMs, stepPx }) => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        for (let y = 0; y < total; y += stepPx) {
          window.scrollTo(0, y);
          await wait(stepMs);
        }
        window.scrollTo(0, total);
        await wait(600);
        for (let y = total; y > 0; y -= stepPx) {
          window.scrollTo(0, y);
          await wait(stepMs);
        }
        window.scrollTo(0, 0);
      },
      { total, stepMs, stepPx },
    );
    mark("scroll finished");
    await page.waitForTimeout(1500);
    const video = page.video();
    await context.close();
    const target = path.join(OUT, `home-${set.width}x${set.height}.webm`);
    await video.saveAs(target);
    await rm(await video.path(), { force: true });
    const { size } = await stat(target);
    console.log(`${target}  ${(size / 1024 / 1024).toFixed(1)} MB  (scroll range ${Math.round(total)} px)`);
  }
} finally {
  await browser.close();
}
