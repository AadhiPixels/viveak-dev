import { site } from "@/content/site";
import { JsonLd } from "./JsonLd";

/** WebSite schema for the home page: name, URL and author only; no search action, no ratings. */
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: `${site.name} | ${site.concept}`,
        url: site.url,
        inLanguage: "en-GB",
        author: { "@type": "Person", name: site.name, url: site.url },
      }}
    />
  );
}
