import { expect, test, type Locator, type Page } from "@playwright/test";
import { LAB_DISCLAIMER, LAB_HREF } from "@/lib/sim/config";
import { MOBILE, stat, statNumber } from "./helpers";

function totals(page: Page): Locator {
  return page.locator("dl").filter({ has: page.locator("dt", { hasText: /^Events$/ }) });
}

function subscriber(page: Page, id: "A" | "B" | "C"): Locator {
  return page.getByRole("article", { name: `Subscriber ${id}` });
}

/** The circuit badge inside a subscriber card. */
function circuitBadge(card: Locator): Locator {
  return card.locator("p").filter({ hasText: /^Circuit$/ }).locator("xpath=following-sibling::div[1]");
}

function clock(page: Page): Locator {
  // "t = 12.3 s" or "t = 1 min 02.5 s"; the HMAC panel also prints "t = <unix ms>" so anchor on the unit.
  return page.getByText(/^t = [\d. ]+(min [\d.]+ )?s$/);
}

function deliveriesTable(page: Page): Locator {
  return page.getByRole("region", { name: "Deliveries" }).getByRole("table");
}

/** Expand the log panel when it is showing only the newest lines. */
async function showWholeLog(page: Page) {
  const showAll = page.getByRole("region", { name: "Log" }).getByRole("button", { name: "Show all" });
  if (await showAll.isVisible()) await showAll.click();
}

async function openLab(page: Page) {
  await page.goto(LAB_HREF);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Break the system");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

/** Freeze the clock and clear the scripted preset so every test starts from t = 0 with an empty pipeline. */
async function freezeAndReset(page: Page) {
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(clock(page)).toHaveText("t = 0.0 s");
  await expect(stat(totals(page), "Events")).toHaveText("0");
  await expect(page.getByLabel("Scenario")).toHaveValue("");
}

/** Click Step until `predicate` holds or `maxSteps` clicks have been spent. Returns the number of steps used. */
async function stepUntil(page: Page, predicate: () => Promise<boolean>, maxSteps: number): Promise<number> {
  const step = page.getByRole("button", { name: "Step", exact: true });
  for (let i = 0; i < maxSteps; i += 1) {
    if (await predicate()) return i;
    await step.click();
  }
  expect(await predicate(), `condition not reached within ${maxSteps} steps`).toBe(true);
  return maxSteps;
}

test.describe("webhook-delivery lab", () => {
  test("shows the disclaimer, the pipeline and a working Send control", async ({ page }) => {
    await openLab(page);
    await expect(page.locator("[data-chapter='lab-intro']").getByText(LAB_DISCLAIMER)).toBeVisible();

    const pipeline = page.locator("svg:visible").filter({ hasText: "Dead-letter queue" });
    await expect(pipeline).toHaveCount(1);
    await expect(pipeline).toContainText("Source");
    await expect(pipeline).toContainText("Queue");
    await expect(pipeline).toContainText("Workers");
    await expect(pipeline).toContainText("Subscriber A");
    await expect(pipeline).toContainText("Subscriber C");
    await expect(page.getByText(/Simulated time, ×\d+/)).toBeVisible();

    await freezeAndReset(page);
    const events = stat(totals(page), "Events");
    await expect(events).toHaveText("0");
    await page.getByRole("button", { name: "Send event", exact: true }).click();
    await expect(events).toHaveText("1");
    await expect(stat(totals(page), "Deliveries")).toHaveText("3");
    await expect(pipeline).toContainText("1 events sent");
    await page.getByRole("button", { name: "Send event", exact: true }).click();
    await expect(events).toHaveText("2");
    await expect(page.getByRole("list", { name: "Simulation log, newest first" })).toContainText("Three deliveries queued");
  });

  test("failing A leads to retries and dead letters while B and C keep delivering, then A recovers", async ({ page }) => {
    await openLab(page);
    await freezeAndReset(page);
    const sum = totals(page);
    const cardA = subscriber(page, "A");
    const cardB = subscriber(page, "B");
    const cardC = subscriber(page, "C");

    await page.getByRole("button", { name: "Fail A", exact: true }).click();
    await expect(cardA).toContainText("Failing · 503");
    const burstSize = page.getByLabel(/Burst size/);
    await burstSize.fill("10");
    await expect(burstSize).toHaveValue("10");
    await page.getByRole("button", { name: "Send burst", exact: true }).click();
    await expect(stat(sum, "Events")).toHaveText("10");
    await expect(stat(sum, "Deliveries")).toHaveText("30");

    // Retries appear first.
    let seenRetry = false;
    let seenOpen = false;
    const steps = await stepUntil(
      page,
      async () => {
        const dead = await statNumber(sum, "Dead letters");
        if (!seenRetry && (await statNumber(sum, "Waiting")) > 0 && (await statNumber(cardA, "Failed")) > 0) {
          seenRetry = (await deliveriesTable(page).getByText("Retry scheduled").count()) > 0;
        }
        if (!seenOpen) seenOpen = /Open/.test(await circuitBadge(cardA).innerText());
        return dead > 0;
      },
      120,
    );
    expect(steps, "the first dead letter should need more than a handful of moments").toBeGreaterThan(10);
    expect(seenRetry, "a retry-scheduled delivery was visible on the way").toBe(true);
    expect(seenOpen, "A's circuit opened on the way").toBe(true);

    expect(await statNumber(cardA, "Dead letters")).toBeGreaterThan(0);
    expect(await statNumber(cardA, "Failed")).toBeGreaterThanOrEqual(5);
    expect(await statNumber(cardA, "Delivered")).toBe(0);
    expect(await statNumber(cardB, "Delivered")).toBe(10);
    expect(await statNumber(cardC, "Delivered")).toBe(10);
    expect(await statNumber(cardB, "Failed")).toBe(0);
    expect(await statNumber(cardC, "Failed")).toBe(0);
    await expect(circuitBadge(cardA)).toContainText(/Open|Half-open/);
    const log = page.getByRole("list", { name: "Simulation log, newest first" });
    await showWholeLog(page);
    await expect(log).toContainText(/answered 503 \(attempt \d\)\. Retry in/);
    await expect(log).toContainText("moved to the dead-letter queue");
    await expect(log).toContainText("Circuit opened for Subscriber A after 3 consecutive failures");
    const dlq = page.getByRole("region", { name: "Dead-letter queue" });
    await expect(dlq).toContainText(/\d+ parked/);
    await expect(dlq).toContainText("failure budget of 4 exhausted");

    // Restore A: the circuit only closes once a probe succeeds, then the parked deliveries drain.
    await page.getByRole("button", { name: "Restore A", exact: true }).click();
    await expect(cardA).toContainText("Healthy");
    await expect(log).toContainText("Subscriber A restored to healthy");
    await stepUntil(page, async () => /Closed/.test(await circuitBadge(cardA).innerText()), 60);
    await expect(log).toContainText("Probe succeeded. Circuit closed for Subscriber A");
    await stepUntil(page, async () => (await statNumber(cardA, "Delivered")) > 0, 60);
    const deadBefore = await statNumber(sum, "Dead letters");
    await stepUntil(page, async () => (await statNumber(sum, "Waiting")) === 0 && (await statNumber(sum, "In flight")) === 0, 200);
    expect(await statNumber(sum, "Dead letters"), "no further dead letters after recovery").toBe(deadBefore);
    expect(await statNumber(cardA, "Delivered") + deadBefore).toBe(10);
  });

  test("replaying a dead letter creates a new delivery and leaves the original dead-lettered", async ({ page }) => {
    await openLab(page);
    await freezeAndReset(page);
    const sum = totals(page);
    await page.getByRole("button", { name: "Fail A", exact: true }).click();
    await page.getByLabel(/Burst size/).fill("4");
    await page.getByRole("button", { name: "Send burst", exact: true }).click();
    await stepUntil(page, async () => (await statNumber(sum, "Dead letters")) > 0, 150);

    const dlq = page.getByRole("region", { name: "Dead-letter queue" });
    const replayButton = dlq.getByRole("button", { name: /^Replay dlv-\d+$/ }).first();
    const originalId = (await replayButton.getAttribute("aria-label"))!.replace("Replay ", "");
    const deliveriesBefore = await statNumber(sum, "Deliveries");
    const deadBefore = await statNumber(sum, "Dead letters");

    await replayButton.click();
    await expect(stat(sum, "Deliveries")).toHaveText(String(deliveriesBefore + 1));
    await expect(stat(sum, "Dead letters")).toHaveText(String(deadBefore));
    await expect(dlq).toContainText(originalId);
    await expect(dlq).toContainText(/Replayed as dlv-\d+\./);

    // The inspector opens on the original: still a dead letter, now with a pointer to its replay.
    const inspector = page.getByRole("heading", { level: 3, name: originalId }).locator("xpath=ancestor::section[1]");
    await expect(inspector).toContainText("Dead letter");
    await expect(inspector).toContainText(/Replayed as dlv-\d+\./);
    await expect(inspector).toContainText("failure budget of 4 exhausted");

    // The deliveries table lists the replay separately.
    await page.getByRole("group", { name: "State" }).getByRole("button", { name: "Replays" }).click();
    const table = deliveriesTable(page);
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await expect(table.locator("tbody tr").first()).toContainText("replay");
    await expect(table.locator("tbody tr").first()).toContainText(/Queued|Processing|Retry scheduled/);
    await expect(page.getByRole("list", { name: "Simulation log, newest first" })).toContainText(`Replayed ${originalId} as`);

    // Replay button on the original is still offered (a second replay is legitimate) and the original never changes state.
    await page.getByRole("group", { name: "State" }).getByRole("button", { name: "Dead letters" }).click();
    await expect(table.locator("tbody tr").filter({ hasText: originalId })).toContainText("Dead letter");
  });

  test("Pause stops the clock and Step advances it", async ({ page }) => {
    await openLab(page);
    await expect(page.getByText("Running", { exact: true })).toBeVisible();
    const before = await clock(page).innerText();
    await expect.poll(() => clock(page).innerText()).not.toBe(before);

    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.getByText("Paused", { exact: true })).toBeVisible();
    const paused = await clock(page).innerText();
    // A negative assertion needs a bounded wait: the clock must not move for a while.
    await page.waitForTimeout(700);
    expect(await clock(page).innerText()).toBe(paused);
    await expect(page.getByText("Text summary of the current state")).toBeVisible();

    await page.getByRole("button", { name: "Step", exact: true }).click();
    await expect(clock(page)).not.toHaveText(paused);
    await expect(page.getByText("Paused", { exact: true })).toBeVisible();
    const stepped = await clock(page).innerText();
    await page.waitForTimeout(500);
    expect(await clock(page).innerText()).toBe(stepped);

    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByText("Running", { exact: true })).toBeVisible();
    await expect.poll(() => clock(page).innerText()).not.toBe(stepped);
  });

  test("keyboard shortcuts work on the page body and are ignored while typing", async ({ page }) => {
    await openLab(page);
    await freezeAndReset(page);
    const events = stat(totals(page), "Events");
    const blur = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    await blur();
    await page.keyboard.press("s");
    await expect(events).toHaveText("1");
    await page.keyboard.press("s");
    await expect(events).toHaveText("2");

    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Space");
    await expect(page.getByText("Running", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Space");
    await expect(page.getByText("Paused", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY), "space did not scroll the page").toBe(scrollBefore);

    const eventsNow = await events.innerText();
    const burst = page.getByLabel(/Burst size/);
    await burst.focus();
    await page.keyboard.press("s");
    await page.keyboard.press("Space");
    await page.keyboard.press("f");
    await expect(events).toHaveText(eventsNow);
    await expect(page.getByText("Paused", { exact: true })).toBeVisible();
    await expect(subscriber(page, "A")).toContainText("Healthy");

    await blur();
    await page.keyboard.press("f");
    await expect(subscriber(page, "A")).toContainText("Failing · 503");
    await page.keyboard.press("r");
    await expect(subscriber(page, "A")).toContainText("Healthy");
  });

  test("the HMAC demo verifies a valid signature and fails on tampering or a stale timestamp", async ({ page }) => {
    await openLab(page);
    const demo = page.locator("#signed-payloads");
    await demo.scrollIntoViewIfNeeded();
    const result = demo.getByRole("status", { name: "Verify result" });
    await expect(result).toContainText("Valid", { timeout: 20_000 });
    await expect(result).not.toContainText("Invalid");
    const header = demo.locator("dd").filter({ hasText: /^t=\d+,v1=[0-9a-f]{64}$/ });
    await expect(header).toHaveCount(1);
    await expect(demo.getByLabel("Webhook body")).toContainText('"guests": 2');

    await demo.getByLabel("Tamper with payload").check();
    await expect(demo.getByLabel("Webhook body")).toContainText('"guests": 3');
    await expect(result).toContainText("Invalid · signature mismatch");
    await expect(result).toContainText("One character of the body changed after signing");

    await demo.getByLabel("Tamper with payload").uncheck();
    await expect(result).toContainText("Valid");
    await expect(result).not.toContainText("Invalid");

    await demo.getByLabel("Age the timestamp beyond tolerance").check();
    await expect(result).toContainText("Invalid · timestamp outside tolerance");
    await demo.getByLabel("Age the timestamp beyond tolerance").uncheck();
    await expect(result).toContainText("Valid");

    // Re-signing the tampered body makes it valid again: the signature covers whatever was signed.
    await demo.getByLabel("Tamper with payload").check();
    await expect(result).toContainText("Invalid");
    await demo.getByRole("button", { name: "Re-sign current body" }).click();
    await expect(result).toContainText("Valid");
    await expect(result).not.toContainText("Invalid");
  });

  test.describe("pulses", () => {
    async function runBurstAtRealTime(page: Page) {
      await freezeAndReset(page);
      await page.getByLabel("Speed").selectOption("1");
      await page.getByLabel(/Burst size/).fill("10");
      await page.getByRole("button", { name: "Send burst", exact: true }).click();
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      await expect.poll(() => statNumber(totals(page), "In flight")).toBeGreaterThan(0);
    }

    test("draw SMIL pulses while running with full motion", async ({ page }) => {
      await openLab(page);
      await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
      await runBurstAtRealTime(page);
      await expect.poll(() => page.locator("animateMotion").count()).toBeGreaterThan(0);
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      await expect(page.locator("animateMotion")).toHaveCount(0);
    });

    test.describe("with reduced motion", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      test("are not rendered at all", async ({ page }) => {
        await openLab(page);
        await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
        await runBurstAtRealTime(page);
        expect(await statNumber(totals(page), "In flight")).toBeGreaterThan(0);
        await expect(page.locator("animateMotion")).toHaveCount(0);
        await expect.poll(() => statNumber(totals(page), "Delivered")).toBeGreaterThan(0);
        await expect(page.locator("animateMotion")).toHaveCount(0);
      });
    });
  });

  test.describe("narrow screens", () => {
    test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

    test("show the vertical pipeline and the sticky quick controls", async ({ page }) => {
      await openLab(page);
      const pipeline = page.locator("svg:visible").filter({ hasText: "Dead-letter queue" });
      await expect(pipeline).toHaveCount(1);
      expect(await pipeline.getAttribute("viewBox")).toBe("0 0 360 616");
      const quick = page.getByRole("group", { name: "Quick controls" });
      await expect(quick).toBeVisible();
      await quick.getByRole("button", { name: "Pause", exact: true }).click();
      await expect(quick.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
      const events = stat(totals(page), "Events");
      const before = await statNumber(totals(page), "Events");
      await quick.getByRole("button", { name: "Send", exact: true }).click();
      await expect(events).toHaveText(String(before + 1));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  });
});
