import type { EarlierRole, Role } from "./types";

/**
 * Professional experience, transcribed from the CV.
 * Wording follows the CV closely so that qualifiers and attribution survive.
 */

export const profileSummary =
  "Hands-on technical leader with 9+ years building distributed backend platforms and external APIs. Tech Lead for External APIs on my latest project, leading 9 engineers across parallel workstreams and owning architecture and engineering standards for a platform handling ~1M events/day. Experienced in complex migrations, including serverless-to-Kubernetes re-platforms and zero-disruption cutovers, and in shipping independent products from idea to production.";

/**
 * The current employer is deliberately not named on this site (Viveak's
 * request, Sep 2026). The role is described as the latest project; every
 * figure still traces to the CV.
 */
export const latestProjectLabel = "Latest project";

export const roles: Role[] = [
  {
    id: "latest",
    employer: "Latest project",
    title: "Tech Lead, External APIs",
    period: "Jul 2025 - Present",
    location: "London",
    summary:
      "Technical lead for a team of 9 engineers across multiple parallel workstreams, working closely with product, delivery and the technical architect, building the external API platform behind reservations, availability and pre-booking: the integration surface for 5 major third-party clients, with more onboarding.",
    bullets: [
      "Designed and built the event-driven webhook delivery platform behind every external client integration: ~1M events/day on AWS EventBridge and BullMQ/Redis, with HMAC-signed payloads, per-subscription circuit breakers, rate limiting, exponential-backoff retries and a Postgres-backed dead-letter queue.",
      "Re-platformed a high-volume data service from AWS Lambda to a long-running EKS service, removing timeout ceilings and cold starts while adding back-pressure handling, resumability and full observability.",
      "Authored the platform's push-to-pull integration strategy (operation-status endpoints with Retry-After and ETag semantics) and its four-phase rollout, cutting integration cost for clients.",
      "Own the shared authentication and authorisation tooling used across the external APIs estate.",
      "Set the platform's engineering standards: outbox publishing, idempotent mutations, correlation-ID tracing and Datadog observability.",
      "Introduced team-wide use of AI coding agents and agentic workflows across design, delivery and code review, raising throughput without lowering standards.",
    ],
    source: {
      kind: "cv",
      ref: "Professional experience: current role (employer name withheld on the site and in the PDF)",
      note: "Workstreams and the product, delivery and architect collaboration were stated by Viveak in Sep 2026.",
    },
  },
  {
    id: "deloitte",
    employer: "Deloitte Digital",
    title: "Manager, Technology Consulting",
    period: "Jun 2018 - Jul 2025",
    location: "London",
    summary:
      "Promoted through Engineer, Senior Engineer, Lead Engineer and Manager, leading engineering on client programmes for LEGO, Dyson and UK Government.",
    bullets: [],
    engagements: [
      {
        id: "lego-cdp",
        title: "Technical Lead",
        client: "LEGO Customer Data Platform",
        period: "Jul 2024 - Jul 2025",
        attribution: "Client programme delivered through Deloitte Digital",
        bullets: [
          "Led the integration of Databricks as the Customer Data Platform for LEGO.com, centralising user data to power key metrics, persona modelling and market segmentation.",
          "Architected the AWS pipeline consolidating source streams into Salesforce CRM; recovered a delayed initiative and brought delivery back on schedule.",
        ],
      },
      {
        id: "uk-government",
        title: "Technical Lead Engineer",
        client: "UK Government",
        period: "Feb 2023 - Jul 2024",
        attribution: "Client programme delivered through Deloitte Digital",
        bullets: [
          "Introduced the client's first asynchronous service journey and provided the architecture guidance that secured follow-on engagement scope.",
          "Turned around an underperforming delivery team while directing MVP scope and roadmap: reset the cadence, closed deadline gaps and raised throughput.",
        ],
      },
      {
        id: "lego-sfmc",
        title: "Lead Engineer",
        client: "LEGO Salesforce Marketing Cloud Migration",
        period: "Jun 2021 - Dec 2022",
        attribution: "Client programme delivered through Deloitte Digital",
        bullets: [
          "Migrated LEGO's communication channels from Oracle Crowdtwist to Salesforce Marketing Cloud with a team of four engineers and zero customer-visible disruption.",
          "Built the AWS integrations underpinning the scale and reliability of the new marketing pipeline, and ran technical stakeholder sessions through cutover.",
        ],
        caseStudy: "lego-marketing-migration",
      },
      {
        id: "lego-self-returns",
        title: "Full-Stack Developer",
        client: "LEGO.com",
        period: "Jun 2020 - Jun 2021",
        attribution: "Client programme delivered through Deloitte Digital",
        bullets: [
          "Designed and shipped the AWS-driven automated self-returns journey on LEGO.com, cutting customer-service contact volume by ~30%.",
        ],
      },
      {
        id: "dyson",
        title: "Lead Engineer",
        client: "Dyson",
        period: "Jun 2018 - May 2020",
        attribution:
          "Client programme delivered through Deloitte Digital. Frontend Engineer until Nov 2019.",
        bullets: [
          "Led the EC2-to-Kubernetes migration on AWS for a 300+ engineer organisation (auto-scaling, faster deploys, measurable cost reduction) and built automated UAT and performance environments.",
          "Earlier, built reusable AEM components rolled out across Dyson's European e-commerce estate.",
        ],
        caseStudy: "dyson-platform-migration",
      },
    ],
    source: { kind: "cv", ref: "Professional experience: Deloitte Digital" },
  },
];

export const earlierRoles: EarlierRole[] = [
  {
    id: "gentrack",
    employer: "Gentrack",
    title: "Software Engineer",
    period: "2018",
    description: "Backend invoicing solutions in Java.",
  },
  {
    id: "accenture-developer",
    employer: "Accenture",
    title: "Application Developer",
    period: "2017 - 2018",
    description: "Raised HMRC automated test coverage from ~25% to 75%+.",
  },
  {
    id: "tullett-prebon",
    employer: "Tullett Prebon",
    title: "Software Engineer Intern",
    period: "2016",
    description: "Market-data trading platform used during the EU referendum.",
  },
  {
    id: "accenture-placement",
    employer: "Accenture",
    title: "Industrial Placement",
    period: "2015 - 2016",
    description: "Overhauled automated test strategy and coverage.",
  },
];

export const education = {
  degree: "BSc (Hons) Computer Science",
  institution: "City, University of London",
  year: "2017",
  certification: "AWS Certified Solutions Architect",
  source: { kind: "cv", ref: "Education & certification" } as const,
};

export const skills: { group: string; items: string[] }[] = [
  {
    group: "Languages & Backend",
    items: ["TypeScript", "Node.js", "NestJS", "Java", "Python", "REST", "OpenAPI"],
  },
  {
    group: "Distributed Systems",
    items: [
      "Event-driven architecture",
      "Kafka",
      "EventBridge",
      "Webhooks",
      "Outbox pattern",
      "Idempotency",
      "Circuit breakers",
      "Rate limiting",
      "Dead-letter queues",
    ],
  },
  {
    group: "Cloud & Platform",
    items: [
      "AWS (EKS, ECS, Lambda, SQS, S3, CloudWatch)",
      "Kubernetes",
      "Docker",
      "Terraform",
      "CI/CD",
    ],
  },
  { group: "Data & Messaging", items: ["PostgreSQL", "Redis", "BullMQ", "Databricks"] },
  {
    group: "Security & API Design",
    items: [
      "OAuth 2.0",
      "OIDC",
      "API authentication & authorisation",
      "HMAC signing",
      "ETag / Retry-After",
    ],
  },
  { group: "Observability", items: ["Datadog", "CloudWatch", "Correlation-ID tracing"] },
  {
    group: "Leadership & Practice",
    items: [
      "Architecture ownership",
      "Technical strategy",
      "Engineering standards",
      "Stakeholder management",
      "Mentoring",
    ],
  },
];

/** Selected milestones shown on the homepage journey scene. */
export const milestones = [
  {
    period: "2025 - Present",
    title: "Latest project",
    detail:
      "Tech Lead, External APIs. Leading 9 engineers across parallel workstreams on a platform handling ~1M events a day.",
    href: "/experience#latest",
  },
  {
    period: "2018 - 2025",
    title: "Deloitte Digital",
    detail:
      "Engineer to Manager, Technology Consulting. Client programmes for LEGO, Dyson and UK Government.",
    href: "/experience#deloitte",
  },
  {
    period: "2015 - 2018",
    title: "Gentrack, Accenture, Tullett Prebon",
    detail: "Software engineering roles, an internship and an industrial placement.",
    href: "/experience#earlier",
  },
  {
    period: "2017",
    title: "City, University of London",
    detail: "BSc (Hons) Computer Science. AWS Certified Solutions Architect.",
    href: "/experience#education",
  },
] as const;
