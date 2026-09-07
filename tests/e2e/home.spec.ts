import { expect, test, type Page } from "@playwright/test";
import { site } from "@/content/site";
import {
  DESKTOP,
  HOME,
  MOBILE,
  captureConsole,
  expectInFirstScreen,
  horizontalBleed,
  scrollPass,
  scrollToTop,
  waitForMotionSettled,
} from "./helpers";

const FIRST_SCREEN_VIEWPORTS = [
  { name: "desktop", viewport: DESKTOP },
  { name: "mobile", viewport: MOBILE },
] as const;

async function openHome(page: Page) {
  await page.goto(HOME);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

for (const { name, viewport } of FIRST_SCREEN_VIEWPORTS) {
  test.describe(`first screen (${name} ${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 });

    test("shows identity, tagline, intro and every action without scrolling", async ({ page }) => {
      await openHome(page);
      const hero = page.locator("#hero");

      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText(site.name);
      await expectInFirstScreen(h1, viewport);

      const role = hero.getByText(site.roleLine, { exact: true });
      await expect(role).toBeVisible();
      await expectInFirstScreen(role, viewport);

      const tagline = hero.locator(`p[aria-label="${site.tagline}"]`);
      await expect(tagline).toContainText("Engineering.");
      await expect(tagline).toContainText("In motion.");
      await expectInFirstScreen(tagline, viewport);

      const intro = hero.getByText(site.intro, { exact: true });
      await expect(intro).toBeVisible();
      await expectInFirstScreen(intro, viewport);

      const explore = hero.getByRole("link", { name: "Explore my work" });
      await expect(explore).toHaveAttribute("href", "/work");
      await expectInFirstScreen(explore, viewport);

      const cv = hero.getByRole("link", { name: "Download CV", exact: true });
      await expect(cv).toHaveAttribute("href", site.cvHref);
      await expectInFirstScreen(cv, viewport);

      const touch = hero.getByRole("link", { name: "Get in touch" });
      await expect(touch).toHaveAttribute("href", "/contact");
      await expectInFirstScreen(touch, viewport);

      const skip = hero.getByRole("link", { name: "Skip to selected work" });
      await expect(skip).toHaveAttribute("href", "#selected-work");
      await expectInFirstScreen(skip, viewport);

      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test("has one h1 and labelled landmarks", async ({ page }) => {
      await openHome(page);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);

      const navs = await page.locator("nav").evaluateAll((els) =>
        els.map((el) => ({ label: el.getAttribute("aria-label") ?? "", hidden: el.closest("dialog") !== null })),
      );
      expect(navs.length).toBeGreaterThanOrEqual(2);
      for (const nav of navs) expect(nav.label, "every nav carries an aria-label").not.toBe("");
      expect(navs.map((n) => n.label)).toEqual(expect.arrayContaining(["Primary", "Footer"]));
      if (viewport.width >= 1024) {
        await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
      } else {
        await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
      }
      await expect(page.getByRole("navigation", { name: "Footer" })).toBeAttached();
    });

    test("closing section offers email, LinkedIn and CV after a full scroll", async ({ page }) => {
      await openHome(page);
      await scrollPass(page, 400, 30);
      await waitForMotionSettled(page);
      const closing = page.locator("#contact-scene");
      // The footer can be taller than a phone viewport, so bring the closing frame back into view.
      await closing.scrollIntoViewIfNeeded();
      await expect(closing).toBeInViewport();
      await expect(closing.getByRole("link", { name: site.email })).toHaveAttribute("href", `mailto:${site.email}`);
      await expect(closing.getByRole("link", { name: site.email })).toBeVisible();
      const linkedIn = closing.getByRole("link", { name: site.linkedinLabel });
      await expect(linkedIn).toHaveAttribute("href", site.linkedin);
      await expect(linkedIn).toBeVisible();
      const cv = closing.getByRole("link", { name: "Download CV (PDF)" });
      await expect(cv).toHaveAttribute("href", site.cvHref);
      await expect(cv).toBeVisible();
      await expect(closing.getByRole("button", { name: `Copy email address ${site.email}` })).toBeVisible();
    });

    test("revealed visuals end fully visible after a full scroll pass", async ({ page }) => {
      await openHome(page);
      await scrollPass(page, 300, 40);
      await waitForMotionSettled(page);
      // Reveal tweens that start from autoAlpha:0 must end with autoAlpha:1, otherwise the
      // element keeps visibility:hidden at full opacity (invisible in every browser).
      // Both authored layouts of a visual are in the DOM and only one is displayed, and the phone
      // composition leaves the chapter visuals and the lab preview out entirely, so pick the first
      // rendered match (display:none elements have no client rects) and scroll to it in-page.
      let checked = 0;
      for (const selector of ["#lab-scene [data-preview]", "[data-visual='delivery-routes'] [data-node]", "[data-device]"]) {
        const found = await page.evaluate((sel) => {
          const el = Array.from(document.querySelectorAll<HTMLElement>(sel)).find((n) => n.getClientRects().length > 0);
          if (!el) return null;
          el.scrollIntoView({ block: "center" });
          return true;
        }, selector);
        if (!found) continue;
        checked += 1;
        await waitForMotionSettled(page);
        // Scrubbed tweens catch up on animation frames, which software rendering starves: poll.
        await expect
          .poll(
            () =>
              page.evaluate((sel) => {
                const el = Array.from(document.querySelectorAll<HTMLElement>(sel)).find((n) => n.getClientRects().length > 0)!;
                const cs = getComputedStyle(el);
                return { visibility: cs.visibility, opaque: Number(cs.opacity) > 0.9 };
              }, selector),
            { message: `${selector} should end visible`, timeout: 20_000 },
          )
          .toEqual({ visibility: "visible", opaque: true });
      }
      expect(checked, "at least one revealed visual is rendered at this size").toBeGreaterThan(0);
    });

    test("logs no console errors during load and a full scroll pass", async ({ page }) => {
      const capture = captureConsole(page);
      await openHome(page);
      await expect(page.locator(".pin-spacer")).toHaveCount(1);
      await scrollPass(page, 300, 40);
      await waitForMotionSettled(page);
      await scrollToTop(page);
      await waitForMotionSettled(page);
      expect(capture.pageErrors, "uncaught page errors").toEqual([]);
      expect(capture.errors, "console errors").toEqual([]);
    });
  });
}

test.describe("header navigation", () => {
  test("desktop header links navigate client-side", async ({ page }) => {
    await openHome(page);
    await page.evaluate(() => {
      (window as Window & { __vvMarker?: boolean }).__vvMarker = true;
    });
    const primary = page.getByRole("navigation", { name: "Primary" });
    await primary.getByRole("link", { name: "Work" }).click();
    await expect(page).toHaveURL(/\/work$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Complex problems. Real outcomes.");
    expect(await page.evaluate(() => (window as Window & { __vvMarker?: boolean }).__vvMarker)).toBe(true);
    await expect(primary.getByRole("link", { name: "Work" })).toHaveAttribute("aria-current", "page");

    await primary.getByRole("link", { name: "Lab" }).click();
    await expect(page).toHaveURL(/\/lab\/webhook-delivery$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Break the system");

    await page.getByRole("banner").getByRole("link", { name: `${site.name}, home` }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => (window as Window & { __vvMarker?: boolean }).__vvMarker)).toBe(true);
  });

  test.describe("mobile", () => {
    test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

    test("menu opens as a dialog and its links navigate", async ({ page }) => {
      await openHome(page);
      await page.getByRole("button", { name: "Open menu" }).click();
      const dialog = page.getByRole("dialog", { name: "Site menu" });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("link", { name: /Experience/ }).click();
      await expect(page).toHaveURL(/\/experience$/);
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Tech Lead");
    });
  });
});

test.describe("horizontal overflow", () => {
  const sizes = [
    { width: 320, height: 640 },
    { width: 375, height: 700 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 844, height: 390 },
  ];

  for (const size of sizes) {
    test(`no horizontal overflow at ${size.width}x${size.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(size);
      await openHome(page);
      const check = async (stage: string) => {
        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          bodyScrollWidth: document.body.scrollWidth,
        }));
        expect(metrics.scrollWidth, `${stage}: documentElement.scrollWidth`).toBeLessThanOrEqual(metrics.innerWidth);
        expect(metrics.bodyScrollWidth, `${stage}: body.scrollWidth`).toBeLessThanOrEqual(metrics.innerWidth);
        const bleed = await horizontalBleed(page);
        if (bleed.length) testInfo.annotations.push({ type: `bleed (${stage})`, description: bleed.join("; ") });
        expect(bleed, `${stage}: elements escaping the viewport horizontally`).toEqual([]);
      };
      await check("top");
      await scrollPass(page, 500, 25);
      await waitForMotionSettled(page);
      await check("bottom");
    });
  }
});
