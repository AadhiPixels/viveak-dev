// Metadata, target-size and axe-core audit of every route at phone and desktop widths.
//
//   node scripts/qa-audit.mjs [--base=http://localhost:3400] > qa/audit.json
//
// Prints one JSON object keyed by "<viewport> <route>" with the document metadata, JSON-LD
// types, heading structure, links or buttons under 24 px, font sizes under 12 px and the
// axe-core violations (WCAG 2.2 AA plus best practice).
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const BASE = (process.argv.find((a) => a.startsWith("--base=")) ?? "--base=http://localhost:3400").slice(7);
const ROUTES = ["/", "/work", "/work/external-api-platform", "/work/dyson-platform-migration", "/work/lego-marketing-migration", "/products", "/experience", "/lab/webhook-delivery", "/play", "/contact", "/this-page-does-not-exist"];
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const results = {};
for (const vp of [{ name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true }, { name: "desktop", width: 1440, height: 900 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    const resp = await page.goto(BASE + route + (route === "/" ? "?vv-ambient=0" : ""), { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const seo = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const meta = (n) => q(`meta[name="${n}"]`)?.content ?? q(`meta[property="${n}"]`)?.content ?? null;
      const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => { try { const j = JSON.parse(s.textContent); return j["@type"] ?? (Array.isArray(j["@graph"]) ? j["@graph"].map((g) => g["@type"]).join("+") : "?"); } catch { return "INVALID"; } });
      const hs = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => Number(h.tagName[1]));
      let skips = 0; for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) skips++;
      const imgs = Array.from(document.images);
      const noAlt = imgs.filter((i) => !i.hasAttribute("alt")).length;
      const links = Array.from(document.querySelectorAll("a"));
      const generic = links.filter((a) => /^(click here|here|read more|more|link)$/i.test((a.textContent || "").trim())).length;
      const emptyLinks = links.filter((a) => !(a.textContent || "").trim() && !a.getAttribute("aria-label") && !a.querySelector("img[alt]")).length;
      const targets = links.filter((a) => a.target === "_blank" && !/noopener|noreferrer/.test(a.rel)).length;
      const small = Array.from(document.querySelectorAll("a,button")).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24); }).map((el) => `${el.tagName}:${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
      return {
        title: document.title, titleLen: document.title.length,
        desc: meta("description"), descLen: (meta("description") || "").length,
        canonical: q('link[rel="canonical"]')?.href ?? null,
        ogTitle: meta("og:title"), ogDesc: meta("og:description"), ogImage: meta("og:image"), ogUrl: meta("og:url"), ogType: meta("og:type"),
        twitterCard: meta("twitter:card"), robots: meta("robots"),
        lang: document.documentElement.lang, viewport: meta("viewport"), themeColor: meta("theme-color"),
        icons: Array.from(document.querySelectorAll('link[rel*="icon"]')).map((l) => `${l.rel}:${l.getAttribute("href")}`),
        manifest: q('link[rel="manifest"]')?.href ?? null,
        h1: document.querySelectorAll("h1").length, headingSkips: skips, imgs: imgs.length, noAlt, generic, emptyLinks, blankNoRel: targets, small,
        ld, scrollW: document.documentElement.scrollWidth - innerWidth,
        fontSizes: Array.from(new Set(Array.from(document.querySelectorAll("p,li,span,a,dd,dt,td,th")).map((el) => parseFloat(getComputedStyle(el).fontSize)).filter((n) => n < 12))).sort(),
      };
    });
    await page.addScriptTag({ content: axeSource });
    const axe = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes.slice(0, 2).map((n) => n.target.join(" ")) }));
    });
    results[`${vp.name} ${route}`] = { status: resp?.status(), ...seo, axe };
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 1));
