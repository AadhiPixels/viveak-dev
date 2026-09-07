import { expect, test, type Page } from "@playwright/test";
import { HOME, scrollTo, waitForMotionSettled } from "./helpers";

const BUILT_HEADING = { name: "Built to keep moving." } as const;

/** True once every masked line of "Built to keep moving." sits inside its mask and the copy is opaque. */
async function builtRevealed(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const lines = Array.from(document.querySelectorAll<HTMLElement>(".hero-built .mask-line > span"));
    if (lines.length === 0) return false;
    const inMask = lines.every((line) => {
      const mask = line.parentElement!.getBoundingClientRect();
      const r = line.getBoundingClientRect();
      return r.top >= mask.top - 1 && r.bottom <= mask.bottom + 1;
    });
    const copy = document.querySelector<HTMLElement>(".hero-built .hero-built-copy");
    const copyShown = copy ? getComputedStyle(copy).visibility !== "hidden" && Number(getComputedStyle(copy).opacity) > 0.9 : false;
    return inMask && copyShown;
  });
}

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("renders the opening as plain sections with no pinning", async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator(".pin-spacer")).toHaveCount(0);

    const heading = page.getByRole("heading", BUILT_HEADING);
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/Built to\s*keep moving\./);

    const built = page.locator("#built");
    expect(await built.evaluate((el) => getComputedStyle(el).position)).not.toBe("absolute");
    const heroBox = (await page.locator(".hero-copy").boundingBox())!;
    const builtBox = (await built.boundingBox())!;
    expect(builtBox.y, "Scene 02 follows the hero copy in normal flow").toBeGreaterThan(heroBox.y + heroBox.height - 1);

    const stage = page.locator("[data-signature-stage]");
    expect(await stage.evaluate((el) => getComputedStyle(el).position)).not.toBe("fixed");
    await expect(stage).toHaveAttribute("data-mode", "poster");

    // The heading is reachable by simply scrolling to it, and it keeps its final layout.
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeInViewport();
    expect(await builtRevealed(page)).toBe(true);
  });
});

test.describe("full motion", () => {
  test("pins the stage and scrubs the opening with scroll", async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    await expect(page.locator("[data-signature-stage]")).toHaveCSS("position", "fixed");

    const copy = page.locator(".hero-copy");
    await expect(copy).toBeVisible();
    expect(await builtRevealed(page)).toBe(false);

    // 900px into a 1440px pin (progress 0.625): the opening copy has lifted away.
    await scrollTo(page, 900);
    await expect(copy).toBeHidden();
    await expect(page.locator(".pin-spacer")).toHaveCount(1);

    // At the end of the pin the headline is fully revealed inside its masks.
    await scrollTo(page, 1440);
    await expect.poll(() => builtRevealed(page), { timeout: 10_000 }).toBe(true);
    await expect(page.getByRole("heading", BUILT_HEADING)).toBeInViewport();

    // Reverse scrolling restores the opening image.
    await scrollTo(page, 0);
    await expect(copy).toBeVisible();
    await expect.poll(() => builtRevealed(page), { timeout: 10_000 }).toBe(false);
  });

  test("a stored reduced preference survives a reload", async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    await page.evaluate(() => window.localStorage.setItem("vv-motion", "reduced"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await expect(page.getByRole("heading", BUILT_HEADING)).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem("vv-motion"))).toBe("reduced");
  });

  test("the footer motion control switches modes without a reload", async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    await page.evaluate(() => {
      (window as Window & { __vvMarker?: boolean }).__vvMarker = true;
    });

    const group = page.getByRole("radiogroup", { name: "Motion" });
    await group.scrollIntoViewIfNeeded();
    await expect(group).toBeVisible();
    await expect(group.getByRole("radio", { name: "Auto" })).toBeChecked();

    await group.getByRole("radio", { name: "Reduced" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    expect(await page.evaluate(() => window.localStorage.getItem("vv-motion"))).toBe("reduced");
    await expect(page.getByRole("contentinfo").getByText("Reduced motion is active.")).toBeAttached();

    await group.getByRole("radio", { name: "Full" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    expect(await page.evaluate(() => window.localStorage.getItem("vv-motion"))).toBe("full");
    await waitForMotionSettled(page);

    // Same document throughout: the marker set before the switch is still there.
    expect(await page.evaluate(() => (window as Window & { __vvMarker?: boolean }).__vvMarker)).toBe(true);
  });
});
