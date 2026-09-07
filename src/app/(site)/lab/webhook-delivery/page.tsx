import type { Metadata, ResolvingMetadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { HmacDemo } from "@/components/lab/HmacDemo";
import { WebhookLab } from "@/components/lab/WebhookLab";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getCaseStudy } from "@/content/work";
import { DEFAULT_CONFIG, LAB_DISCLAIMER, LAB_HREF, describeConfig } from "@/lib/sim/config";
import { PRESETS, PRESET_ORDER } from "@/lib/sim/presets";

const description =
  "An interactive, deterministic simulation of a resilient webhook pipeline: signed payloads, circuit breakers, rate limits, backoff retries and a dead-letter queue.";

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata({ title: "Webhook delivery lab", description, path: LAB_HREF }, parent);
}

const CASE_STUDY_HREF = "/work/external-api-platform";

const HOW_IT_WORKS: { title: string; body: string }[] = [
  {
    title: "Fan-out through a queue",
    body: "Sending an event creates one delivery per subscriber. Two workers take deliveries from a queue ordered by age and make one simulated request each, 300 ms long. A delivery that is not eligible right now is skipped rather than failed, so a struggling subscriber never starves the healthy ones.",
  },
  {
    title: "Retries with bounded backoff",
    body: "A 503 or a lost response counts as a failure. The delivery is retried after 500 ms, then 1 s, 2 s, 4 s, capped at 8 s. Four failures may be absorbed; the fifth moves the delivery to the dead-letter queue with the reason attached.",
  },
  {
    title: "A circuit per subscriber",
    body: "Three consecutive failures open a subscriber's circuit. Its deliveries are parked, not failed, for 6 s. Then exactly one probe is allowed: a response closes the circuit, a failure re-opens it. Repairing the subscriber never closes the circuit by itself.",
  },
  {
    title: "Two kinds of throttling",
    body: "Each subscriber has a local token bucket of three tokens refilling one per second; waiting on it costs nothing. A subscriber may also answer 429 with Retry-After. That retry is scheduled at exactly the requested time, counts no failure, and draws on a separate deferral budget of six.",
  },
  {
    title: "At-least-once, made safe",
    body: "When a response is lost the effect may already have been applied. The sender retries anyway. Each consumer remembers the idempotency keys it has applied and acknowledges a repeat with 200 while applying nothing new, so the counters show effects applied and duplicates ignored side by side.",
  },
  {
    title: "Replay from the dead-letter queue",
    body: "Replaying a dead letter creates a fresh delivery that records which one it replays. The original and its attempt history are never changed, which keeps the audit trail honest.",
  },
];

export default function WebhookDeliveryLabPage() {
  const caseStudy = getCaseStudy("external-api-platform");
  const parameters = describeConfig(DEFAULT_CONFIG);

  return (
    <article>
      <section data-chapter="lab-intro" data-theme="dark" className="bg-ink text-lumen" aria-labelledby="lab-heading">
        <div className="container-x pt-28 pb-14 md:pt-36 md:pb-16">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Lab" }, { label: "Webhook delivery" }]} />
          <Eyebrow className="mt-10">Lab · Webhook delivery</Eyebrow>
          <h1 id="lab-heading" className="t-display-l mt-6 max-w-[14ch]">
            Break the system. See how it recovers.
          </h1>
          <p className="t-lead mt-8 max-w-[58ch] text-silver">
            A deterministic model of a resilient webhook pipeline. Send events, fail a subscriber, throttle it, lose its
            responses, and watch retries, a circuit breaker, a rate limiter and a dead-letter queue keep the rest of the
            system moving. Time is accelerated and labelled.
          </p>
          <p className="mono-label mt-8 flex max-w-[64ch] items-start gap-3 text-amber">
            <span aria-hidden="true" className="mt-[0.35em] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
            <span>{LAB_DISCLAIMER}</span>
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
            <ArrowLink href={CASE_STUDY_HREF}>Read about the real platform</ArrowLink>
            <Link href="#how-it-works" className="link-arrow text-silver hover:text-lumen">
              <span>How it works</span>
            </Link>
            <Link href="#signed-payloads" className="link-arrow text-silver hover:text-lumen">
              <span>Signed payloads</span>
            </Link>
          </div>
        </div>
      </section>

      <section data-chapter="lab-simulation" data-theme="dark" className="bg-ink text-lumen" aria-labelledby="lab-sim-heading">
        <div className="container-x pb-24 md:pb-32">
          <h2 id="lab-sim-heading" className="sr-only">
            The simulation
          </h2>
          <WebhookLab />
        </div>
      </section>

      <section
        id="how-it-works"
        data-chapter="lab-how"
        data-theme="dark"
        className="border-t border-line bg-ink text-lumen"
        aria-labelledby="how-heading"
      >
        <div className="container-x py-24 md:py-32">
          <Eyebrow>How it works</Eyebrow>
          <h2 id="how-heading" className="t-display-m mt-6 max-w-[20ch]">
            Six patterns, one deterministic engine.
          </h2>
          <p className="t-lead mt-6 max-w-[60ch] text-silver">
            The engine is a pure TypeScript state machine: no randomness, no timers, no network. Every transition is a
            function of the previous state and the simulated clock, which is why the same commands always produce the
            same story and why the unit tests can drive it moment by moment.
          </p>

          <div className="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.title} className="border-t border-line pt-5">
                <p className="eyebrow">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="t-display-s mt-3">{item.title}</h3>
                <p className="t-body mt-3 max-w-[44ch] text-silver-2">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-20 grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="min-w-0">
              <Eyebrow>Illustrative parameters</Eyebrow>
              <p className="t-body mt-4 max-w-[60ch] text-silver-2">
                Chosen for a readable demo, not taken from any production system. The table is generated from the same
                configuration object the engine runs on.
              </p>
              <div
                className="mt-6 overflow-x-auto rounded-2xl border border-line bg-graphite focus-visible:outline-2 focus-visible:outline-signal"
                tabIndex={0}
                role="region"
                aria-label="Simulation parameters table, scrolls sideways on narrow screens"
              >
                <table className="w-full min-w-[30rem] border-collapse text-[0.9rem]">
                  <thead>
                    <tr className="text-left">
                      <th scope="col" className="eyebrow px-4 py-3 font-medium md:px-5">
                        Parameter
                      </th>
                      <th scope="col" className="eyebrow px-4 py-3 font-medium">
                        Value
                      </th>
                      <th scope="col" className="eyebrow px-4 py-3 font-medium md:px-5">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parameters.map((row) => (
                      <tr key={row.parameter} className="border-t border-line align-top">
                        <th scope="row" className="px-4 py-2.5 text-left font-medium text-lumen md:px-5">
                          {row.parameter}
                        </th>
                        <td className="px-4 py-2.5 font-mono text-[0.8rem] text-silver">{row.value}</td>
                        <td className="px-4 py-2.5 text-silver-2 md:px-5">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="min-w-0">
              <Eyebrow>Guided scenarios</Eyebrow>
              <ul className="mt-4 divide-y divide-line">
                {PRESET_ORDER.map((name) => (
                  <li key={name} className="py-4 first:pt-0">
                    <p className="font-medium text-lumen">{PRESETS[name].title}</p>
                    <p className="mt-1.5 text-[0.9rem] leading-relaxed text-silver-2">{PRESETS[name].explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-20 grid gap-x-16 gap-y-10 border-t border-line pt-10 lg:grid-cols-2">
            <div>
              <Eyebrow>Where the code lives</Eyebrow>
              <p className="t-body mt-4 max-w-[56ch] text-silver-2">
                The implementation is part of this site: the engine, its types and the scenario scripts live in{" "}
                <code className="font-mono text-[0.85em] text-silver">src/lib/sim</code>, the signing helpers in{" "}
                <code className="font-mono text-[0.85em] text-silver">src/lib/crypto/hmac.ts</code>, and the unit tests
                that drive the engine with a controlled clock in{" "}
                <code className="font-mono text-[0.85em] text-silver">tests/unit/sim</code>. The React panels above
                only render state; they never decide anything.
              </p>
            </div>
            <div>
              <Eyebrow>The real platform</Eyebrow>
              <p className="t-body mt-4 max-w-[56ch] text-silver-2">
                {caseStudy
                  ? `${caseStudy.client}: ${caseStudy.outcome}. The case study explains the patterns this lab illustrates, and what it deliberately leaves out.`
                  : "The case study explains the patterns this lab illustrates, and what it deliberately leaves out."}{" "}
                {LAB_DISCLAIMER}
              </p>
              <ArrowLink href={CASE_STUDY_HREF} className="mt-5">
                Read about the real platform
              </ArrowLink>
            </div>
          </div>
        </div>
      </section>

      <section
        id="signed-payloads"
        data-chapter="lab-hmac"
        data-theme="dark"
        className="border-t border-line bg-ink text-lumen"
        aria-labelledby="hmac-heading"
      >
        <div className="container-x py-24 md:py-32">
          <Eyebrow>Signed payloads</Eyebrow>
          <h2 id="hmac-heading" className="t-display-m mt-6 max-w-[20ch]">
            Change one character. Watch verification fail.
          </h2>
          <p className="t-lead mt-6 max-w-[60ch] text-silver">
            Each webhook carries an HMAC-SHA256 signature over the timestamp and the body. The receiver recomputes it
            with the shared key, compares in constant time and rejects stale timestamps. The key below is public and
            protects nothing; it exists so the arithmetic can be shown.
          </p>
          <div className="mt-12">
            <HmacDemo />
          </div>
        </div>
      </section>
    </article>
  );
}
