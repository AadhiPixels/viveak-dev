import { Section } from "../components/Section";

const GROUPS: { title: string; hot?: boolean; items: string[] }[] = [
  {
    title: "Reaches for daily",
    hot: true,
    items: ["TypeScript", "NestJS", "Node.js", "AWS", "Kubernetes", "PostgreSQL", "Redis", "Claude Code"],
  },
  {
    title: "Platform & infra",
    items: ["EKS", "EventBridge", "SQS", "Lambda", "Docker", "Terraform", "CI/CD", "Datadog", "GCP", "Firebase", "Vercel"],
  },
  {
    title: "Data & messaging",
    items: ["Apache Kafka", "BullMQ", "Databricks"],
  },
  {
    title: "Architecture patterns",
    items: ["Event-driven", "Outbox", "Idempotency", "Circuit breakers", "DLQ + replay", "Rate limiting", "Caching semantics", "OAuth2/OIDC", "OpenAPI"],
  },
  {
    title: "Product mode",
    items: ["Flutter", "React", "Stripe", "PWAs", "Playwright", "Figma-adjacent"],
  },
  {
    title: "The human parts",
    items: ["Team leadership", "Mentoring", "Engineering standards", "Stakeholder wrangling", "AI-accelerated practice"],
  },
];

export function Skills() {
  return (
    <Section id="skills" no="04" title="Loadout">
      <p className="section-lede">
        Hover around. The dark chips are the daily drivers.
      </p>
      {GROUPS.map((g) => (
        <div className="loadout-group" key={g.title}>
          <h3>{g.title}</h3>
          <div className="loadout">
            {g.items.map((s) => (
              <span key={s} className={"chip" + (g.hot ? " hot" : "")}>{s}</span>
            ))}
          </div>
        </div>
      ))}
    </Section>
  );
}
