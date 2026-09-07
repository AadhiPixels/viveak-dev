import type { Metadata, ResolvingMetadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Throughput } from "@/components/game/Throughput";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MILESTONES, DEFAULT_CONFIG } from "@/lib/game/engine";

const description =
  "Throughput: a small 3D arcade game built with Three.js. Change lane to collect deliveries, dodge 503 faults and back off when the route tells you to.";

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata({ title: "Throughput, a game", description, path: "/play" }, parent);
}

const MECHANICS: { name: string; game: string; real: string }[] = [
  {
    name: "Acknowledged delivery",
    game: "An emerald token. Collecting a run of them raises the multiplier, up to ×5.",
    real: "A subscriber answering 200 to a signed webhook. Streaks are the happy path of a healthy platform.",
  },
  {
    name: "503 fault",
    game: "A red block. Hitting one costs a retry and resets the streak; three and the run is dead-lettered.",
    real: "A failing subscriber. The real service retries with bounded backoff and parks exhausted deliveries in a dead-letter queue.",
  },
  {
    name: "429 rate limit",
    game: "An amber gate across every lane. It slows the route for a moment; a burst lets you through.",
    real: "Retry-After from a subscriber, honoured exactly, with a per-subscription token bucket doing the local pacing.",
  },
  {
    name: "Circuit breaker",
    game: "A silver ring. Arms a shield that absorbs the next fault.",
    real: "Per-subscription circuits that open after consecutive failures and probe carefully before closing again.",
  },
  {
    name: "Retry",
    game: "A cyan key that restores a lost retry, or pays out if you have all three.",
    real: "Exponential-backoff retries that consume a bounded budget.",
  },
  {
    name: "Burst",
    game: "A white marker: faster for a few seconds and every delivery counts double.",
    real: "Auto-scaling headroom, which is what the Lambda-to-EKS re-platform bought.",
  },
];

export default function PlayPage() {
  return (
    <div data-chapter="play" data-theme="dark" className="bg-ink text-lumen">
      <div className="container-x pt-28 md:pt-36">
        <Eyebrow index="Play">Throughput · built for this site</Eyebrow>
        <h1 className="t-display-l mt-5 max-w-4xl text-lumen">Keep a million events moving.</h1>
        <p className="t-lead mt-6 max-w-[56ch] text-silver">
          A small 3D arcade game written for this site in TypeScript and Three.js. Change lane to collect deliveries,
          dodge faults and back off when the route tells you to. It borrows the vocabulary of the delivery platform
          work described here; the numbers are game numbers.
        </p>
        <div className="mt-10 md:mt-14">
          <Throughput />
        </div>
        <p className="mono-label mt-4 max-w-[70ch] text-silver-3">
          Best scores stay in this browser only. Nothing is sent anywhere. Reduced motion removes the screen
          flashes and camera shake; the game itself still moves.
        </p>
      </div>

      <section className="container-x py-20 md:py-28" aria-labelledby="mechanics-heading">
        <Eyebrow>How the game maps to the real thing</Eyebrow>
        <h2 id="mechanics-heading" className="t-display-m mt-5 text-lumen">
          Same vocabulary, different stakes.
        </h2>
        <dl className="mt-10 grid gap-x-12 gap-y-8 border-t border-line pt-8 md:grid-cols-2">
          {MECHANICS.map((m) => (
            <div key={m.name} className="grid gap-2">
              <dt className="t-display-s text-lumen">{m.name}</dt>
              <dd className="t-body text-silver">
                <span className="mono-label mr-2 text-signal">In the game</span>
                {m.game}
              </dd>
              <dd className="t-body text-silver">
                <span className="mono-label mr-2 text-silver-2">On the platform</span>
                {m.real}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-12 grid gap-8 border-t border-line pt-8 md:grid-cols-3">
          <div>
            <p className="eyebrow">Engine</p>
            <p className="t-body mt-2 text-silver">
              Pure TypeScript, seeded and deterministic: the same seed and inputs always play the same run, so the
              engine is unit-tested like the webhook simulation. Speed climbs from {DEFAULT_CONFIG.baseSpeed} to{" "}
              {DEFAULT_CONFIG.maxSpeed} units per second; patterns are authored shapes chosen by difficulty.
            </p>
          </div>
          <div>
            <p className="eyebrow">Rendering</p>
            <p className="t-body mt-2 text-silver">
              React Three Fiber with instanced meshes and the same procedural ribbon geometry as the homepage
              sculpture, rebuilt around the pulse every frame. No post-processing, pixel ratio capped at 1.5.
            </p>
          </div>
          <div>
            <p className="eyebrow">Milestones</p>
            <p className="t-body mt-2 text-silver">
              {MILESTONES.map((m) => m.value.toLocaleString("en-GB")).join(", ")} deliveries. The real service handles
              around a million a day, which is why the game never claims to finish.
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
          <ArrowLink href="/lab/webhook-delivery">Open the deterministic simulation</ArrowLink>
          <ArrowLink href="/work/external-api-platform">Read the case study</ArrowLink>
        </div>
      </section>
    </div>
  );
}
