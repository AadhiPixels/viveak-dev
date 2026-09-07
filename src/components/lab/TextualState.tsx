"use client";

import { deadLetters, nextScheduledAt, pendingFor, summary, tokensNow } from "@/lib/sim/engine";
import { formatClock, formatMs } from "@/lib/sim/format";
import { PRESETS } from "@/lib/sim/presets";
import { SUBSCRIBER_IDS, type SimState } from "@/lib/sim/types";
import { circuitLabel, healthLabel } from "./bits";

/**
 * A readable account of the whole state. It is the accessible counterpart of
 * the pipeline drawing and doubles as the no-JavaScript fallback, since the
 * server renders the initial state into it.
 */
export function TextualState({ state, paused, speed }: { state: SimState; paused: boolean; speed: number }) {
  const s = summary(state);
  const dead = deadLetters(state);
  const next = nextScheduledAt(state);
  const preset = state.preset ? PRESETS[state.preset] : null;
  const recent = state.log.slice(-6).reverse();

  return (
    <details className="group rounded-2xl border border-line bg-graphite">
      <summary className="cursor-pointer list-none px-4 py-3 md:px-5 [&::-webkit-details-marker]:hidden">
        <span className="font-sans text-[0.95rem] font-medium tracking-[-0.01em] text-lumen">Text summary of the current state</span>
        <span className="mono-label ml-3 text-silver-2">for screen readers and the curious · opens</span>
      </summary>
      <div className="border-t border-line px-4 py-4 text-[0.9rem] leading-relaxed text-silver md:px-5">
        <p>
          Simulated clock at {formatClock(state.now)}, {paused ? "paused" : `running at ${speed} times wall-clock speed`}.
          {preset ? ` Preset: ${preset.title}.` : ""}{" "}
          {next === null ? "Nothing is scheduled." : `The next scheduled moment is at ${formatClock(next)}.`}
        </p>
        <p className="mt-2">
          {s.eventsSent} events sent{s.eventsRejected > 0 ? ` (${s.eventsRejected} rejected at the queue bound)` : ""}, making {s.deliveries}{" "}
          deliveries: {s.delivered} delivered, {s.deadLettered} dead-lettered, {s.queued} queued, {s.processing} in flight and{" "}
          {s.retryScheduled} waiting for a scheduled retry. {s.attempts} attempts in total, {s.failedAttempts} failed and{" "}
          {s.deferredAttempts} deferred by 429 responses. Consumers applied {s.effectsApplied} effects and ignored {s.duplicatesIgnored}{" "}
          duplicates. {s.replays} replays. The circuit breaker has opened {s.circuitOpens} time{s.circuitOpens === 1 ? "" : "s"}.
        </p>
        <ul className="mt-3 space-y-1.5">
          {SUBSCRIBER_IDS.map((id) => {
            const sub = state.subscribers[id];
            const pending = pendingFor(state, id);
            const cooldown =
              sub.circuit.state === "open" && sub.circuit.openedAt !== null
                ? ` Probe in ${formatMs(Math.max(0, sub.circuit.openedAt + state.config.circuitCooldownMs - state.now))}.`
                : "";
            return (
              <li key={id}>
                <span className="text-lumen">{sub.name}</span> ({sub.endpoint}) is {healthLabel(sub.health).toLowerCase()}; circuit{" "}
                {circuitLabel(sub.circuit.state).toLowerCase()} with {sub.circuit.consecutiveFailures} consecutive failures.{cooldown} Rate-limit tokens{" "}
                {tokensNow(state, id)} of {sub.rateLimit.capacity}. Delivered {sub.delivered}, failed attempts {sub.failed}, dead-lettered{" "}
                {sub.deadLettered}, effects applied {sub.effectsApplied}, duplicates ignored {sub.duplicatesIgnored}. Waiting: {pending.queued} queued,{" "}
                {pending.retrying} retry-scheduled, {pending.processing} in flight.
              </li>
            );
          })}
        </ul>
        {dead.length > 0 ? (
          <p className="mt-3">
            Dead letters:{" "}
            {dead
              .slice(-8)
              .map((d) => `${d.id} to ${d.subscriberId} (${d.deadLetterReason})`)
              .join("; ")}
            {dead.length > 8 ? ` and ${dead.length - 8} more` : ""}.
          </p>
        ) : null}
        {recent.length > 0 ? (
          <div className="mt-3">
            <p className="text-lumen">Most recent log lines, newest first:</p>
            <ol className="mt-1 space-y-0.5">
              {recent.map((l) => (
                <li key={l.seq}>
                  {formatClock(l.at)}: {l.message}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </details>
  );
}
