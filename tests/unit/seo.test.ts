import { describe, expect, it } from "vitest";
import { nav, secondaryNav, site } from "@/content/site";
import { caseStudies, legoSelfReturns } from "@/content/work";
import { absoluteUrl, pageMetadata, siteRoutes } from "@/lib/seo";
import {
  diagramCaptionBody,
  getCaseStudyAttribution,
  getCaseStudyNeighbours,
} from "@/lib/work";

describe("site routes", () => {
  it("lists every primary page, case study and the lab exactly once", () => {
    const paths = siteRoutes().map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain("/");
    for (const item of [...nav, ...secondaryNav]) expect(paths).toContain(item.href);
    for (const cs of caseStudies) expect(paths).toContain(`/work/${cs.slug}`);
    expect(paths).toContain(legoSelfReturns.href.split("#")[0]);
    for (const r of siteRoutes()) {
      expect(r.priority).toBeGreaterThan(0);
      expect(r.priority).toBeLessThanOrEqual(1);
    }
  });

  it("builds absolute URLs without a trailing slash on the origin", () => {
    expect(absoluteUrl("/")).toBe(site.url);
    expect(absoluteUrl("/work")).toBe(`${site.url}/work`);
  });
});

describe("pageMetadata", () => {
  it("sets the page title, canonical and full social titles", async () => {
    const meta = await pageMetadata({ title: "Work", description: "Selected work.", path: "/work" });
    expect(meta.title).toBe("Work");
    expect(meta.alternates?.canonical).toBe("/work");
    expect(meta.openGraph?.title).toBe(`Work | ${site.name}`);
    expect(meta.openGraph?.url).toBe("/work");
    expect(meta.twitter?.title).toBe(`Work | ${site.name}`);
  });

  it("carries the parent's sharing images forward", async () => {
    const parent = Promise.resolve({
      openGraph: { images: [{ url: "/opengraph-image.png?x" }] },
      twitter: { images: [{ url: "/twitter-image.png?x" }] },
    }) as unknown as Parameters<typeof pageMetadata>[1];
    const meta = await pageMetadata({ title: "Contact", description: "d", path: "/contact" }, parent);
    expect(meta.openGraph?.images).toEqual([{ url: "/opengraph-image.png?x" }]);
    expect(meta.twitter?.images).toEqual([{ url: "/twitter-image.png?x" }]);
  });
});

describe("case-study helpers", () => {
  it("keeps the Deloitte attribution on client programmes and none on direct employment", () => {
    for (const cs of caseStudies) {
      const attribution = getCaseStudyAttribution(cs);
      if (cs.client === "Latest project") expect(attribution).toContain("Current role");
      else if (cs.via) expect(attribution).toContain("Deloitte Digital");
      else expect(attribution).toBe(`Direct employment at ${cs.client}`);
    }
  });

  it("walks previous and next without wrapping", () => {
    const first = caseStudies[0];
    const last = caseStudies[caseStudies.length - 1];
    expect(getCaseStudyNeighbours(first.slug).previous).toBeUndefined();
    expect(getCaseStudyNeighbours(first.slug).next?.slug).toBe(caseStudies[1].slug);
    expect(getCaseStudyNeighbours(last.slug).next).toBeUndefined();
    expect(getCaseStudyNeighbours("missing")).toEqual({});
  });

  it("drops the repeated 'Conceptual illustration' opener from diagram captions", () => {
    for (const cs of caseStudies) {
      const body = diagramCaptionBody(cs.diagramCaption);
      expect(body.startsWith("Conceptual illustration")).toBe(false);
      expect(body.charAt(0)).toBe(body.charAt(0).toUpperCase());
      expect(body.length).toBeGreaterThan(20);
    }
    expect(diagramCaptionBody("Plain caption.")).toBe("Plain caption.");
  });
});
