import type { CaseStudy } from "./types";

/**
 * Selected work. Each case study restates CV-supported facts; the diagrams are
 * conceptual illustrations authored for this site and are labelled as such.
 */

export const caseStudies: CaseStudy[] = [
  {
    slug: "external-api-platform",
    client: "Latest project",
    via: "current role",
    role: "Tech Lead, External APIs",
    period: "Jul 2025 - Present",
    headline: "Designing delivery for ~1M events a day.",
    seoTitle: "External API platform case study",
    seoDescription:
      "How an event-driven webhook delivery platform carries around a million events a day: signed payloads, circuit breakers, retries and a dead-letter queue.",
    outcome: "~1M events/day through the event-driven delivery service",
    ownership:
      "I lead a team of 9 engineers across multiple parallel workstreams, working closely with product, delivery and the technical architect, and I designed and built the event-driven webhook delivery service behind every external client integration.",
    overview:
      "My latest project is an external API platform: the integration surface for reservations, availability and pre-booking, used by 5 major third-party clients with more onboarding. Every external client integration depends on the event-driven webhook delivery service, which carries around one million events a day, and a high-volume data service was re-platformed from AWS Lambda onto EKS along the way.",
    responsibility: [
      "Technical lead for a team of 9 engineers across parallel workstreams, owning architecture and engineering standards for the platform and working closely with product, delivery and the technical architect.",
      "Designed and built the event-driven webhook delivery platform behind every external client integration.",
      "Authored the platform's push-to-pull integration strategy and its four-phase rollout.",
      "Own the shared authentication and authorisation tooling used across the external APIs estate.",
    ],
    technicalWork: [
      "Webhook delivery at ~1M events/day on AWS EventBridge and BullMQ/Redis.",
      "HMAC-signed payloads, per-subscription circuit breakers, rate limiting and exponential-backoff retries.",
      "A Postgres-backed dead-letter queue for deliveries that exhaust their retries.",
      "Re-platformed a high-volume data service from AWS Lambda to a long-running EKS service, removing timeout ceilings and cold starts while adding back-pressure handling, resumability and full observability.",
      "Push-to-pull integration strategy: operation-status endpoints with Retry-After and ETag semantics, rolled out in four phases.",
      "Engineering standards for the platform: outbox publishing, idempotent mutations, correlation-ID tracing and Datadog observability.",
      "Introduced team-wide use of AI coding agents and agentic workflows across design, delivery and code review.",
    ],
    outcomes: [
      "~1M events/day handled by the webhook delivery platform.",
      "Integration cost for clients reduced through the push-to-pull strategy.",
      "Timeout ceilings and cold starts removed from the re-platformed data service.",
      "Throughput raised without lowering standards after introducing agentic workflows.",
    ],
    stack: [
      "AWS EventBridge",
      "BullMQ",
      "Redis",
      "PostgreSQL",
      "EKS",
      "HMAC",
      "Datadog",
    ],
    diagram: "routed-delivery",
    diagramCaption:
      "Conceptual illustration of a resilient delivery pipeline: events fan out through a queue and workers to subscribers, each with its own circuit and retry policy, with exhausted deliveries parked in a dead-letter queue. It is not a diagram of any employer's systems.",
    boundaries: [
      "The interactive lab on this site is an independently authored educational simulation of the same delivery patterns. It uses synthetic data and is not connected to employer systems.",
      "The employer is deliberately not named on this site. No customer data, internal architecture or non-public metrics are published here.",
    ],
    related: [
      { href: "/lab/webhook-delivery", label: "Explore the webhook-delivery lab" },
      { href: "/experience#latest", label: "The role on the experience page" },
    ],
    source: {
      kind: "cv",
      ref: "Professional experience: current role (employer name withheld on the site)",
      note: "Workstreams and the product, delivery and architect collaboration stated by Viveak, Sep 2026.",
    },
  },
  {
    slug: "dyson-platform-migration",
    client: "Dyson",
    via: "via Deloitte Digital",
    role: "Lead Engineer",
    period: "Jun 2018 - May 2020",
    headline: "Changing the platform behind a 300+ engineer organisation.",
    seoTitle: "Dyson Kubernetes migration case study",
    seoDescription:
      "Leading the EC2-to-Kubernetes migration on AWS for a 300+ engineer organisation through Deloitte Digital: auto-scaling, faster deploys, automated environments.",
    outcome: "EC2-to-Kubernetes migration on AWS for a 300+ engineer organisation",
    ownership:
      "As Lead Engineer on the Deloitte Digital programme, I led the EC2-to-Kubernetes migration on AWS and built the automated UAT and performance environments around it.",
    overview:
      "Dyson's engineering organisation of more than 300 engineers ran on EC2. Through Deloitte Digital, I led the migration to Kubernetes on AWS, bringing auto-scaling, faster deploys and measurable cost reduction, and built automated UAT and performance environments to support delivery.",
    responsibility: [
      "Led the EC2-to-Kubernetes migration on AWS for a 300+ engineer organisation.",
      "Built automated UAT and performance environments.",
      "Earlier in the engagement, as Frontend Engineer until Nov 2019, built reusable AEM components rolled out across Dyson's European e-commerce estate.",
    ],
    technicalWork: [
      "Migration of workloads from EC2 to Kubernetes on AWS.",
      "Auto-scaling and faster deploys for the migrated platform.",
      "Automated UAT and performance environments.",
      "Reusable AEM components for the European e-commerce estate.",
    ],
    outcomes: [
      "A 300+ engineer organisation moved onto Kubernetes.",
      "Auto-scaling, faster deploys and measurable cost reduction, as recorded on the CV.",
    ],
    stack: ["AWS", "Kubernetes", "EC2", "AEM"],
    diagram: "fragments-to-platform",
    diagramCaption:
      "Conceptual illustration: individually managed instances resolving into an orchestrated, uniformly scaled platform. It does not depict Dyson's architecture.",
    boundaries: [
      "300+ engineers is the size of the organisation affected by the migration, not a team I managed.",
      "The CV records measurable cost reduction without a percentage, so none is quoted here.",
      "Dyson was a client programme delivered through Deloitte Digital, not direct employment.",
    ],
    related: [
      { href: "/experience#dyson", label: "Dyson on the experience page" },
    ],
    source: {
      kind: "cv",
      ref: "Professional experience: Deloitte Digital, Lead Engineer, Dyson",
    },
  },
  {
    slug: "lego-marketing-migration",
    client: "LEGO",
    via: "via Deloitte Digital",
    role: "Lead Engineer",
    period: "Jun 2021 - Dec 2022",
    headline: "A platform migration. Zero customer-visible disruption.",
    seoTitle: "LEGO marketing platform migration case study",
    seoDescription:
      "Moving LEGO's communication channels from Oracle Crowdtwist to Salesforce Marketing Cloud with a team of four and zero customer-visible disruption.",
    outcome: "Oracle Crowdtwist to Salesforce Marketing Cloud with zero customer-visible disruption",
    ownership:
      "As Lead Engineer on the Deloitte Digital programme, I led a team of four engineers migrating LEGO's communication channels from Oracle Crowdtwist to Salesforce Marketing Cloud, and built the AWS integrations underpinning the new marketing pipeline.",
    overview:
      "LEGO's communication channels moved from Oracle Crowdtwist to Salesforce Marketing Cloud. Through Deloitte Digital, I led the four-engineer team that delivered the migration with zero customer-visible disruption, built the AWS integrations behind the new marketing pipeline and ran the technical stakeholder sessions through cutover.",
    responsibility: [
      "Led a team of four engineers through the migration.",
      "Built the AWS integrations underpinning the scale and reliability of the new marketing pipeline.",
      "Ran technical stakeholder sessions through cutover.",
    ],
    technicalWork: [
      "Migration of communication channels from Oracle Crowdtwist to Salesforce Marketing Cloud.",
      "AWS integrations behind the new marketing pipeline.",
      "Cutover planning and technical stakeholder sessions.",
    ],
    outcomes: ["Zero customer-visible disruption during the migration."],
    stack: ["Salesforce Marketing Cloud", "Oracle Crowdtwist", "AWS"],
    diagram: "continuity-handover",
    diagramCaption:
      "Conceptual illustration of continuity through a migration: traffic keeps flowing at a steady rhythm while responsibility hands over from the outgoing platform to the incoming one. It is not a record of the programme's architecture.",
    boundaries: [
      "The separate LEGO.com self-returns result (~30% fewer customer-service contacts) came from a different engagement, Full-Stack Developer on LEGO.com from Jun 2020 to Jun 2021, and is not an outcome of this migration.",
      "LEGO was a client programme delivered through Deloitte Digital, not direct employment.",
      "No historical dashboards or confidential architecture are reproduced.",
    ],
    related: [
      {
        href: "/experience#lego-self-returns",
        label: "LEGO.com self-returns, a separate engagement",
      },
      { href: "/experience#lego-sfmc", label: "This programme on the experience page" },
    ],
    source: {
      kind: "cv",
      ref: "Professional experience: Deloitte Digital, Lead Engineer, LEGO Salesforce Marketing Cloud Migration",
    },
  },
];

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}

/** The LEGO.com self-returns result, kept distinct from the migration. */
export const legoSelfReturns = {
  id: "lego-self-returns",
  title: "LEGO.com automated self-returns",
  role: "Full-Stack Developer, LEGO.com",
  via: "via Deloitte Digital",
  period: "Jun 2020 - Jun 2021",
  value: "~30%",
  label: "fewer customer-service contacts",
  statement:
    "Designed and shipped the AWS-driven automated self-returns journey on LEGO.com, cutting customer-service contact volume by ~30%.",
  href: "/experience#lego-self-returns",
  source: {
    kind: "cv",
    ref: "Professional experience: Deloitte Digital, Full-Stack Developer, LEGO.com",
  } as const,
};
