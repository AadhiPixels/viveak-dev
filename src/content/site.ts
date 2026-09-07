/**
 * Site identity, navigation and contact details.
 * Source: CV header (name, title line, location, email, LinkedIn, website).
 * The telephone number on the CV is deliberately not republished here.
 */

export const site = {
  name: "Viveak Vadivelkarasan",
  shortName: "Viveak",
  /** Title line exactly as the CV frames it. */
  role: "Tech Lead",
  specialisms: ["Distributed Systems", "External APIs"],
  roleLine: "Tech Lead · Distributed Systems · External APIs",
  cvTitleLine:
    "Tech Lead | Distributed Systems · External API Platforms · AWS & Kubernetes",
  tagline: "Engineering. In motion.",
  concept: "Systems in Motion",
  intro:
    "I build reliable platforms, lead engineering teams, and take products from idea to production.",
  location: "London, UK",
  email: "viveak.03@gmail.com",
  linkedin: "https://linkedin.com/in/viveakv",
  linkedinLabel: "linkedin.com/in/viveakv",
  url: "https://viveakv.dev",
  /** Stable download route. Redirects to the PDF in /public. */
  cvHref: "/cv",
  cvFile: "/Viveak-Vadivelkarasan-CV.pdf",
  cvFileName: "Viveak-Vadivelkarasan-CV.pdf",
  description:
    "Viveak Vadivelkarasan, Tech Lead in London: distributed systems and external API platforms. Selected work, products, experience and a webhook-delivery lab.",
} as const;

export const nav = [
  { href: "/work", label: "Work" },
  { href: "/products", label: "Products" },
  { href: "/experience", label: "Experience" },
  { href: "/contact", label: "Contact" },
] as const;

export const secondaryNav = [
  { href: "/lab/webhook-delivery", label: "Lab" },
  { href: "/play", label: "Play" },
] as const;

export type NavItem = (typeof nav)[number];
