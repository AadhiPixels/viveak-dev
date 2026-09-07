/**
 * Webhook-delivery simulation engine.
 *
 * Interactive educational simulation. Synthetic data. Not connected to
 * employer systems. The parameters are illustrative (see `config.ts`).
 *
 * The engine is pure and deterministic: no randomness, no timers, no clock
 * reads, no DOM, no crypto. Every function returns a new state and never
 * mutates its input (unchanged deliveries and subscribers keep their object
 * identity, so React can skip re-rendering them).
 *
 * API
 *   createInitialState(config?)      empty pipeline with three subscribers at t = 0
 *   applyCommand(state, command)     send | burst | setHealth | restore | replay | reset | loadPreset
 *   advance(state, deltaMs)          move the clock, processing every scheduled moment in order
 *   step(state)                      advance to the next scheduled moment (or IDLE_STEP_MS)
 *   nextScheduledAt(state)           the next moment at which anything happens, or null
 *   selectors                        listDeliveries, deliveriesFor, deadLetters, outstanding, summary
 *
 * Transition rules
 *
 * Delivery: `queued` -> `processing` -> `delivered`, or `processing` ->
 * `retry-scheduled` -> `queued` when due, or `processing` -> `dead-letter`
 * when a budget is exhausted. Sending an event creates one delivery per
 * subscriber. The queue is ordered by delivery age: a retry that becomes due
 * rejoins it ahead of anything created after it, so older deliveries finish
 * first and a retry never waits behind a fresh burst.
 *
 * Dispatch: whenever a worker is free the queue is scanned oldest first and
 * each eligible delivery is started until the workers are busy. A delivery is
 * eligible when its subscriber's circuit is closed (or half-open with no probe
 * in flight) and the subscriber's token bucket holds at least one token.
 * Ineligible deliveries are skipped, not failed, so a struggling subscriber
 * never starves the healthy ones. Starting an attempt consumes one token and
 * counts one attempt; waiting consumes nothing.
 *
 * Outcomes, decided by the subscriber's health when the attempt completes:
 *   healthy       200; the effect is applied once per idempotency key, and a
 *                 repeated key is acknowledged as `duplicate-ignored`
 *   failing       503; a failure
 *   timeout       the consumer applies the effect (or ignores a duplicate) but
 *                 the response is lost; a failure from the sender's view
 *   rate-limited  429 with Retry-After; a deferral, never a failure
 *
 * Budgets: a failure schedules a retry after backoffBaseMs x 2^(failures - 1),
 * capped at backoffCapMs, until failures exceed failureBudget; then the
 * delivery is dead-lettered. A 429 schedules the retry at exactly now +
 * Retry-After until deferrals exceed deferralBudget; then the delivery is
 * dead-lettered. Waiting on an open circuit or on the rate limiter consumes
 * neither budget.
 *
 * Circuit per subscriber: `closed` counts consecutive failures (5xx or
 * timeout; any response, 200 or 429, resets the count) and opens at
 * circuitThreshold. `open` parks the subscriber's deliveries until
 * circuitCooldownMs has elapsed, then becomes `half-open`. `half-open` allows
 * exactly one probe attempt: a response (200, or a 429 that proves the
 * subscriber is alive) closes the circuit; a failure or timeout re-opens it
 * for another cooldown. Restoring a subscriber's health never closes its
 * circuit directly; only a probe that gets a response does.
 *
 * Idempotency: each subscriber remembers the keys it has applied. A duplicate
 * delivery of an applied key increments duplicatesIgnored instead of
 * effectsApplied. This is the at-least-once demonstration: the sender retries
 * anything it cannot confirm, and the consumer makes the retry harmless.
 *
 * Replay: replaying a dead-lettered delivery creates a new delivery with
 * `replayOf` set; the original and its history are never mutated.
 *
 * Bounds: queueBound outstanding deliveries (further sends are rejected with
 * a log line), burstBound events per burst, logBound log entries (ring
 * buffer) and historyBound attempts per delivery (oldest dropped).
 */

import { DEFAULT_CONFIG, IDLE_STEP_MS } from "./config";
import { formatClock, formatMs, padId, statusText } from "./format";
import { PRESETS } from "./presets";
import {
  SUBSCRIBER_IDS,
  type Attempt,
  type AttemptOutcome,
  type Command,
  type Counters,
  type Delivery,
  type InFlight,
  type LogLevel,
  type PresetName,
  type RateLimit,
  type SimConfig,
  type SimEvent,
  type SimState,
  type SimStatusCode,
  type Subscriber,
  type SubscriberHealth,
  type SubscriberId,
} from "./types";

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

const SUBSCRIBER_META: Record<SubscriberId, { name: string; endpoint: string }> = {
  A: { name: "Subscriber A", endpoint: "https://subscriber-a.example/webhooks" },
  B: { name: "Subscriber B", endpoint: "https://subscriber-b.example/webhooks" },
  C: { name: "Subscriber C", endpoint: "https://subscriber-c.example/webhooks" },
};

const EVENT_TYPES = [
  { type: "reservation.confirmed", status: "confirmed" },
  { type: "reservation.cancelled", status: "cancelled" },
  { type: "availability.updated", status: "updated" },
  { type: "prebooking.created", status: "created" },
] as const;

const LOUNGE_CODES = ["LHR-T5-N", "JFK-T4-S", "SIN-T3-E", "DXB-T1-W", "CDG-2E-K"] as const;

function makeSubscriber(id: SubscriberId, config: SimConfig): Subscriber {
  return {
    id,
    name: SUBSCRIBER_META[id].name,
    endpoint: SUBSCRIBER_META[id].endpoint,
    health: "healthy",
    retryAfterMs: config.defaultRetryAfterMs,
    circuit: { state: "closed", consecutiveFailures: 0, openedAt: null, probeInFlight: false },
    rateLimit: {
      tokens: config.rateLimitCapacity,
      capacity: config.rateLimitCapacity,
      refillPerSecond: config.rateLimitRefillPerSecond,
      lastRefillAt: 0,
    },
    processedKeys: [],
    effectsApplied: 0,
    duplicatesIgnored: 0,
    delivered: 0,
    failed: 0,
    deferred: 0,
    deadLettered: 0,
  };
}

function emptyCounters(): Counters {
  return { eventsSent: 0, eventsRejected: 0, deliveriesCreated: 0, attempts: 0, replays: 0, circuitOpens: 0 };
}

export function createInitialState(overrides: Partial<SimConfig> = {}): SimState {
  const config: SimConfig = { ...DEFAULT_CONFIG, ...overrides };
  return {
    now: 0,
    config,
    events: {},
    deliveries: {},
    subscribers: {
      A: makeSubscriber("A", config),
      B: makeSubscriber("B", config),
      C: makeSubscriber("C", config),
    },
    queue: [],
    retries: [],
    inFlight: [],
    log: [],
    counters: emptyCounters(),
    scheduled: [],
    seq: { events: 0, deliveries: 0, log: 0 },
    preset: null,
    revision: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Draft: a shallow working copy. Entities are replaced, never mutated. */
/* ------------------------------------------------------------------ */

type Draft = SimState;

function beginDraft(state: SimState): Draft {
  return {
    ...state,
    events: { ...state.events },
    deliveries: { ...state.deliveries },
    subscribers: { ...state.subscribers },
    queue: [...state.queue],
    retries: [...state.retries],
    inFlight: [...state.inFlight],
    log: [...state.log],
    counters: { ...state.counters },
    scheduled: [...state.scheduled],
    seq: { ...state.seq },
  };
}

function setDelivery(d: Draft, id: string, patch: Partial<Delivery>): Delivery {
  const next = { ...d.deliveries[id], ...patch };
  d.deliveries[id] = next;
  return next;
}

function setSubscriber(d: Draft, id: SubscriberId, patch: Partial<Subscriber>): Subscriber {
  const next = { ...d.subscribers[id], ...patch };
  d.subscribers[id] = next;
  return next;
}

function log(
  d: Draft,
  level: LogLevel,
  message: string,
  ref: { subscriberId?: SubscriberId; deliveryId?: string } = {},
): void {
  d.seq.log += 1;
  d.log.push({ seq: d.seq.log, at: d.now, level, message, ...ref });
  if (d.log.length > d.config.logBound) {
    d.log.splice(0, d.log.length - d.config.logBound);
  }
}

/* ------------------------------------------------------------------ */
/* Token bucket                                                        */
/* ------------------------------------------------------------------ */

function refillInterval(rl: RateLimit): number {
  return 1000 / rl.refillPerSecond;
}

/** Whole-token refill up to `now`. A full bucket banks nothing. */
export function refill(rl: RateLimit, now: number): RateLimit {
  if (now <= rl.lastRefillAt) return rl;
  if (rl.tokens >= rl.capacity) return { ...rl, lastRefillAt: now };
  const interval = refillInterval(rl);
  const ticks = Math.floor((now - rl.lastRefillAt) / interval);
  if (ticks === 0) return rl;
  const tokens = Math.min(rl.capacity, rl.tokens + ticks);
  const lastRefillAt = tokens >= rl.capacity ? now : rl.lastRefillAt + ticks * interval;
  return { ...rl, tokens, lastRefillAt };
}

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

export function backoffMs(failures: number, config: SimConfig): number {
  return Math.min(config.backoffCapMs, config.backoffBaseMs * 2 ** Math.max(0, failures - 1));
}

function outstandingOf(d: Draft): number {
  return d.queue.length + d.inFlight.length + d.retries.length;
}

/* ------------------------------------------------------------------ */
/* Events and deliveries                                               */
/* ------------------------------------------------------------------ */

function makeEvent(d: Draft): SimEvent {
  d.seq.events += 1;
  const n = d.seq.events;
  const kind = EVENT_TYPES[(n - 1) % EVENT_TYPES.length];
  const reservationId = `RSV-${10000 + n}`;
  return {
    id: `evt-${padId(n)}`,
    type: kind.type,
    createdAt: d.now,
    idempotencyKey: `${kind.type}:${reservationId}`,
    payload: {
      reservationId,
      loungeCode: LOUNGE_CODES[(n - 1) % LOUNGE_CODES.length],
      guests: 1 + ((n - 1) % 4),
      status: kind.status,
    },
  };
}

function createDelivery(d: Draft, eventId: string, subscriberId: SubscriberId, replayOf?: string): Delivery {
  d.seq.deliveries += 1;
  const delivery: Delivery = {
    id: `dlv-${padId(d.seq.deliveries)}`,
    seq: d.seq.deliveries,
    eventId,
    subscriberId,
    state: "queued",
    attempts: 0,
    failures: 0,
    deferrals: 0,
    createdAt: d.now,
    nextAttemptAt: null,
    history: [],
    ...(replayOf ? { replayOf } : {}),
  };
  d.deliveries[delivery.id] = delivery;
  d.queue.push(delivery.id);
  d.counters.deliveriesCreated += 1;
  return delivery;
}

/** Returns the event, or null when the queue bound rejected it. */
function sendEvent(d: Draft, quiet: boolean): SimEvent | null {
  if (outstandingOf(d) + SUBSCRIBER_IDS.length > d.config.queueBound) {
    d.counters.eventsRejected += 1;
    if (!quiet) {
      log(d, "warn", `Queue bound reached (${d.config.queueBound} outstanding deliveries). Event rejected.`);
    }
    return null;
  }
  const event = makeEvent(d);
  d.events[event.id] = event;
  d.counters.eventsSent += 1;
  for (const id of SUBSCRIBER_IDS) createDelivery(d, event.id, id);
  if (!quiet) {
    log(d, "info", `Event ${event.id} (${event.type}) accepted. Three deliveries queued.`);
  }
  return event;
}

function burst(d: Draft, requested: number): void {
  const count = Math.min(d.config.burstBound, Math.max(1, Math.round(Number.isFinite(requested) ? requested : 1)));
  if (count !== requested) {
    log(d, "warn", `Burst size ${requested} adjusted to ${count} (burst bound is ${d.config.burstBound} events).`);
  }
  let accepted = 0;
  for (let i = 0; i < count; i += 1) {
    if (!sendEvent(d, true)) {
      log(
        d,
        "warn",
        `Burst stopped after ${accepted} of ${count} events: queue bound reached (${d.config.queueBound} outstanding deliveries).`,
      );
      return;
    }
    accepted += 1;
  }
  log(d, "info", `Burst of ${accepted} events accepted. ${accepted * SUBSCRIBER_IDS.length} deliveries queued.`);
}

function describeHealth(health: SubscriberHealth, retryAfterMs: number): string {
  switch (health) {
    case "healthy":
      return "healthy";
    case "failing":
      return "failing (503 on every request)";
    case "rate-limited":
      return `rate limiting (429 with Retry-After ${formatMs(retryAfterMs)})`;
    case "timeout":
      return "losing responses (the effect is applied, then the response is lost)";
  }
}

function setHealth(d: Draft, id: SubscriberId, health: SubscriberHealth, retryAfterMs?: number): void {
  const sub = d.subscribers[id];
  const nextRetryAfter = retryAfterMs ?? (health === "rate-limited" ? d.config.defaultRetryAfterMs : sub.retryAfterMs);
  if (sub.health === health && sub.retryAfterMs === nextRetryAfter) return;
  setSubscriber(d, id, { health, retryAfterMs: nextRetryAfter });
  if (health === "healthy") {
    const note =
      sub.circuit.state === "closed"
        ? ""
        : ` Its circuit stays ${sub.circuit.state} until the cooldown elapses and a probe succeeds.`;
    log(d, "success", `${sub.name} restored to healthy.${note}`, { subscriberId: id });
  } else {
    log(d, "warn", `${sub.name} is now ${describeHealth(health, nextRetryAfter)}.`, { subscriberId: id });
  }
}

function replay(d: Draft, deliveryId: string): void {
  const original = d.deliveries[deliveryId];
  if (!original) {
    log(d, "warn", `Replay ignored: ${deliveryId} does not exist.`);
    return;
  }
  if (original.state !== "dead-letter") {
    log(d, "warn", `Replay ignored: ${deliveryId} is ${original.state}, not dead-lettered.`, { deliveryId });
    return;
  }
  if (outstandingOf(d) + 1 > d.config.queueBound) {
    log(d, "warn", `Replay of ${deliveryId} rejected: queue bound reached (${d.config.queueBound}).`, { deliveryId });
    return;
  }
  const copy = createDelivery(d, original.eventId, original.subscriberId, original.id);
  d.counters.replays += 1;
  log(d, "info", `Replayed ${original.id} as ${copy.id} to ${d.subscribers[original.subscriberId].name}.`, {
    subscriberId: original.subscriberId,
    deliveryId: copy.id,
  });
}

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

function freeWorkerSlot(d: Draft): number {
  const used = new Set(d.inFlight.map((f) => f.worker));
  for (let i = 0; i < d.config.workers; i += 1) {
    if (!used.has(i)) return i;
  }
  return -1;
}

function dispatch(d: Draft): void {
  if (d.queue.length === 0 || d.inFlight.length >= d.config.workers) return;
  const remaining: string[] = [];
  for (const id of d.queue) {
    if (d.inFlight.length >= d.config.workers) {
      remaining.push(id);
      continue;
    }
    const delivery = d.deliveries[id];
    let sub = d.subscribers[delivery.subscriberId];
    const rl = refill(sub.rateLimit, d.now);
    if (rl !== sub.rateLimit) sub = setSubscriber(d, sub.id, { rateLimit: rl });

    const circuit = sub.circuit;
    const parked = circuit.state === "open" || (circuit.state === "half-open" && circuit.probeInFlight);
    if (parked || rl.tokens < 1) {
      remaining.push(id);
      continue;
    }

    const probe = circuit.state === "half-open";
    setSubscriber(d, sub.id, {
      rateLimit: { ...rl, tokens: rl.tokens - 1 },
      circuit: probe ? { ...circuit, probeInFlight: true } : circuit,
    });
    setDelivery(d, id, { state: "processing", attempts: delivery.attempts + 1, nextAttemptAt: null });
    d.counters.attempts += 1;
    d.inFlight.push({
      deliveryId: id,
      subscriberId: sub.id,
      worker: freeWorkerSlot(d),
      startedAt: d.now,
      completesAt: d.now + d.config.attemptLatencyMs,
      probe,
    });
    if (probe) {
      log(d, "info", `Half-open probe: ${id} is the single attempt allowed to ${sub.name}.`, {
        subscriberId: sub.id,
        deliveryId: id,
      });
    }
  }
  d.queue = remaining;
}

/* ------------------------------------------------------------------ */
/* Attempt completion                                                  */
/* ------------------------------------------------------------------ */

function recordAttempt(d: Draft, delivery: Delivery, attempt: Attempt): Delivery {
  const history = [...delivery.history, attempt];
  if (history.length > d.config.historyBound) history.splice(0, history.length - d.config.historyBound);
  return setDelivery(d, delivery.id, { history });
}

function scheduleRetry(d: Draft, delivery: Delivery, at: number): void {
  setDelivery(d, delivery.id, { state: "retry-scheduled", nextAttemptAt: at });
  d.retries.push(delivery.id);
}

function deadLetter(d: Draft, delivery: Delivery, reason: string): void {
  const sub = d.subscribers[delivery.subscriberId];
  setDelivery(d, delivery.id, { state: "dead-letter", nextAttemptAt: null, deadLetterReason: reason, completedAt: d.now });
  setSubscriber(d, sub.id, { deadLettered: sub.deadLettered + 1 });
  log(d, "error", `${delivery.id} moved to the dead-letter queue: ${reason}`, {
    subscriberId: sub.id,
    deliveryId: delivery.id,
  });
}

function openCircuit(d: Draft, id: SubscriberId, why: string): void {
  const sub = d.subscribers[id];
  setSubscriber(d, id, {
    circuit: { ...sub.circuit, state: "open", openedAt: d.now, probeInFlight: false },
  });
  d.counters.circuitOpens += 1;
  log(
    d,
    "error",
    `Circuit opened for ${sub.name} ${why}. Its deliveries are parked for ${formatMs(d.config.circuitCooldownMs)}.`,
    { subscriberId: sub.id },
  );
}

function completeAttempt(d: Draft, flight: InFlight): void {
  const delivery = d.deliveries[flight.deliveryId];
  const sub = d.subscribers[delivery.subscriberId];
  const event = d.events[delivery.eventId];
  const key = event.idempotencyKey;
  const known = sub.processedKeys.includes(key);
  const n = delivery.attempts;
  const base = { n, startedAt: flight.startedAt, completedAt: d.now, probe: flight.probe };

  let outcome: AttemptOutcome;
  let status: SimStatusCode;
  let consumerNote: string;
  let subPatch: Partial<Subscriber> = {};

  // What the consumer does with the request.
  if (sub.health === "healthy" || sub.health === "timeout") {
    if (known) {
      consumerNote = `${sub.name} recognised idempotency key ${key} and applied nothing new`;
      subPatch = { duplicatesIgnored: sub.duplicatesIgnored + 1 };
    } else {
      consumerNote = `${sub.name} applied the effect for ${key}`;
      subPatch = { processedKeys: [...sub.processedKeys, key], effectsApplied: sub.effectsApplied + 1 };
    }
  } else {
    consumerNote = "";
  }

  // What the sender sees.
  switch (sub.health) {
    case "healthy":
      outcome = known ? "duplicate-ignored" : "success";
      status = 200;
      break;
    case "timeout":
      outcome = "timeout";
      status = 0;
      break;
    case "failing":
      outcome = "failure";
      status = 503;
      break;
    case "rate-limited":
      outcome = "rate-limited";
      status = 429;
      break;
  }

  if (outcome === "success" || outcome === "duplicate-ignored") {
    const note = `${consumerNote} and answered ${statusText(status)}.`;
    recordAttempt(d, delivery, { ...base, outcome, status, note });
    setDelivery(d, delivery.id, { state: "delivered", nextAttemptAt: null, completedAt: d.now });
    const circuitPatch: Partial<Subscriber> =
      sub.circuit.state === "half-open"
        ? { circuit: { state: "closed", consecutiveFailures: 0, openedAt: null, probeInFlight: false } }
        : { circuit: { ...sub.circuit, consecutiveFailures: 0 } };
    setSubscriber(d, sub.id, { ...subPatch, ...circuitPatch, delivered: sub.delivered + 1 });
    if (sub.circuit.state === "half-open") {
      log(d, "success", `Probe succeeded. Circuit closed for ${sub.name}; parked deliveries resume.`, {
        subscriberId: sub.id,
        deliveryId: delivery.id,
      });
    }
    log(
      d,
      "success",
      outcome === "duplicate-ignored"
        ? `${delivery.id} acknowledged by ${sub.name} as a duplicate (attempt ${n}, 200 OK, no new effect).`
        : `${delivery.id} delivered to ${sub.name} (attempt ${n}, 200 OK).`,
      { subscriberId: sub.id, deliveryId: delivery.id },
    );
    return;
  }

  if (outcome === "rate-limited") {
    const retryAfterMs = sub.retryAfterMs;
    const deferrals = delivery.deferrals + 1;
    const exhausted = deferrals > d.config.deferralBudget;
    const at = d.now + retryAfterMs;
    const note = exhausted
      ? `${sub.name} answered 429 Too Many Requests again. Deferral budget of ${d.config.deferralBudget} exhausted; moved to the dead-letter queue.`
      : `${sub.name} answered 429 Too Many Requests with Retry-After ${formatMs(retryAfterMs)}. Retry scheduled at exactly ${formatClock(at)} (deferral ${deferrals} of ${d.config.deferralBudget}); no failure counted.`;
    recordAttempt(d, delivery, { ...base, outcome, status, retryAfterMs, note });
    const updated = setDelivery(d, delivery.id, { deferrals });
    // A 429 is a response: the subscriber is alive, so it resets the failure streak
    // and, on a probe, closes the circuit. Throttling is then paced by Retry-After.
    setSubscriber(d, sub.id, {
      deferred: sub.deferred + 1,
      circuit:
        sub.circuit.state === "half-open"
          ? { state: "closed", consecutiveFailures: 0, openedAt: null, probeInFlight: false }
          : { ...sub.circuit, consecutiveFailures: 0 },
    });
    if (sub.circuit.state === "half-open") {
      log(d, "info", `Probe answered 429: ${sub.name} is responding, so its circuit closed. Deliveries defer per Retry-After.`, {
        subscriberId: sub.id,
        deliveryId: delivery.id,
      });
    }
    if (exhausted) {
      deadLetter(d, updated, `rate limited ${deferrals} times; deferral budget of ${d.config.deferralBudget} exhausted`);
    } else {
      scheduleRetry(d, updated, at);
      log(
        d,
        "warn",
        `${delivery.id}: ${sub.name} answered 429, Retry-After ${formatMs(retryAfterMs)}. Retry at ${formatClock(at)} (deferral ${deferrals} of ${d.config.deferralBudget}).`,
        { subscriberId: sub.id, deliveryId: delivery.id },
      );
    }
    return;
  }

  // failure or timeout
  const failures = delivery.failures + 1;
  const exhausted = failures > d.config.failureBudget;
  const wait = backoffMs(failures, d.config);
  const seen =
    outcome === "timeout"
      ? `No response from ${sub.name} within the client timeout, although ${consumerNote.replace(sub.name, "the consumer")}.`
      : `${sub.name} answered ${statusText(status)}.`;
  const next = exhausted
    ? ` Failure budget of ${d.config.failureBudget} exhausted; moved to the dead-letter queue.`
    : ` Retry ${failures} of ${d.config.failureBudget} scheduled in ${formatMs(wait)} (exponential backoff).`;
  recordAttempt(d, delivery, { ...base, outcome, status, note: seen + next });
  const updated = setDelivery(d, delivery.id, { failures });

  const consecutive = sub.circuit.consecutiveFailures + 1;
  setSubscriber(d, sub.id, {
    ...subPatch,
    failed: sub.failed + 1,
    circuit: { ...sub.circuit, consecutiveFailures: consecutive, probeInFlight: false },
  });

  log(
    d,
    "warn",
    outcome === "timeout"
      ? `${delivery.id}: no response from ${sub.name} (attempt ${n}).${exhausted ? "" : ` Retry in ${formatMs(wait)}.`}`
      : `${delivery.id}: ${sub.name} answered 503 (attempt ${n}).${exhausted ? "" : ` Retry in ${formatMs(wait)}.`}`,
    { subscriberId: sub.id, deliveryId: delivery.id },
  );

  if (exhausted) {
    deadLetter(
      d,
      updated,
      `${failures} failed attempts (${outcome === "timeout" ? "timeouts" : "503 responses"}); failure budget of ${d.config.failureBudget} exhausted`,
    );
  } else {
    scheduleRetry(d, updated, d.now + wait);
  }

  if (sub.circuit.state === "half-open") {
    openCircuit(d, sub.id, "again: the half-open probe failed");
  } else if (sub.circuit.state === "closed" && consecutive >= d.config.circuitThreshold) {
    openCircuit(d, sub.id, `after ${consecutive} consecutive failures`);
  }
}

/* ------------------------------------------------------------------ */
/* Scheduled moments                                                   */
/* ------------------------------------------------------------------ */

function runDueCommands(d: Draft): void {
  if (d.scheduled.length === 0) return;
  const due = d.scheduled.filter((s) => s.at <= d.now);
  if (due.length === 0) return;
  d.scheduled = d.scheduled.filter((s) => s.at > d.now);
  for (const { command } of due) {
    if (command.type === "reset" || command.type === "loadPreset") {
      log(d, "warn", `Scripted ${command.type} ignored: presets cannot reset the clock from inside a script.`);
      continue;
    }
    runCommand(d, command);
  }
}

function runDueCircuits(d: Draft): void {
  for (const id of SUBSCRIBER_IDS) {
    const sub = d.subscribers[id];
    const c = sub.circuit;
    if (c.state === "open" && c.openedAt !== null && c.openedAt + d.config.circuitCooldownMs <= d.now) {
      setSubscriber(d, id, { circuit: { ...c, state: "half-open", probeInFlight: false } });
      log(d, "info", `Cooldown elapsed. Circuit half-open for ${sub.name}: one probe attempt allowed.`, {
        subscriberId: id,
      });
    }
  }
}

function runDueRetries(d: Draft): void {
  if (d.retries.length === 0) return;
  const due = d.retries.filter((id) => (d.deliveries[id].nextAttemptAt ?? Infinity) <= d.now);
  if (due.length === 0) return;
  d.retries = d.retries.filter((id) => (d.deliveries[id].nextAttemptAt ?? Infinity) > d.now);
  for (const id of due) setDelivery(d, id, { state: "queued", nextAttemptAt: null });
  // The queue stays ordered by age, so a retry rejoins ahead of newer work.
  d.queue = [...d.queue, ...due].sort((a, b) => d.deliveries[a].seq - d.deliveries[b].seq);
}

function runDueCompletions(d: Draft): void {
  if (d.inFlight.length === 0) return;
  const done = d.inFlight.filter((f) => f.completesAt <= d.now);
  if (done.length === 0) return;
  d.inFlight = d.inFlight.filter((f) => f.completesAt > d.now);
  for (const flight of done) completeAttempt(d, flight);
}

function runMoment(d: Draft, at: number): void {
  d.now = at;
  runDueCommands(d);
  runDueCircuits(d);
  runDueRetries(d);
  runDueCompletions(d);
  dispatch(d);
  d.revision += 1;
}

export function nextScheduledAt(state: SimState): number | null {
  let t = Infinity;
  for (const f of state.inFlight) t = Math.min(t, f.completesAt);
  for (const id of state.retries) t = Math.min(t, state.deliveries[id].nextAttemptAt ?? Infinity);
  for (const s of state.scheduled) t = Math.min(t, s.at);
  for (const id of SUBSCRIBER_IDS) {
    const c = state.subscribers[id].circuit;
    if (c.state === "open" && c.openedAt !== null) t = Math.min(t, c.openedAt + state.config.circuitCooldownMs);
  }
  // A token refill only matters when it would unblock a waiting delivery.
  if (state.inFlight.length < state.config.workers && state.queue.length > 0) {
    const waiting = new Set(state.queue.map((id) => state.deliveries[id].subscriberId));
    for (const id of waiting) {
      const sub = state.subscribers[id];
      const c = sub.circuit;
      if (c.state === "open" || (c.state === "half-open" && c.probeInFlight)) continue;
      const rl = refill(sub.rateLimit, state.now);
      if (rl.tokens >= 1) continue;
      t = Math.min(t, rl.lastRefillAt + refillInterval(rl));
    }
  }
  return Number.isFinite(t) ? t : null;
}

/* ------------------------------------------------------------------ */
/* Public transitions                                                  */
/* ------------------------------------------------------------------ */

function runCommand(d: Draft, command: Command): void {
  switch (command.type) {
    case "send":
      sendEvent(d, false);
      break;
    case "burst":
      burst(d, command.count);
      break;
    case "setHealth":
      setHealth(d, command.subscriber, command.health, command.retryAfterMs);
      break;
    case "restore":
      setHealth(d, command.subscriber, "healthy");
      break;
    case "replay":
      replay(d, command.deliveryId);
      break;
    case "reset":
    case "loadPreset":
      // Handled by applyCommand; unreachable inside a draft.
      break;
  }
}

function loadPreset(state: SimState, name: PresetName): SimState {
  const preset = PRESETS[name];
  const d = beginDraft(createInitialState(state.config));
  d.revision = state.revision + 1;
  if (!preset) {
    log(d, "warn", `Unknown preset "${String(name)}". Starting from an empty pipeline.`);
    return d;
  }
  d.preset = name;
  d.scheduled = [...preset.script].sort((a, b) => a.at - b.at);
  log(d, "info", `Preset loaded: ${preset.title}. ${preset.script.length} scripted commands on the simulated clock.`);
  runDueCommands(d);
  dispatch(d);
  return d;
}

export function applyCommand(state: SimState, command: Command): SimState {
  if (command.type === "reset") {
    return { ...createInitialState(state.config), revision: state.revision + 1 };
  }
  if (command.type === "loadPreset") {
    return loadPreset(state, command.name);
  }
  const d = beginDraft(state);
  runCommand(d, command);
  dispatch(d);
  d.revision += 1;
  return d;
}

/** Advance the simulated clock, processing every scheduled moment in time order. */
export function advance(state: SimState, deltaMs: number): SimState {
  const target = state.now + Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0);
  let current = state;
  let draft: Draft | null = null;
  // Safety valve against a moment that fails to make progress; the tests assert it never trips.
  for (let guard = 0; guard < 100000; guard += 1) {
    const t = nextScheduledAt(current);
    if (t === null || t > target) break;
    if (!draft) draft = beginDraft(current);
    runMoment(draft, Math.max(t, draft.now));
    current = draft;
  }
  if (draft) {
    draft.now = target;
    return draft;
  }
  return current.now === target ? current : { ...current, now: target };
}

/** Advance to the next scheduled moment, or by IDLE_STEP_MS when nothing is scheduled. */
export function step(state: SimState): SimState {
  const t = nextScheduledAt(state);
  return advance(state, t === null ? IDLE_STEP_MS : Math.max(0, t - state.now));
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export function listDeliveries(state: SimState): Delivery[] {
  return Object.values(state.deliveries);
}

export function deliveriesFor(state: SimState, subscriberId: SubscriberId): Delivery[] {
  return listDeliveries(state).filter((d) => d.subscriberId === subscriberId);
}

export function deadLetters(state: SimState): Delivery[] {
  return listDeliveries(state).filter((d) => d.state === "dead-letter");
}

export function outstanding(state: SimState): number {
  return state.queue.length + state.inFlight.length + state.retries.length;
}

export interface Summary {
  eventsSent: number;
  eventsRejected: number;
  deliveries: number;
  queued: number;
  processing: number;
  retryScheduled: number;
  delivered: number;
  deadLettered: number;
  outstanding: number;
  attempts: number;
  failedAttempts: number;
  deferredAttempts: number;
  effectsApplied: number;
  duplicatesIgnored: number;
  replays: number;
  circuitOpens: number;
}

export function summary(state: SimState): Summary {
  let delivered = 0;
  let deadLettered = 0;
  let failedAttempts = 0;
  let deferredAttempts = 0;
  let effectsApplied = 0;
  let duplicatesIgnored = 0;
  for (const id of SUBSCRIBER_IDS) {
    const s = state.subscribers[id];
    delivered += s.delivered;
    deadLettered += s.deadLettered;
    failedAttempts += s.failed;
    deferredAttempts += s.deferred;
    effectsApplied += s.effectsApplied;
    duplicatesIgnored += s.duplicatesIgnored;
  }
  return {
    eventsSent: state.counters.eventsSent,
    eventsRejected: state.counters.eventsRejected,
    deliveries: state.counters.deliveriesCreated,
    queued: state.queue.length,
    processing: state.inFlight.length,
    retryScheduled: state.retries.length,
    delivered,
    deadLettered,
    outstanding: outstanding(state),
    attempts: state.counters.attempts,
    failedAttempts,
    deferredAttempts,
    effectsApplied,
    duplicatesIgnored,
    replays: state.counters.replays,
    circuitOpens: state.counters.circuitOpens,
  };
}

/**
 * Tokens a subscriber's bucket holds at `state.now`. The engine refills lazily
 * (only when it dispatches), so the UI reads through this rather than the raw field.
 */
export function tokensNow(state: SimState, subscriberId: SubscriberId): number {
  return refill(state.subscribers[subscriberId].rateLimit, state.now).tokens;
}

/** Deliveries for a subscriber that are waiting (queued or retry-scheduled) or in flight. */
export function pendingFor(state: SimState, subscriberId: SubscriberId): { queued: number; retrying: number; processing: number } {
  let queued = 0;
  let retrying = 0;
  let processing = 0;
  for (const id of state.queue) if (state.deliveries[id].subscriberId === subscriberId) queued += 1;
  for (const id of state.retries) if (state.deliveries[id].subscriberId === subscriberId) retrying += 1;
  for (const f of state.inFlight) if (f.subscriberId === subscriberId) processing += 1;
  return { queued, retrying, processing };
}
