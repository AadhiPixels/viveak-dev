import type { PresetName, ScheduledCommand } from "./types";

/**
 * Guided scenarios. Each preset is a list of ordinary engine commands placed
 * on the simulated clock; loading one resets the state and runs the script as
 * the clock advances, so a preset is exactly as deterministic as the engine.
 * Times are simulated milliseconds from the reset.
 */
export interface Preset {
  name: PresetName;
  title: string;
  /** One paragraph of plain English explaining what to watch for. */
  explanation: string;
  script: ScheduledCommand[];
}

export const PRESETS: Record<PresetName, Preset> = {
  healthy: {
    name: "healthy",
    title: "Healthy",
    explanation:
      "Three healthy subscribers acknowledge every delivery the first time. A burst shows the local rate limiter at work: each subscriber has a bucket of three tokens that refills one per second, so after the first three deliveries the pipeline paces itself to one attempt per subscriber per second rather than flooding an endpoint. Nothing retries, nothing dead-letters, and every event applies exactly one business effect per subscriber.",
    script: [
      { at: 0, command: { type: "send" } },
      { at: 1200, command: { type: "send" } },
      { at: 2600, command: { type: "burst", count: 6 } },
      { at: 9000, command: { type: "send" } },
    ],
  },
  failure: {
    name: "failure",
    title: "Failure",
    explanation:
      "Subscriber A answers 503 to every request. Each failed attempt is retried with exponential backoff, and after three consecutive failures A's circuit opens: its remaining deliveries are parked rather than hammered, while B and C keep flowing through the same workers. Every six seconds a single half-open probe tests A again, fails, and re-opens the circuit. A delivery that spends its five attempts lands in the dead-letter queue with a reason attached, ready to be replayed once A is repaired.",
    script: [
      { at: 0, command: { type: "setHealth", subscriber: "A", health: "failing" } },
      { at: 200, command: { type: "burst", count: 6 } },
      { at: 9000, command: { type: "send" } },
    ],
  },
  recovery: {
    name: "recovery",
    title: "Recovery",
    explanation:
      "The same failure, then A is repaired nine seconds in. Restoring the endpoint does not close the circuit by itself: the circuit stays open until its cooldown elapses, then allows exactly one probe. The first probe still fails because A had not yet recovered; the second succeeds and closes the circuit, and the parked deliveries drain immediately, paced only by the local rate limiter. Nothing is lost and nothing is dead-lettered.",
    script: [
      { at: 0, command: { type: "setHealth", subscriber: "A", health: "failing" } },
      { at: 200, command: { type: "burst", count: 5 } },
      { at: 9000, command: { type: "restore", subscriber: "A" } },
    ],
  },
  "rate-limit": {
    name: "rate-limit",
    title: "Rate limit",
    explanation:
      "Subscriber A answers 429 Too Many Requests with Retry-After: 4 s. The pipeline honours the header exactly: each deferred delivery is retried four seconds later, with no backoff and no failure counted against it or against the circuit. A separate, smaller deferral budget of six stops a permanently rate-limiting subscriber from looping forever. A is restored at ten seconds and the deferred deliveries complete on their next scheduled attempt.",
    script: [
      { at: 0, command: { type: "setHealth", subscriber: "A", health: "rate-limited", retryAfterMs: 4000 } },
      { at: 200, command: { type: "burst", count: 4 } },
      { at: 10000, command: { type: "restore", subscriber: "A" } },
    ],
  },
  "lost-response": {
    name: "lost-response",
    title: "Lost response",
    explanation:
      "Subscriber A processes each request and applies the business effect, but its response is lost, so the pipeline sees a timeout and retries. Delivery is at-least-once: the retry reaches a consumer that has already applied that idempotency key, so it answers 200 without applying the effect again. The counters make the difference visible: effects applied stays at one per event while duplicates ignored climbs. A's responses come back before each retry is due.",
    script: [
      { at: 0, command: { type: "setHealth", subscriber: "A", health: "timeout" } },
      { at: 200, command: { type: "send" } },
      { at: 900, command: { type: "restore", subscriber: "A" } },
      { at: 3000, command: { type: "setHealth", subscriber: "A", health: "timeout" } },
      { at: 3200, command: { type: "send" } },
      { at: 3900, command: { type: "restore", subscriber: "A" } },
    ],
  },
};

export const PRESET_ORDER: readonly PresetName[] = [
  "healthy",
  "failure",
  "recovery",
  "rate-limit",
  "lost-response",
] as const;

export function isPresetName(value: string): value is PresetName {
  return Object.prototype.hasOwnProperty.call(PRESETS, value);
}
