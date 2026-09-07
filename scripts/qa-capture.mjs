// Responsive and visual QA captures.
//
//   node scripts/qa-capture.mjs [--base=http://localhost:3400] [--out=qa/screens]
//                               [--only=home,reduced,pages] [--palette] [--full=false]
//
// Writes qa/screens/<route>-<width>-<label>.png plus a manifest.json describing
// every capture (viewport, scroll position, motion mode, stage mode, bytes).
//
// Homepage sets: 320, 375, 390, 768, 1024, 1440, 1920 wide, a small landscape
// viewport (844x390) and a 200% zoom emulation (720x900 at deviceScaleFactor 2).
// Each set captures the pinned hero at progress 0, 0.5 and 1, then every scene
// at its start; the two primary breakpoints (1440 and 390) also capture the
// middle and end of every scene and a reduced-motion set. Dedicated pages are
// captured at 1440 and 390, both the first screen and the full page.
//
// Runs Chromium with SwiftShader (software WebGL) and disables the hero's
// ambient pulses (?vv-ambient=0) so the frames are deterministic.
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? "true"] : [a, "true"];
  }),
);
const BASE = (args.base ?? "http://localhost:3400").replace(/\/$/, "");
const OUT = args.out ?? "qa/screens";
const ONLY = new Set((args.only ?? "home,reduced,pages").split(",").map((s) => s.trim()));
const PALETTE = args.palette === "true";
const FULL_PAGES = args.full !== "false";

const CHROMIUM_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const HOME_URL = `${BASE}/?vv-ambient=0`;

/** Homepage viewport sets. `rich` sets also capture the middle and end of each scene. */
const HOME_SETS = [
  { width: 320, height: 640 },
  { width: 375, height: 700 },
  { width: 390, height: 844, rich: true },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900, rich: true },
  { width: 1920, height: 1080 },
  { width: 844, height: 390, tag: "844x390" },
  { width: 720, height: 900, dsf: 2, tag: "720@2x" },
];

const REDUCED_SETS = [
  { width: 1440, height: 900, rich: true },
  { width: 390, height: 844, rich: true },
];

/** Scenes after the opening sequence, in document order. */
const SCENES = [
  { selector: "#evidence", label: "evidence" },
  { selector: '[data-chapter="work-delivery"]', label: "work-delivery" },
  { selector: '[data-chapter="work-platform"]', label: "work-platform" },
  { selector: '[data-chapter="work-continuity"]', label: "work-continuity" },
  { selector: "#products-scene", label: "products-scene" },
  { selector: "#lab-scene", label: "lab-scene" },
  { selector: "#journey", label: "journey" },
  { selector: "#contact-scene", label: "contact-scene" },
];

const PAGES = [
  { path: "/work", route: "work" },
  { path: "/work/external-api-platform", route: "work-external-api-platform" },
  { path: "/work/dyson-platform-migration", route: "work-dyson-platform-migration" },
  { path: "/work/lego-marketing-migration", route: "work-lego-marketing-migration" },
  { path: "/products", route: "products" },
  { path: "/experience", route: "experience" },
  { path: "/contact", route: "contact" },
  { path: "/lab/webhook-delivery", route: "lab-webhook-delivery" },
  { path: "/play", route: "play" },
  { path: "/this-page-does-not-exist", route: "not-found" },
];
const PAGE_SETS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

const manifest = [];

/* ------------------------------------------------------------------ */
/* Page helpers                                                        */
/* ------------------------------------------------------------------ */

async function settle(page, quietMs = 300, timeout = 8000) {
  // GSAP writes inline styles while a scrubbed tween catches up; wait until they stop changing.
  await page
    .waitForFunction(
      (quiet) => {
        const w = window;
        const sig = Array.from(document.querySelectorAll('[style*="transform"],[style*="opacity"],[style*="clip-path"]'))
          .map((el) => el.getAttribute("style"))
          .join("|");
        const now = performance.now();
        if (w.__qaSig !== sig) {
          w.__qaSig = sig;
          w.__qaSince = now;
          return false;
        }
        return now - w.__qaSince >= quiet;
      },
      quietMs,
      { polling: 100, timeout },
    )
    .catch(() => {});
}

async function scrollToY(page, y, { canvas = false } = {}) {
  await page.evaluate(async (target) => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const to = Math.max(0, Math.min(max, target));
    const start = window.scrollY;
    const steps = 12;
    for (let i = 1; i <= steps; i += 1) {
      window.scrollTo(0, start + ((to - start) * i) / steps);
      await wait(40);
    }
    window.scrollTo(0, to);
  }, y);
  await settle(page);
  // The WebGL sculpture eases towards the scroll progress over several frames;
  // software rendering is slow, so give it time before the frame is captured.
  if (canvas) await page.waitForTimeout(1800);
  else await page.waitForTimeout(250);
}

async function sectionTargets(page, selector, height) {
  return page.evaluate(
    ({ selector, height }) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const bottom = r.bottom + window.scrollY;
      return {
        start: top,
        middle: top + r.height / 2 - height / 2,
        end: bottom - height,
        height: r.height,
      };
    },
    { selector, height },
  );
}

async function openHome(page, { motion }) {
  await page.goto(HOME_URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-hydrated") === "true", null, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  if (motion === "full") {
    await page.waitForSelector(".pin-spacer", { timeout: 15000 }).catch(() => {});
    // Canvas enhancement arrives after an idle callback; wait for it, but do not insist.
    await page
      .waitForFunction(() => document.querySelector("[data-signature-stage]")?.getAttribute("data-mode") === "canvas", null, {
        timeout: 12000,
      })
      .catch(() => {});
  }
  await page.waitForTimeout(500);
}

/** Chromium on SwiftShader duplicates content in full-page captures taller than this; stitch instead. */
const MAX_NATIVE_FULL_PAGE = 8000;

/**
 * Full-page capture assembled from viewport-sized segments. The fixed header
 * and the lab's sticky quick controls are hidden after the first segment so
 * they do not repeat down the composed image.
 */
async function stitchedFullPage(page) {
  const { width, height, total } = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    total: document.documentElement.scrollHeight,
  }));
  await page.addStyleTag({
    content:
      'html[data-qa-stitch] header[data-theme], html[data-qa-stitch] [aria-label="Quick controls"] { visibility: hidden !important; }',
  });
  const segments = [];
  for (let y = 0; y < total; y += height) {
    await page.evaluate((target) => window.scrollTo(0, target), y);
    if (y > 0) await page.evaluate(() => document.documentElement.setAttribute("data-qa-stitch", "1"));
    await settle(page);
    await page.waitForTimeout(150);
    const actualY = await page.evaluate(() => window.scrollY);
    segments.push({ input: await page.screenshot({ animations: "disabled", caret: "hide" }), top: Math.round(actualY), left: 0 });
  }
  await page.evaluate(() => {
    document.documentElement.removeAttribute("data-qa-stitch");
    window.scrollTo(0, 0);
  });
  return sharp({ create: { width, height: total, channels: 3, background: "#050507" } })
    .composite(segments)
    .png()
    .toBuffer();
}

async function capture(page, file, meta) {
  const outPath = path.join(OUT, file);
  let buffer;
  if (meta.fullPage) {
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    if (total > MAX_NATIVE_FULL_PAGE) {
      buffer = await stitchedFullPage(page);
      meta = { ...meta, stitched: true };
    } else {
      buffer = await page.screenshot({ animations: "disabled", caret: "hide", fullPage: true });
    }
  } else {
    buffer = await page.screenshot({ animations: "disabled", caret: "hide" });
  }
  const encoded = PALETTE
    ? await sharp(buffer).png({ palette: true, quality: 90, effort: 7 }).toBuffer()
    : await sharp(buffer).png({ compressionLevel: 9, effort: 7, adaptiveFiltering: true }).toBuffer();
  await writeFile(outPath, encoded);
  const { size } = await stat(outPath);
  const stageMode = await page.evaluate(() => document.querySelector("[data-signature-stage]")?.getAttribute("data-mode") ?? null);
  const scrollY = await page.evaluate(() => Math.round(window.scrollY));
  manifest.push({ file, ...meta, scrollY, stageMode, bytes: size });
  console.log(`${file}  ${(size / 1024).toFixed(0)} KB  (scrollY ${scrollY}${stageMode ? `, stage ${stageMode}` : ""})`);
}

/* ------------------------------------------------------------------ */
/* Homepage sets                                                       */
/* ------------------------------------------------------------------ */

async function homeSet(browser, set, motion) {
  const dsf = set.dsf ?? 1;
  const tag = set.tag ?? String(set.width);
  const prefix = motion === "reduced" ? `home-${tag}-reduced` : `home-${tag}`;
  const context = await browser.newContext({
    viewport: { width: set.width, height: set.height },
    deviceScaleFactor: dsf,
    isMobile: set.width < 700,
    hasTouch: set.width < 700,
    reducedMotion: motion === "reduced" ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  const meta = { route: "home", width: set.width, height: set.height, dsf, motion };
  try {
    await openHome(page, { motion });
    const pinned = await page.evaluate(() => {
      const spacer = document.querySelector(".pin-spacer");
      const stage = document.querySelector(".hero-stage");
      if (!spacer || !stage) return null;
      return Math.round(spacer.getBoundingClientRect().height - stage.getBoundingClientRect().height);
    });

    if (pinned) {
      for (const p of [0, 0.5, 1]) {
        await scrollToY(page, Math.round(pinned * p), { canvas: true });
        await capture(page, `${prefix}-hero-p${Math.round(p * 100)}.png`, { ...meta, label: `hero progress ${p}`, pinDistance: pinned });
      }
    } else {
      await scrollToY(page, 0, { canvas: false });
      await capture(page, `${prefix}-hero.png`, { ...meta, label: "hero (no pin)" });
      const built = await sectionTargets(page, "#built", set.height);
      if (built) {
        await scrollToY(page, built.start);
        await capture(page, `${prefix}-built.png`, { ...meta, label: "Built to keep moving (static)" });
      }
    }

    for (const scene of SCENES) {
      const t = await sectionTargets(page, scene.selector, set.height);
      if (!t) {
        console.warn(`missing ${scene.selector}`);
        continue;
      }
      const positions = set.rich ? [["start", t.start], ["middle", t.middle], ["end", t.end]] : [["start", t.start]];
      let previous = null;
      for (const [pos, y] of positions) {
        const target = Math.round(y);
        if (previous !== null && Math.abs(target - previous) < 24) continue;
        previous = target;
        const canvas = scene.label === "evidence";
        await scrollToY(page, target, { canvas });
        const suffix = set.rich ? `-${pos}` : "";
        await capture(page, `${prefix}-${scene.label}${suffix}.png`, { ...meta, label: `${scene.label} ${pos}` });
      }
    }
  } finally {
    await context.close();
  }
}

/* ------------------------------------------------------------------ */
/* Dedicated pages                                                     */
/* ------------------------------------------------------------------ */

async function pageSet(browser, set) {
  const context = await browser.newContext({
    viewport: { width: set.width, height: set.height },
    isMobile: set.width < 700,
    hasTouch: set.width < 700,
  });
  const page = await context.newPage();
  try {
    for (const entry of PAGES) {
      await page.goto(`${BASE}${entry.path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await settle(page);
      await page.waitForTimeout(400);
      await capture(page, `${entry.route}-${set.width}-top.png`, {
        route: entry.route,
        width: set.width,
        height: set.height,
        dsf: 1,
        motion: "full",
        label: "top of page",
      });
      if (FULL_PAGES) {
        await page.evaluate(async () => {
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          const max = document.documentElement.scrollHeight - window.innerHeight;
          for (let y = 0; y < max; y += 400) {
            window.scrollTo(0, y);
            await wait(30);
          }
          window.scrollTo(0, 0);
        });
        await settle(page);
        await capture(page, `${entry.route}-${set.width}-full.png`, {
          route: entry.route,
          width: set.width,
          height: set.height,
          dsf: 1,
          motion: "full",
          label: "full page",
          fullPage: true,
        });
      }
    }
  } finally {
    await context.close();
  }
}

/* ------------------------------------------------------------------ */

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: CHROMIUM_ARGS });
const started = Date.now();
try {
  if (ONLY.has("home")) for (const set of HOME_SETS) await homeSet(browser, set, "full");
  if (ONLY.has("reduced")) for (const set of REDUCED_SETS) await homeSet(browser, set, "reduced");
  if (ONLY.has("pages")) for (const set of PAGE_SETS) await pageSet(browser, set);
} finally {
  await browser.close();
}
// A partial run (--only=...) merges into the manifest left by earlier runs.
const manifestPath = path.join(OUT, "manifest.json");
let previous = [];
try {
  previous = JSON.parse(await readFile(manifestPath, "utf8")).captures ?? [];
} catch {
  previous = [];
}
const fresh = new Set(manifest.map((m) => m.file));
const kept = [];
for (const entry of previous) {
  if (fresh.has(entry.file)) continue;
  try {
    await stat(path.join(OUT, entry.file));
    kept.push(entry);
  } catch {
    /* file no longer exists */
  }
}
const captures = [...kept, ...manifest];
const allBytes = captures.reduce((sum, c) => sum + (c.bytes ?? 0), 0);
await writeFile(
  manifestPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      base: BASE,
      chromiumArgs: CHROMIUM_ARGS,
      palette: PALETTE,
      captures,
      totalBytes: allBytes,
    },
    null,
    2,
  ),
);
console.log(
  `\n${manifest.length} captures this run (${captures.length} in manifest), ${(allBytes / 1024 / 1024).toFixed(1)} MB, ${((Date.now() - started) / 1000).toFixed(0)} s`,
);
