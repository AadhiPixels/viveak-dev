/**
 * Content layer types.
 *
 * Every public claim on the site is authored here once and traced to a source.
 * The CV (public/Viveak-Vadivelkarasan-CV.pdf) is authoritative for career
 * claims; anything marked `authored` is a newly written conceptual explanation
 * and must not be presented as history.
 */

export type SourceKind =
  | "cv" // Supported directly by the CV text
  | "verified-url" // Public URL checked during the build
  | "authored"; // Conceptual explanation written for this site, not a historical claim

export interface Source {
  kind: SourceKind;
  /** Where in the CV (section or role) or which URL was verified. */
  ref: string;
  /** Optional note about qualifiers to preserve. */
  note?: string;
}

export interface Fact {
  id: string;
  /** Headline value as printed, e.g. "~1M". */
  value: string;
  /** Unit or noun immediately attached to the value, e.g. "events per day". */
  label: string;
  /** Sentence of context that keeps the CV's qualifiers. */
  context: string;
  /** Where the number is evidenced on this site. */
  href: string;
  hrefLabel: string;
  source: Source;
}

export interface Role {
  id: string;
  employer: string;
  title: string;
  period: string;
  location?: string;
  /** Short framing sentence, taken or lightly adapted from the CV. */
  summary?: string;
  bullets: string[];
  /** Sub-engagements, e.g. Deloitte client programmes. */
  engagements?: Engagement[];
  source: Source;
}

export interface Engagement {
  id: string;
  title: string;
  client: string;
  period: string;
  /** Attribution line, e.g. "Client programme delivered through Deloitte Digital". */
  attribution: string;
  bullets: string[];
  /** Case study slug if one exists. */
  caseStudy?: string;
}

export interface EarlierRole {
  id: string;
  employer: string;
  title: string;
  period: string;
  description: string;
}

export interface CaseStudy {
  slug: string;
  /** Client or employer as displayed. */
  client: string;
  /** Attribution qualifier, e.g. "via Deloitte Digital". */
  via?: string;
  role: string;
  period: string;
  /** Headline used on the homepage chapter and the case-study page. */
  headline: string;
  /** Search-result title (under 45 characters; the layout appends the site name). */
  seoTitle: string;
  /** Search-result description, 120 to 160 characters, CV-backed. */
  seoDescription: string;
  /** One-line supported outcome. */
  outcome: string;
  /** Concise ownership statement in the first person. */
  ownership: string;
  overview: string;
  responsibility: string[];
  technicalWork: string[];
  outcomes: string[];
  /** Small technology labels. Kept to what the CV states. */
  stack: string[];
  /** Conceptual diagram identifier rendered by the work page. */
  diagram: "routed-delivery" | "fragments-to-platform" | "continuity-handover";
  diagramCaption: string;
  /** Explicit notes about what is and is not claimed. */
  boundaries: string[];
  related?: { href: string; label: string }[];
  source: Source;
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Features exactly as the CV states them. */
  features: string[];
  url?: string;
  urlLabel?: string;
  /** Verified public URL note. */
  urlSource?: Source;
  source: Source;
}
