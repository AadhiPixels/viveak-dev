import { expect, test, type Locator, type Page } from "@playwright/test";
import { walkthroughDisclaimer } from "@/content/products";
import { DESKTOP, MOBILE } from "./helpers";

/** KPI value in a demo `<dl>` (label in a `dt`, number in the sibling `dd`). */
function kpi(scope: Locator, label: string): Locator {
  return scope.locator("dt").filter({ hasText: new RegExp(`^${label}$`) }).locator("xpath=following-sibling::dd[1]");
}

async function revealWalkthrough(page: Page, name: "cococard" | "fixabee"): Promise<Locator> {
  const root = page.locator(`[data-walkthrough="${name}"]`);
  await expect(root).toHaveCount(1);
  // The block settles in on scroll; bring it into view first so the entrance runs and clears.
  await root.scrollIntoViewIfNeeded();
  await expect(root).toBeVisible();
  await expect.poll(() => root.evaluate((el) => getComputedStyle(el).opacity), { timeout: 10_000 }).toBe("1");
  return root;
}

const VIEWPORTS = [
  { name: "desktop", viewport: DESKTOP },
  { name: "mobile", viewport: MOBILE },
] as const;

for (const { name, viewport } of VIEWPORTS) {
  test.describe(`/products (${name})`, () => {
    test.use({ viewport, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 });

    test("labels both walkthroughs as synthetic", async ({ page }) => {
      await page.goto("/products");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByText(walkthroughDisclaimer, { exact: true })).toHaveCount(2);
      await expect(page.getByText("Conceptual walkthrough · synthetic data", { exact: true })).toHaveCount(2);
      await expect(page.locator("#thecococard")).toBeAttached();
      await expect(page.locator("#fixabee")).toBeAttached();
    });

    test("TheCocoCard: visits fill the card, the reward redeems and the back office follows", async ({ page }) => {
      await page.goto("/products");
      const root = await revealWalkthrough(page, "cococard");
      const customer = root.locator('[data-screen="cococard-customer"]');
      const office = root.locator('[data-screen="cococard-backoffice"]');
      const stamps = customer.locator("[data-stamps]");
      const record = customer.getByRole("button", { name: "Record a visit for Sam" });
      const redeem = customer.getByRole("button", { name: "Redeem free coffee" });

      await expect(stamps).toHaveAttribute("data-stamps", "4");
      await expect(customer.getByText("4 of 6 stamps", { exact: true })).toBeVisible();
      await expect(customer.getByText("2 more visits for a free coffee.")).toBeVisible();
      await expect(redeem).toBeDisabled();
      await expect(kpi(office, "Visits today")).toHaveText("18");
      await expect(kpi(office, "Rewards redeemed")).toHaveText("23");

      await record.click();
      await expect(stamps).toHaveAttribute("data-stamps", "5");
      await expect(customer.getByText("1 more visit for a free coffee.")).toBeVisible();
      await expect(kpi(office, "Visits today")).toHaveText("19");
      await expect(redeem).toBeDisabled();

      await record.click();
      await expect(stamps).toHaveAttribute("data-stamps", "6");
      await expect(customer.getByText("Reward ready", { exact: true })).toBeVisible();
      await expect(customer.getByText("Your free coffee is ready to redeem.")).toBeVisible();
      await expect(record).toBeDisabled();
      await expect(redeem).toBeEnabled();
      await expect(kpi(office, "Visits today")).toHaveText("20");
      await expect(office.getByRole("list", { name: "Recent activity" }).getByRole("listitem").first()).toContainText("6/6");

      await redeem.click();
      await expect(stamps).toHaveAttribute("data-stamps", "0");
      await expect(customer.getByText("0 of 6 stamps", { exact: true })).toBeVisible();
      await expect(customer.getByText("6 more visits for a free coffee.")).toBeVisible();
      await expect(customer.getByText("Rewards redeemed")).toHaveText(/Rewards redeemed\s*1$/);
      await expect(redeem).toBeDisabled();
      await expect(record).toBeEnabled();
      await expect(kpi(office, "Rewards redeemed")).toHaveText("24");
      await expect(kpi(office, "Visits today")).toHaveText("20");
      await expect(kpi(office, "Members")).toHaveText("146");
      const latest = office.getByRole("list", { name: "Recent activity" }).getByRole("listitem").first();
      await expect(latest).toContainText("Sam");
      await expect(latest).toContainText("Free coffee redeemed");
      await expect(root.getByRole("status")).toHaveText("Free coffee redeemed. Card reset to 0 stamps.");

      await root.getByRole("button", { name: "Reset demo" }).click();
      await expect(stamps).toHaveAttribute("data-stamps", "4");
      await expect(kpi(office, "Visits today")).toHaveText("18");
    });

    test("Fixabee: a request appears in the provider app and its decision flows back", async ({ page }) => {
      await page.goto("/products");
      const root = await revealWalkthrough(page, "fixabee");
      const customer = root.locator('[data-screen="fixabee-customer"]');
      const provider = root.locator('[data-screen="fixabee-provider"]');

      const services = customer.getByRole("group", { name: "Service" });
      const areas = customer.getByRole("group", { name: "Postcode area" });
      const service = (label: string) => services.getByRole("button", { name: label, exact: true });
      const area = (code: string) => areas.getByRole("button", { name: new RegExp(`^${code}\\b`) });

      await expect(service("Plumbing")).toHaveAttribute("aria-pressed", "true");
      await expect(area("E2")).toHaveAttribute("aria-pressed", "true");
      await expect(customer.getByText(/^3 sample providers in E2$/)).toBeVisible();
      await expect(customer.getByText("Request a booking to follow its status here.")).toBeVisible();
      await expect(provider.getByText("No new requests.", { exact: false })).toBeVisible();

      await service("Cleaning").click();
      await expect(service("Cleaning")).toHaveAttribute("aria-pressed", "true");
      await expect(service("Plumbing")).toHaveAttribute("aria-pressed", "false");
      await area("SE1").click();
      await expect(area("SE1")).toHaveAttribute("aria-pressed", "true");
      await expect(area("E2")).toHaveAttribute("aria-pressed", "false");
      await expect(customer.getByText(/^2 sample providers in SE1$/)).toBeVisible();

      const providerName = "Marlow & Finch Cleaning";
      await customer.getByRole("button", { name: `Request booking with ${providerName}` }).click();
      await expect(customer.getByRole("button", { name: `Booking requested with ${providerName}` })).toBeDisabled();
      const booking = customer.locator("[data-booking-status]");
      await expect(booking).toHaveAttribute("data-booking-status", "requested");
      await expect(booking).toContainText(providerName);
      await expect(booking).toContainText("Cleaning · SE1");
      await expect(booking).toContainText(`Waiting for ${providerName} to confirm.`);

      // The provider app switches to the requested provider and shows the incoming request.
      await expect(provider.getByText(providerName, { exact: true }).first()).toBeVisible();
      const incoming = provider.getByRole("region", { name: "Incoming requests" });
      const request = incoming.locator("[data-request]");
      await expect(request).toHaveCount(1);
      await expect(request).toContainText("Cleaning · SE1");
      await expect(request).toContainText("Sam · Tomorrow, 09:00 to 11:00");

      await request.getByRole("button", { name: "Accept cleaning request from Sam" }).click();
      await expect(booking).toHaveAttribute("data-booking-status", "accepted");
      await expect(booking).toContainText("Accepted");
      await expect(booking).toContainText(`${providerName} is booked for tomorrow, 09:00 to 11:00.`);
      await expect(incoming.locator("[data-request]")).toHaveCount(0);
      await expect(incoming).toContainText("No new requests.");
      const schedule = provider.getByRole("region", { name: "Schedule" });
      await expect(schedule).toContainText("Cleaning · SE1 · Sam");
      await expect(schedule.getByRole("button", { name: "Mark cleaning job for Sam complete" })).toBeVisible();
      await expect(root.getByRole("status")).toHaveText(
        `${providerName} accepted the cleaning request. Customer status is now accepted.`,
      );

      await schedule.getByRole("button", { name: "Mark cleaning job for Sam complete" }).click();
      await expect(booking).toHaveAttribute("data-booking-status", "completed");
      await expect(booking).toContainText("Completed");

      await root.getByRole("button", { name: "Reset demo" }).click();
      await expect(service("Plumbing")).toHaveAttribute("aria-pressed", "true");
      await expect(area("E2")).toHaveAttribute("aria-pressed", "true");
      await expect(customer.getByText("Request a booking to follow its status here.")).toBeVisible();
    });
  });
}
