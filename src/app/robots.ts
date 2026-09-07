import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Build-time poster renderer, not a public page.
      disallow: "/poster",
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
