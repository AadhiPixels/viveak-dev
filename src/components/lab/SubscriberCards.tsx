"use client";

import { pendingFor, tokensNow } from "@/lib/sim/engine";
import { formatMs } from "@/lib/sim/format";
import { SUBSCRIBER_IDS, type SimState, type Subscriber } from "@/lib/sim/types";
import { Badge, Stat, circuitLabel, circuitTone, healthLabel, healthTone } from "./bits";

function circuitDetail(sub: Subscriber, state: SimState): string {
  const c = sub.circuit;
  if (c.state === "open" && c.openedAt !== null) {
    const left = Math.max(0, c.openedAt + state.config.circuitCooldownMs - state.now);
    return `Deliveries parked. Probe in ${formatMs(left)}.`;
  }
  if (c.state === "half-open") {
    return c.probeInFlight ? "One probe in flight; everything else waits." : "Waiting to send one probe.";
  }
  if (c.consecutiveFailures > 0) {
    return `${c.consecutiveFailures} of ${state.config.circuitThreshold} consecutive failures.`;
  }
  return "Attempts flow normally.";
}

function healthDetail(sub: Subscriber): string {
  switch (sub.health) {
    case "healthy":
      return "Acknowledges with 200 and applies each key once.";
    case "failing":
      return "Answers 503 to every request.";
    case "rate-limited":
      return `Answers 429 with Retry-After ${formatMs(sub.retryAfterMs)}.`;
    case "timeout":
      return "Applies the effect, then the response is lost.";
  }
}

function SubscriberCard({ sub, state }: { sub: Subscriber; state: SimState }) {
  const pending = pendingFor(state, sub.id);
  const tokens = tokensNow(state, sub.id);
  const tone = healthTone(sub.health);
  return (
    <article
      aria-labelledby={`sub-${sub.id}-name`}
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-graphite px-4 py-4 md:px-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 id={`sub-${sub.id}-name`} className="font-sans text-[0.95rem] font-medium tracking-[-0.01em] text-lumen">
            {sub.name}
          </h3>
          <p className="mono-label mt-1 truncate text-silver-3">{sub.endpoint}</p>
        </div>
        <Badge tone={tone} dot>
          {healthLabel(sub.health)}
        </Badge>
      </header>

      <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div>
          <p className="eyebrow">Circuit</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge tone={circuitTone(sub.circuit.state)} dot>
              {circuitLabel(sub.circuit.state)}
            </Badge>
          </div>
          <p className="mt-1.5 text-[0.8rem] leading-snug text-silver-2">{circuitDetail(sub, state)}</p>
        </div>
        <div>
          <p className="eyebrow">Rate limit</p>
          <div className="mt-2 flex items-center gap-1.5" aria-label={`${tokens} of ${sub.rateLimit.capacity} tokens`}>
            {Array.from({ length: sub.rateLimit.capacity }, (_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`h-2 w-5 rounded-full ${i < tokens ? "bg-signal" : "bg-graphite-3"}`}
              />
            ))}
            <span className="mono-label ml-1 text-silver-2">
              {tokens}/{sub.rateLimit.capacity}
            </span>
          </div>
          <p className="mt-1.5 text-[0.8rem] leading-snug text-silver-2">
            Refills {sub.rateLimit.refillPerSecond} per second. {healthDetail(sub)}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-4 border-t border-line pt-4 xs:grid-cols-3">
        <Stat label="Delivered" value={sub.delivered} tone={sub.delivered > 0 ? "signal" : "neutral"} />
        <Stat label="Failed" value={sub.failed} tone={sub.failed > 0 ? "danger" : "neutral"} hint="Failed attempts: 503 or timeout" />
        <Stat label="Dead letters" value={sub.deadLettered} tone={sub.deadLettered > 0 ? "danger" : "neutral"} />
        <Stat label="Effects" value={sub.effectsApplied} hint="Business effects applied by the consumer" />
        <Stat label="Duplicates" value={sub.duplicatesIgnored} tone={sub.duplicatesIgnored > 0 ? "amber" : "neutral"} hint="Duplicate deliveries acknowledged but not applied" />
        <Stat label="Waiting" value={pending.queued + pending.retrying + pending.processing} hint="Queued, retry-scheduled or in flight" />
      </dl>
    </article>
  );
}

export function SubscriberCards({ state }: { state: SimState }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {SUBSCRIBER_IDS.map((id) => (
        <SubscriberCard key={id} sub={state.subscribers[id]} state={state} />
      ))}
    </div>
  );
}
