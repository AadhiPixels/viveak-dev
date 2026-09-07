import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/** Web app manifest: names and icons for home-screen bookmarks; the site stays a website. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} | ${site.concept}`,
    short_name: site.shortName,
    description: site.description,
    start_url: "/",
    display: "browser",
    background_color: "#050507",
    theme_color: "#050507",
    lang: "en-GB",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
