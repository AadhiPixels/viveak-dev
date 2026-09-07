import { expect, test, type Page } from "@playwright/test";
import { caseStudies } from "@/content/work";
import { site } from "@/content/site";
import { HOME } from "./helpers";

const PAGES = [
  "/",
  "/work",
  ...caseStudies.map((study) => `/work/${study.slug}`),
  "/products",
  "/experience",
  "/contact",
  "/lab/webhook-delivery",
  "/play",
];

interface FocusStop {
  index: number;
  tag: string;
  name: string;
  href: string | null;
  visibility: string;
  display: string;
  effectiveOpacity: number;
  outlineStyle: string;
  outlineWidth: string;
  boxShadow: string;
  inViewport: boolean;
  isBody: boolean;
}

/** Describe the element that currently holds focus. */
async function describeFocus(page: Page, index: number): Promise<FocusStop> {
  return page.evaluate(async (index) => {
    const el = document.activeElement as HTMLElement | null;
    // Short focus transitions (the skip links slide in over 150ms) may still be running,
    // or not yet started under load: give the element up to a second to arrive on screen.
    const onScreen = (node: Element) => {
      const r = node.getBoundingClientRect();
      return r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    };
    if (el && el !== document.body) {
      for (let i = 0; i < 20 && !onScreen(el); i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    if (!el || el === document.body) {
      return {
        index,
        tag: "body",
        name: "",
        href: null,
        visibility: "visible",
        display: "block",
        effectiveOpacity: 1,
        outlineStyle: "none",
        outlineWidth: "0px",
        boxShadow: "none",
        inViewport: true,
        isBody: true,
      };
    }
    const cs = getComputedStyle(el);
    let opacity = 1;
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      opacity *= Number(getComputedStyle(node).opacity || "1");
    }
    const labelledBy = el.getAttribute("aria-labelledby");
    const labelled = labelledBy
      ? labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .join(" ")
      : "";
    const name = (el.getAttribute("aria-label") || labelled || el.textContent || "").replace(/\s+/g, " ").trim();
    return {
      index,
      tag: el.tagName.toLowerCase(),
      name,
      href: el.getAttribute("href"),
      visibility: cs.visibility,
      display: cs.display,
      effectiveOpacity: opacity,
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      boxShadow: cs.boxShadow,
      inViewport: onScreen(el),
      isBody: false,
    };
  }, index);
}

async function tabStops(page: Page, count: number): Promise<FocusStop[]> {
  const stops: FocusStop[] = [];
  for (let i = 0; i < count; i += 1) {
    await page.keyboard.press("Tab");
    stops.push(await describeFocus(page, i + 1));
  }
  return stops;
}

test.describe("keyboard", () => {
  test("Tab reaches the skip links, then the header, then the hero actions, with visible focus", async ({ page }, testInfo) => {
    await page.goto(HOME);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await expect(page.locator(".pin-spacer")).toHaveCount(1);

    const stops = await tabStops(page, 30);
    testInfo.annotations.push({
      type: "tab order",
      description: stops.map((s) => `${s.index}. ${s.tag} "${s.name}"${s.href ? ` (${s.href})` : ""}`).join(" | "),
    });

    const names = stops.map((s) => s.name);
    expect(names.slice(0, 2)).toEqual(["Skip to content", "Skip to selected work"]);
    expect(stops[0].href).toBe("#main");
    expect(stops[1].href).toBe("#selected-work");

    // Header: home link, primary navigation, CV.
    expect(names[2]).toBe(`${site.name}, home`);
    expect(names.slice(3, 9)).toEqual(["Work", "Products", "Experience", "Contact", "Lab", "Play"]);
    expect(names[9]).toBe("Download CV (PDF)");

    // Hero actions follow the header.
    expect(names.slice(10, 14)).toEqual(["Explore my work", "Download CV", "Get in touch", "Skip to selected work"]);

    for (const stop of stops) {
      expect(stop.isBody, `stop ${stop.index} landed on the body`).toBe(false);
      expect(stop.visibility, `stop ${stop.index} (${stop.name}) is visibility:hidden`).not.toBe("hidden");
      expect(stop.display, `stop ${stop.index} (${stop.name}) is display:none`).not.toBe("none");
      expect(stop.effectiveOpacity, `stop ${stop.index} (${stop.name}) is transparent`).toBeGreaterThan(0.5);
      expect(stop.inViewport, `stop ${stop.index} (${stop.name}) is off screen`).toBe(true);
      const ring = stop.outlineStyle !== "none" && stop.outlineWidth !== "0px";
      expect(ring, `stop ${stop.index} (${stop.name}) has no visible focus outline: ${stop.outlineStyle} ${stop.outlineWidth}`).toBe(true);
    }
  });

  test("the skip link moves focus and scroll to the selected work", async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to selected work" }).first()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#selected-work$/);
    await expect(page.locator("#selected-work")).toBeInViewport();
  });

  test("the footer motion control is operable with arrow keys", async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    const group = page.getByRole("radiogroup", { name: "Motion" });
    await group.getByRole("radio", { name: "Auto" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("radio", { name: "Full" })).toBeChecked();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("radio", { name: "Reduced" })).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
  });
});

for (const path of PAGES) {
  test.describe(`semantics on ${path}`, () => {
    test("images have alt text and controls have names", async ({ page }) => {
      await page.goto(path === "/" ? HOME : path);
      await expect(page.locator("img:not([alt])")).toHaveCount(0);

      const unnamed = await page.evaluate(() => {
        const out: string[] = [];
        const nameOf = (el: HTMLElement): string => {
          const label = el.getAttribute("aria-label");
          if (label?.trim()) return label.trim();
          const by = el.getAttribute("aria-labelledby");
          if (by) {
            const text = by
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent ?? "")
              .join(" ")
              .trim();
            if (text) return text;
          }
          const clone = el.cloneNode(true) as HTMLElement;
          clone.querySelectorAll("[aria-hidden='true']").forEach((n) => n.remove());
          const text = clone.textContent?.replace(/\s+/g, " ").trim() ?? "";
          if (text) return text;
          const img = el.querySelector("img[alt]");
          if (img?.getAttribute("alt")?.trim()) return img.getAttribute("alt")!.trim();
          const svgTitle = el.querySelector("svg title");
          if (svgTitle?.textContent?.trim()) return svgTitle.textContent.trim();
          return el.getAttribute("title")?.trim() ?? "";
        };
        for (const el of Array.from(document.querySelectorAll<HTMLElement>("a[href], button, [role='button']"))) {
          if (!nameOf(el)) out.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""} ${el.className.toString().slice(0, 60)}`);
        }
        return out;
      });
      expect(unnamed, "links and buttons without an accessible name").toEqual([]);

      const controls = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>("input, select, textarea"))
          .filter((el) => (el as HTMLInputElement).type !== "hidden")
          .map((el) => {
            const id = el.id;
            const wrapped = el.closest("label") !== null;
            const byFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) !== null : false;
            const aria = Boolean(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));
            return { ok: wrapped || byFor || aria, desc: `${el.tagName.toLowerCase()}[type=${(el as HTMLInputElement).type}]` };
          })
          .filter((c) => !c.ok)
          .map((c) => c.desc),
      );
      expect(controls, "form controls without a label").toEqual([]);
    });

    test("has one h1 and heading levels that do not skip", async ({ page }) => {
      await page.goto(path === "/" ? HOME : path);
      const headings = await page.evaluate(() =>
        Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
          .filter((h) => !h.closest("dialog"))
          .map((h) => ({ level: Number(h.tagName[1]), text: (h.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60) })),
      );
      expect(headings.filter((h) => h.level === 1)).toHaveLength(1);
      expect(headings[0]?.level, "the first heading is the h1").toBe(1);
      const skips: string[] = [];
      for (let i = 1; i < headings.length; i += 1) {
        if (headings[i].level > headings[i - 1].level + 1) {
          skips.push(`h${headings[i - 1].level} "${headings[i - 1].text}" → h${headings[i].level} "${headings[i].text}"`);
        }
      }
      expect(skips, "heading level jumps").toEqual([]);
    });
  });
}
