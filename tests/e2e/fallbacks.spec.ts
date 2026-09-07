import { expect, test } from "@playwright/test";
import { facts } from "@/content/facts";
import { site } from "@/content/site";
import { caseStudies } from "@/content/work";
import { HOME, captureConsole, looseText } from "./helpers";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the homepage still tells the whole story", async ({ page }) => {
    const response = await page.goto(HOME);
    expect(response?.status()).toBe(200);
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-hydrated"))).toBeNull();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(site.name);
    await expect(page.getByRole("heading", { name: "Built to keep moving." })).toBeVisible();
    await expect(page.locator(".pin-spacer")).toHaveCount(0);

    const evidence = page.locator("#evidence");
    await expect(evidence.getByText(facts.eventsPerDay.value, { exact: true })).toBeVisible();
    await expect(evidence.getByText(facts.eventsPerDay.label, { exact: true })).toBeVisible();

    const work = page.locator("#selected-work");
    for (const study of caseStudies) {
      const headline = work.getByRole("heading", { level: 3 }).filter({ hasText: looseText(study.headline) });
      await expect(headline, `chapter headline: ${study.headline}`).toBeVisible();
      await expect(work.getByRole("link", { name: "Read the case study" }).nth(caseStudies.indexOf(study))).toHaveAttribute(
        "href",
        `/work/${study.slug}`,
      );
    }

    const closing = page.locator("#contact-scene");
    await expect(closing.getByRole("link", { name: site.email })).toHaveAttribute("href", `mailto:${site.email}`);
    await expect(closing.getByRole("link", { name: site.linkedinLabel })).toHaveAttribute("href", site.linkedin);
    await expect(closing.getByRole("link", { name: "Download CV (PDF)" })).toHaveAttribute("href", site.cvHref);

    // Static navigation still works as plain links.
    await page.getByRole("banner").getByRole("link", { name: "Work" }).click();
    await expect(page).toHaveURL(/\/work$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Complex problems. Real outcomes.");
  });

  test("the lab page renders its textual state and disclaimer", async ({ page }) => {
    await page.goto("/lab/webhook-delivery");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Break the system");
    await expect(
      page.locator("[data-chapter='lab-intro']").getByText("Interactive educational simulation. Synthetic data. Not connected to employer systems."),
    ).toBeVisible();
    await expect(page.getByText("Text summary of the current state")).toBeVisible();
  });
});

test.describe("without WebGL", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (String(type).includes("webgl")) return null;
        return (original as (this: HTMLCanvasElement, type: string, ...args: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
  });

  test("the stage stays in poster mode and the page remains usable", async ({ page }) => {
    const capture = captureConsole(page);
    await page.goto(HOME);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await expect(page.locator(".pin-spacer")).toHaveCount(1);

    // Let the idle callback that would otherwise mount the canvas run first.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => resolve(), { timeout: 2000 });
          else window.setTimeout(resolve, 600);
        }),
    );

    const stage = page.locator("[data-signature-stage]");
    await expect(stage).toHaveAttribute("data-mode", "poster");
    await expect(stage.locator("canvas")).toHaveCount(0);
    await expect(stage.locator(".poster-k0 img")).toHaveJSProperty("complete", true);
    await expect(stage.locator(".poster-k2")).toHaveCount(1);
    await expect(stage.locator(".poster-k3")).toHaveCount(1);

    // Scroll through the opening: the poster cross-fade follows the same progress.
    await page.evaluate(() => window.scrollTo(0, 1440));
    await expect.poll(() => stage.locator(".poster-k2").evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 10_000 }).toBeGreaterThan(0.9);
    await expect(stage).toHaveAttribute("data-mode", "poster");

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator("#hero").getByRole("link", { name: "Explore my work" }).click();
    await expect(page).toHaveURL(/\/work$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Complex problems. Real outcomes.");

    expect(capture.pageErrors, "uncaught page errors").toEqual([]);
    expect(capture.errors, "console errors").toEqual([]);
  });
});
