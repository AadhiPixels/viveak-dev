// Screenshot helper: node scripts/shot.mjs <url> <out.png> [--w=1440] [--h=900] [--scroll=0|0.25|px] [--reduced] [--nojs] [--nowebgl] [--wait=ms] [--full] [--dsf=1]
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const url = args[0];
const out = args[1];
const opt = Object.fromEntries(
  args.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? "true"] : [a, "true"];
  }),
);
const width = Number(opt.w ?? 1440);
const height = Number(opt.h ?? 900);
const dsf = Number(opt.dsf ?? 1);
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: dsf,
  reducedMotion: opt.reduced ? "reduce" : "no-preference",
  javaScriptEnabled: !opt.nojs,
  isMobile: width < 700,
  hasTouch: width < 700,
});
if (opt.nowebgl) {
  await context.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (String(type).includes("webgl")) return null;
      return orig.call(this, type, ...rest);
    };
  });
}
const page = await context.newPage();
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
const target = opt.ambient ? url : url + (url.includes("?") ? "&" : "?") + "vv-ambient=0";
await page.goto(target, { waitUntil: "networkidle" });
await page.waitForTimeout(Number(opt.wait ?? 1500));
if (opt.scroll) {
  const s = String(opt.scroll);
  await page.evaluate(async (s) => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const target = s.endsWith("px") ? Number(s.slice(0, -2)) : Number(s) <= 1 ? Number(s) * total : Number(s);
    // step scroll to let scrub catch up
    const steps = 12;
    const start = window.scrollY;
    for (let i = 1; i <= steps; i++) {
      window.scrollTo(0, start + ((target - start) * i) / steps);
      await new Promise((r) => setTimeout(r, 40));
    }
  }, s);
  await page.waitForTimeout(Number(opt.settle ?? 600));
  // Wait for scrubbed ScrollTriggers to catch up (headless rendering can be slow).
  await page
    .waitForFunction(
      () => {
        const ST = window.__ScrollTrigger;
        if (!ST) return true;
        ST.update();
        return ST.getAll().every((t) => {
          const tw = t.getTween && t.getTween();
          return !tw || tw.progress() >= 0.999 || !tw.isActive();
        });
      },
      null,
      { timeout: 6000 },
    )
    .catch(() => {});
  await page.waitForTimeout(Number(opt.settle ?? 600));
}
await page.screenshot({ path: out, fullPage: Boolean(opt.full) });
const errs = logs.filter((l) => /error|warn/i.test(l));
if (errs.length) {
  console.log("console:", errs.slice(0, 12).join("\n"));
}
console.log("saved", out);
await browser.close();
