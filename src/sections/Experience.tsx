import { Section } from "../components/Section";

export function Experience() {
  return (
    <Section id="experience" no="01" title="The day job">
      <p className="section-lede">
        Eight years of shipping the unglamorous, load-bearing parts of the internet —
        the platforms <strong>other people's products depend on</strong>.
      </p>

      <div className="xp-list">
        <article className="xp-item card">
          <div className="xp-when">
            Jul 2025 — now
            <br />
            <span className="xp-badge">CURRENT</span>
          </div>
          <div>
            <h3>
              Tech Lead, External APIs · <span className="org">Collinson</span>
            </h3>
            <p>
              Technical lead for the external API platform behind lounge reservations, availability
              and prebooking — the surface 5 major third-party clients integrate against.
            </p>
            <ul>
              <li>
                Designed and built the <strong>webhook delivery platform</strong> — ~1M events/day on
                EventBridge + BullMQ/Redis with HMAC-signed payloads, per-subscription circuit
                breakers, rate limiting, exponential backoff and a Postgres-backed DLQ.
              </li>
              <li>
                Re-platformed a high-volume data service <strong>from Lambdas to EKS</strong> — no
                more timeout ceilings or cold starts; added observability and back-pressure.
              </li>
              <li>
                Authored the <strong>push-to-pull integration strategy</strong> (operation-status
                endpoints, Retry-After / ETag) and its four-phase rollout.
              </li>
              <li>
                Own shared auth tooling; set platform standards — outbox publishing, idempotent
                mutations, correlation-ID tracing.
              </li>
              <li>
                Led team-wide adoption of <strong>AI coding agents and agentic workflows</strong> —
                more throughput, same bar.
              </li>
            </ul>
          </div>
        </article>

        <article className="xp-item card">
          <div className="xp-when">2018 — 2025</div>
          <div>
            <h3>
              Manager, Technology Consulting · <span className="org">Deloitte Digital</span>
            </h3>
            <p>Promoted through Engineer → Senior → Lead → Manager. The highlight reel:</p>
            <ul>
              <li>
                <strong>LEGO, Customer Data Platform</strong> — led the Databricks CDP integration for
                LEGO.com; architected the AWS pipeline into Salesforce CRM and pulled a delayed
                initiative back on schedule.
              </li>
              <li>
                <strong>UK Government</strong> — turned around an underperforming delivery team and
                shipped the client's first asynchronous service journey.
              </li>
              <li>
                <strong>LEGO, SFMC migration</strong> — led four engineers moving LEGO's communication
                channels to Salesforce Marketing Cloud with zero customer-visible disruption.
              </li>
              <li>
                <strong>LEGO.com self-returns</strong> — built the automated returns journey that cut
                customer-service contact ~30%.
              </li>
              <li>
                <strong>Dyson</strong> — led the EC2 → Kubernetes migration for a 300+ engineer
                organisation; earlier, built AEM components for the European e-commerce estate.
              </li>
            </ul>
          </div>
        </article>

        <article className="xp-item card">
          <div className="xp-when">2015 — 2018</div>
          <div>
            <h3>The tutorial levels</h3>
            <ul>
              <li><strong>Gentrack</strong> — backend invoicing in Java.</li>
              <li><strong>Accenture</strong> — took HMRC's automated test coverage from ~25% to 75%+.</li>
              <li><strong>Tullett Prebon</strong> — intern-built a market-data platform traders used during the EU referendum.</li>
              <li><strong>BSc Computer Science</strong>, City, University of London · <strong>AWS Certified Solutions Architect</strong>.</li>
            </ul>
          </div>
        </article>
      </div>
    </Section>
  );
}
