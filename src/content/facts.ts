import type { Fact } from "./types";

/**
 * Headline facts used in the homepage evidence chapters.
 * Each one links to the page that evidences it. Values are printed as the CV
 * prints them; nothing is counted up from zero or presented as live telemetry.
 */

export const facts: Record<string, Fact> = {
  eventsPerDay: {
    id: "events-per-day",
    value: "~1M",
    label: "events per day",
    context:
      "through the event-driven delivery service I designed and built on my latest project.",
    href: "/work/external-api-platform",
    hrefLabel: "Read the case study",
    source: {
      kind: "cv",
      ref: "Selected impact; Professional experience: current role",
      note: "Approximate figure, keep the tilde.",
    },
  },
  engineersLed: {
    id: "engineers-led",
    value: "9",
    label: "engineers",
    context:
      "Technical lead across multiple parallel workstreams on my latest project, working closely with product, delivery and the technical architect, and owning architecture and engineering standards.",
    href: "/experience#latest",
    hrefLabel: "See the role",
    source: {
      kind: "cv",
      ref: "Executive profile; Professional experience: current role",
      note: "Workstreams and collaboration detail stated by Viveak, Sep 2026.",
    },
  },
  engineersImpacted: {
    id: "engineers-impacted",
    value: "300+",
    label: "engineers",
    context:
      "the size of the organisation moved from EC2 to Kubernetes in a migration I led at Dyson, through Deloitte Digital.",
    href: "/work/dyson-platform-migration",
    hrefLabel: "Read the Dyson case study",
    source: {
      kind: "cv",
      ref: "Selected impact; Professional experience: Deloitte Digital, Dyson",
      note: "Organisation size, never a team he managed.",
    },
  },
  selfReturns: {
    id: "self-returns",
    value: "~30%",
    label: "fewer customer-service contacts",
    context:
      "after I designed and shipped the automated self-returns journey on LEGO.com, through Deloitte Digital. A separate engagement from the marketing-platform migration.",
    href: "/experience#lego-self-returns",
    hrefLabel: "See the engagement",
    source: {
      kind: "cv",
      ref: "Selected impact; Professional experience: Deloitte Digital, LEGO.com",
    },
  },
  zeroDisruption: {
    id: "zero-disruption",
    value: "0",
    label: "customer-visible disruptions",
    context:
      "during LEGO's Oracle Crowdtwist to Salesforce Marketing Cloud migration, which I led with a team of four engineers through Deloitte Digital.",
    href: "/work/lego-marketing-migration",
    hrefLabel: "Read the LEGO case study",
    source: {
      kind: "cv",
      ref: "Selected impact; Professional experience: Deloitte Digital, LEGO SFMC Migration",
    },
  },
};
