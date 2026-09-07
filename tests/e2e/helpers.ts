import { expect, type Locator, type Page } from "@playwright/test";

/** Homepage URL with the hero's ambient pulses switched off for deterministic captures. */
export const HOME = "/?vv-ambient=0";

export const DESKTOP = { width: 1440, height: 900 } as const;
export const MOBILE = { width: 390, height: 844 } as const;

/** Console noise that is known and accepted (three.js deprecation notice). */
const IGNORED_CONSOLE = [/THREE\.Clock/];

export interface ConsoleCapture {
  errors: string[];
  warnings: string[];
  pageErrors: string[];
}

/** Start collecting console errors, warnings and uncaught page errors. */
export function captureConsole(page: Page): ConsoleCapture {
  const capture: ConsoleCapture = { errors: [], warnings: [], pageErrors: [] };
  page.on("console", (message) => {
    const text = message.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    if (message.type() === "error") capture.errors.push(text);
    else if (message.type() === "warning") capture.warnings.push(text);
  });
  page.on("pageerror", (error) => capture.pageErrors.push(error.message));
  return capture;
}

/** Scroll the whole document in steps, giving scrubbed timelines time to follow. */
export async function scrollPass(page: Page, stepPx = 320, pauseMs = 40) {
  await page.evaluate(
    async ({ stepPx, pauseMs }) => {
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const bottom = () => document.documentElement.scrollHeight - window.innerHeight;
      for (let y = 0; y < bottom(); y += stepPx) {
        window.scrollTo(0, y);
        await wait(pauseMs);
      }
      window.scrollTo(0, bottom());
      await wait(pauseMs);
    },
    { stepPx, pauseMs },
  );
}

/** Scroll back to the top in steps. */
export async function scrollToTop(page: Page, stepPx = 480, pauseMs = 30) {
  await page.evaluate(
    async ({ stepPx, pauseMs }) => {
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      for (let y = window.scrollY; y > 0; y -= stepPx) {
        window.scrollTo(0, Math.max(0, y));
        await wait(pauseMs);
      }
      window.scrollTo(0, 0);
      await wait(pauseMs);
    },
    { stepPx, pauseMs },
  );
}

/**
 * Wait until GSAP has stopped writing inline styles (scrubbed tweens lag the
 * scroll position by design, and software rendering makes them slower).
 * Resolves once the inline style signature has been unchanged for `quietMs`.
 */
export async function waitForMotionSettled(page: Page, quietMs = 300, timeout = 10_000) {
  await page
    .waitForFunction(
      (quiet) => {
        // GSAP writes on animation frames. Under software rendering frames can be hundreds of
        // milliseconds apart, so count frames as well as time: the signature must be unchanged
        // for `quiet` ms AND for at least six frames.
        const w = window as Window & { __vvSig?: string; __vvSince?: number; __vvFrames?: number; __vvRaf?: boolean };
        if (!w.__vvRaf) {
          w.__vvRaf = true;
          const tick = () => {
            w.__vvFrames = (w.__vvFrames ?? 0) + 1;
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
        const sig = Array.from(
          document.querySelectorAll('[style*="transform"],[style*="opacity"],[style*="clip-path"],[style*="visibility"]'),
        )
          .map((el) => el.getAttribute("style"))
          .join("|");
        const now = performance.now();
        if (w.__vvSig !== sig) {
          w.__vvSig = sig;
          w.__vvSince = now;
          w.__vvFrames = 0;
          return false;
        }
        return now - (w.__vvSince ?? now) >= quiet && (w.__vvFrames ?? 0) >= 6;
      },
      quietMs,
      { polling: 100, timeout },
    )
    .catch(() => {
      /* best effort: a settle timeout should not fail a functional test */
    });
}

/** Scroll to an absolute document position and let the choreography catch up. */
export async function scrollTo(page: Page, y: number, steps = 6) {
  await page.evaluate(
    async ({ y, steps }) => {
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const start = window.scrollY;
      for (let i = 1; i <= steps; i += 1) {
        window.scrollTo(0, start + ((y - start) * i) / steps);
        await wait(30);
      }
    },
    { y, steps },
  );
  await waitForMotionSettled(page);
}

/** Bounding box helper that fails clearly when the element is missing. */
export async function box(locator: Locator) {
  const b = await locator.boundingBox();
  expect(b, `bounding box for ${locator.toString()}`).not.toBeNull();
  return b!;
}

/** Assert that an element is fully inside the current viewport (no scrolling needed). */
export async function expectInFirstScreen(locator: Locator, viewport: { width: number; height: number }) {
  const b = await box(locator);
  expect(b.y, `${locator} top`).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height, `${locator} bottom`).toBeLessThanOrEqual(viewport.height + 0.5);
  expect(b.x, `${locator} left`).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width, `${locator} right`).toBeLessThanOrEqual(viewport.width + 0.5);
}

/** The value cell of a lab `Stat` (a `dt` label followed by its `dd`). */
export function stat(scope: Locator | Page, label: string): Locator {
  return scope
    .locator("dt")
    .filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

export async function statNumber(scope: Locator | Page, label: string): Promise<number> {
  const text = (await stat(scope, label).innerText()).trim();
  const n = Number(text.replace(/[^\d.-]/g, ""));
  expect(Number.isFinite(n), `stat "${label}" should be numeric, got "${text}"`).toBe(true);
  return n;
}

/** Elements whose bounding box leaves the viewport horizontally without a clipping ancestor. */
export async function horizontalBleed(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const iw = window.innerWidth;
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= iw + 1 && r.left >= -1) continue;
      let ancestor = el.parentElement;
      let clipped = false;
      while (ancestor && ancestor !== document.body) {
        if (getComputedStyle(ancestor).overflowX !== "visible") {
          clipped = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (clipped) continue;
      const cls = typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 3).join(".") : "";
      out.push(`${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""} [${Math.round(r.left)}, ${Math.round(r.right)}]`);
    }
    return out.slice(0, 20);
  });
}

/** Build a whitespace-tolerant regex for text that a component splits across lines. */
export function looseText(text: string): RegExp {
  const escaped = text
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s*");
  return new RegExp(escaped);
}
