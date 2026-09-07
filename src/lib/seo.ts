import type { Metadata, ResolvingMetadata } from "next";
import { nav, secondaryNav, site } from "@/content/site";
import { caseStudies } from "@/content/work";

/** Absolute URL for a site path. The home path returns the bare origin. */
export function absoluteUrl(path: string): string {
  return path === "/" ? site.url : `${site.url}${path}`;
}

const PRIORITY: Record<string, number> = {
  "/": 1,
  "/work": 0.9,
  "/products": 0.8,
  "/experience": 0.8,
  "/contact": 0.6,
};

/** Every public route: the primary pages, the case studies and the lab. */
export function siteRoutes(): { path: string; priority: number }[] {
  return [
    { path: "/", priority: PRIORITY["/"] },
    ...nav.map((item) => ({ path: item.href, priority: PRIORITY[item.href] ?? 0.7 })),
    ...caseStudies.map((c) => ({ path: `/work/${c.slug}`, priority: 0.8 })),
    ...secondaryNav.map((item) => ({ path: item.href, priority: 0.7 })),
  ];
}

export interface PageMeta {
  /** Page name only; the root layout's template appends the site name. */
  title: string;
  description: string;
  /** Site-relative path, used for the canonical and Open Graph URLs. */
  path: string;
}

/**
 * Page metadata in the shape the root layout expects. Open Graph and Twitter
 * carry the full title because those objects replace the root values
 * wholesale, and the root's file-based sharing images are carried forward from
 * the parent metadata for the same reason.
 */
export async function pageMetadata(
  { title, description, path }: PageMeta,
  parent?: ResolvingMetadata,
): Promise<Metadata> {
  const resolvedParent = parent ? await parent : undefined;
  const fullTitle = `${title} | ${site.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_GB",
      siteName: site.name,
      url: path,
      title: fullTitle,
      description,
      images: resolvedParent?.openGraph?.images ?? [],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: resolvedParent?.twitter?.images ?? [],
    },
  };
}
