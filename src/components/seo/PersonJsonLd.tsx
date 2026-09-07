import { education } from "@/content/experience";
import { site } from "@/content/site";
import { JsonLd } from "./JsonLd";

/**
 * Factual Person schema. Every value comes from the content layer: no ratings,
 * no invented affiliations, only the degree-awarding institution and the one
 * public profile the CV lists. The current employer is deliberately not named
 * anywhere on the site, so worksFor is omitted.
 */
export function PersonJsonLd() {
  const locality = site.location.split(",")[0].trim();

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Person",
        name: site.name,
        url: site.url,
        jobTitle: site.role,
        alumniOf: { "@type": "CollegeOrUniversity", name: education.institution },
        sameAs: [site.linkedin],
        address: { "@type": "PostalAddress", addressLocality: locality, addressCountry: "GB" },
        email: `mailto:${site.email}`,
      }}
    />
  );
}
