import { expect, test, type Page } from "@playwright/test";
import { site } from "@/content/site";
import { caseStudies, legoSelfReturns } from "@/content/work";

async function personJsonLd(page: Page) {
  const scripts = await page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
    els.map((el) => el.textContent ?? ""),
  );
  const parsed = scripts.map((text) => JSON.parse(text) as Record<string, unknown>);
  const people = parsed.filter((data) => data["@type"] === "Person");
  return { parsed, people };
}

test.describe("/work", () => {
  test("lists the three case studies with links", async ({ page }) => {
    await page.goto("/work");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Complex problems. Real outcomes.");
    const items = page.getByRole("main").locator("ol > li > article");
    await expect(items).toHaveCount(3);
    for (const [index, study] of caseStudies.entries()) {
      const item = items.nth(index);
      await expect(item.getByRole("heading", { level: 2 })).toContainText(study.headline);
      await expect(item.getByRole("heading", { level: 2 }).getByRole("link")).toHaveAttribute("href", `/work/${study.slug}`);
      await expect(item.getByRole("link", { name: "Read the case study" })).toHaveAttribute("href", `/work/${study.slug}`);
      await expect(item).toContainText(study.client);
      if (study.via) await expect(item).toContainText(study.via);
    }
    await expect(page.getByRole("heading", { name: new RegExp(`${legoSelfReturns.value}`) })).toBeVisible();
  });

  for (const study of caseStudies) {
    test(`case study /work/${study.slug} loads directly`, async ({ page }) => {
      const response = await page.goto(`/work/${study.slug}`);
      expect(response?.status()).toBe(200);
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText(study.headline);
      await expect(page.getByRole("heading", { name: "What this page does not claim" })).toBeVisible();
      await expect(page.locator("#boundaries")).toContainText("The claims above are limited to what the CV supports");
      await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(study.client);
      await expect(page).toHaveTitle(new RegExp(`${site.name}$`));
    });
  }

  test("an unknown case study is a 404", async ({ page }) => {
    const response = await page.goto("/work/not-a-real-programme");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This route was not found.");
  });
});

test.describe("/experience", () => {
  test("has every anchor and the attributed self-returns result", async ({ page }) => {
    await page.goto("/experience");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    for (const id of ["latest", "deloitte", "lego-self-returns", "dyson", "earlier", "education"]) {
      await expect(page.locator(`#${id}`), `#${id}`).toHaveCount(1);
    }
    const selfReturns = page.locator("#lego-self-returns");
    await expect(selfReturns).toContainText(legoSelfReturns.value);
    await expect(selfReturns).toContainText("Separate engagement");
    await expect(page.locator("#dyson")).toContainText("delivered through Deloitte Digital");

    // In-page navigation reaches the section.
    await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: /Education/ }).click();
    await expect(page).toHaveURL(/#education$/);
    await expect(page.locator("#education")).toBeInViewport();
  });
});

test.describe("/contact", () => {
  test("shows the contact links and copies the email address", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only in Playwright");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Let's build what comes next.");

    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: site.email })).toHaveAttribute("href", `mailto:${site.email}`);
    await expect(main.getByRole("link", { name: new RegExp(site.linkedinLabel) })).toHaveAttribute("href", site.linkedin);
    const cv = main.getByRole("link", { name: "Download CV (PDF)" });
    await expect(cv).toHaveAttribute("href", site.cvHref);
    await expect(cv).toHaveAttribute("download", "");

    const copy = main.getByRole("button", { name: `Copy email address ${site.email}` });
    await expect(copy).toContainText("Copy email");
    await copy.click();
    await expect(copy).toContainText("Copied");
    await expect(page.getByRole("status").filter({ hasText: "Email address copied" })).toBeAttached();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(site.email);
    // The button returns to its resting label afterwards.
    await expect(copy).toContainText("Copy email", { timeout: 5_000 });
  });
});

test.describe("documents and machine-readable routes", () => {
  test("/cv redirects to the PDF, served as an attachment", async ({ request }) => {
    const redirect = await request.get("/cv", { maxRedirects: 0 });
    expect(redirect.status()).toBe(307);
    const location = redirect.headers()["location"];
    expect(location).toBeTruthy();
    expect(new URL(location, "http://localhost:3400").pathname).toBe(site.cvFile);

    const pdf = await request.get(site.cvFile);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect(pdf.headers()["content-disposition"]).toMatch(/^attachment/);
    expect(pdf.headers()["content-disposition"]).toContain(site.cvFileName);
    const body = await pdf.body();
    expect(body.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  test("sitemap and robots respond", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain(`${site.url}/work/external-api-platform`);
    for (const study of caseStudies) expect(xml).toContain(`${site.url}/work/${study.slug}`);
    expect(xml).toContain(`${site.url}/lab/webhook-delivery`);

    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const text = await robots.text();
    expect(text).toMatch(/User-Agent: \*/i);
    expect(text).toContain(`Sitemap: ${site.url}/sitemap.xml`);
    expect(text).toContain("Disallow: /poster");
  });

  test("an unknown route returns 404 with the not-found view", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This route was not found.");
    const routes = page.getByRole("navigation", { name: "Site routes" });
    await expect(routes.getByRole("link", { name: /Home/ })).toHaveAttribute("href", "/");
    await expect(routes.getByRole("link", { name: /Lab/ })).toHaveAttribute("href", "/lab/webhook-delivery");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeAttached();
  });
});

test.describe("structured data", () => {
  for (const path of ["/", "/contact"]) {
    test(`Person JSON-LD on ${path}`, async ({ page }) => {
      await page.goto(path);
      const { people } = await personJsonLd(page);
      expect(people).toHaveLength(1);
      const person = people[0];
      expect(person["@context"]).toBe("https://schema.org");
      expect(person.name).toBe(site.name);
      expect(person.url).toBe(site.url);
      expect(person.jobTitle).toBe(site.role);
      expect(person.sameAs).toEqual([site.linkedin]);
      expect(person).not.toHaveProperty("worksFor");
      expect(person).not.toHaveProperty("aggregateRating");
      expect(person).not.toHaveProperty("telephone");
    });
  }
});
