import { roles } from "@/content/experience";
import { caseStudies } from "@/content/work";
import type { CaseStudy, Engagement } from "@/content/types";

/** The experience-page engagement that a case study restates, if any. */
export function getEngagementForCaseStudy(slug: string): Engagement | undefined {
  for (const role of roles) {
    const match = role.engagements?.find((e) => e.caseStudy === slug);
    if (match) return match;
  }
  return undefined;
}

/**
 * Attribution line for the facts strip. Client programmes carry the
 * experience page's attribution sentence; everything else was direct
 * employment with the named organisation.
 */
export function getCaseStudyAttribution(cs: CaseStudy): string {
  const engagement = getEngagementForCaseStudy(cs.slug);
  if (engagement) return engagement.attribution;
  if (cs.client === "Latest project") return "Current role. Employer deliberately not named on this site.";
  return `Direct employment at ${cs.client}`;
}

/**
 * Caption body for `CaseStudyDiagram`, which prefixes every caption with
 * "Conceptual illustration." itself. Drops the same opening phrase from the
 * authored caption so the label is not read twice.
 */
export function diagramCaptionBody(caption: string): string {
  const stripped = caption.replace(/^Conceptual illustration(?: of|:)?\s+/i, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/** Previous and next case studies in index order, without wrapping. */
export function getCaseStudyNeighbours(slug: string): {
  previous?: CaseStudy;
  next?: CaseStudy;
} {
  const index = caseStudies.findIndex((c) => c.slug === slug);
  if (index === -1) return {};
  return {
    previous: index > 0 ? caseStudies[index - 1] : undefined,
    next: index < caseStudies.length - 1 ? caseStudies[index + 1] : undefined,
  };
}
