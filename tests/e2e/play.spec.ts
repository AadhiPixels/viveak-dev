import { expect, test, type Page } from "@playwright/test";
import { DESKTOP, MOBILE, captureConsole } from "./helpers";

interface SessionHandle {
  state: {
    phase: string;
    targetLane: number;
    lives: number;
    distance: number;
    score: number;
    nextId: number;
    objects: { id: number; kind: string; lane: number; at: number; spent: boolean }[];
  };
}

declare global {
  interface Window {
    __throughput?: SessionHandle;
  }
}

async function readState(page: Page) {
  return page.evaluate(() => {
    const s = window.__throughput!.state;
    return { phase: s.phase, targetLane: s.targetLane, lives: s.lives, distance: s.distance, score: s.score };
  });
}

async function openGame(page: Page) {
  await page.goto("/play");
  const game = page.getByRole("application", { name: /Throughput/ });
  await expect(game).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Keep a million events moving." })).toBeVisible();
  await game.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => Boolean(window.__throughput))).toBe(true);
  return game;
}

test.describe("Throughput game", () => {
  test.use({ viewport: DESKTOP });

  test("starts from the overlay, steers with the keyboard, pauses and resumes", async ({ page }) => {
    const capture = captureConsole(page);
    const game = await openGame(page);
    await expect(game).toHaveAttribute("data-phase", "ready");
    await expect(page.getByRole("status")).toHaveText(/Ready/);

    await page.getByRole("button", { name: /^Play/ }).click();
    await expect(game).toHaveAttribute("data-phase", "running");
    await expect.poll(async () => (await readState(page)).distance).toBeGreaterThan(1);

    await page.keyboard.press("ArrowRight");
    expect((await readState(page)).targetLane).toBe(1);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    expect((await readState(page)).targetLane).toBe(-1);

    await page.keyboard.press("Escape");
    await expect(game).toHaveAttribute("data-phase", "paused");
    const paused = (await readState(page)).distance;
    await page.waitForTimeout(400);
    expect((await readState(page)).distance).toBe(paused);
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(game).toHaveAttribute("data-phase", "running");
    await expect.poll(async () => (await readState(page)).distance).toBeGreaterThan(paused);

    expect(capture.errors).toEqual([]);
    expect(capture.pageErrors).toEqual([]);
  });

  test("ends in a dead-letter screen and restarts", async ({ page }) => {
    const game = await openGame(page);
    await page.getByRole("button", { name: /^Play/ }).click();
    await expect(game).toHaveAttribute("data-phase", "running");
    // Force the ending deterministically: one retry left and a fault straight ahead in the current lane.
    await page.evaluate(() => {
      const s = window.__throughput!.state;
      s.lives = 1;
      s.objects = [];
      s.objects.push({ id: s.nextId++, kind: "fault", lane: s.targetLane, at: s.distance + 3, spent: false });
    });
    await expect(game).toHaveAttribute("data-phase", "over", { timeout: 5000 });
    await expect(page.getByText("Dead-lettered", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("status")).toHaveText(/Dead-lettered/);
    await expect(page.getByRole("link", { name: "Open the real simulation" })).toHaveAttribute("href", "/lab/webhook-delivery");
    await page.getByRole("button", { name: /Play again/ }).click();
    await expect(game).toHaveAttribute("data-phase", "running");
    expect((await readState(page)).lives).toBe(3);
  });

  test("keyboard shortcuts do not fire while typing elsewhere", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "probe-input";
      document.body.append(input);
      input.focus();
    });
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);
    expect((await readState(page)).phase).toBe("ready");
  });

  test("with reduced motion the feedback flash layer is hidden but the game still runs", async ({ browser }) => {
    const context = await browser.newContext({ viewport: DESKTOP, reducedMotion: "reduce" });
    const page = await context.newPage();
    const game = await openGame(page);
    await expect(page.locator(".throughput-flash")).toBeHidden();
    await page.getByRole("button", { name: /^Play/ }).click();
    await expect(game).toHaveAttribute("data-phase", "running");
    await expect.poll(async () => (await readState(page)).distance).toBeGreaterThan(1);
    await context.close();
  });
});

test.describe("Throughput on a phone", () => {
  test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

  test("tapping the sides changes lane and the layout fits", async ({ page }) => {
    const game = await openGame(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: /^Play/ }).tap();
    await expect(game).toHaveAttribute("data-phase", "running");
    const box = (await game.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width * 0.85, box.y + box.height * 0.5);
    await expect.poll(async () => (await readState(page)).targetLane).toBe(1);
    await page.touchscreen.tap(box.x + box.width * 0.15, box.y + box.height * 0.5);
    await page.touchscreen.tap(box.x + box.width * 0.15, box.y + box.height * 0.5);
    await expect.poll(async () => (await readState(page)).targetLane).toBe(-1);
  });
});
