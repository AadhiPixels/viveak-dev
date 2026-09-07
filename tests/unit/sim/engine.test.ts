import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, IDLE_STEP_MS } from "@/lib/sim/config";
import {
  advance,
  applyCommand,
  backoffMs,
  createInitialState,
  deadLetters,
  deliveriesFor,
  listDeliveries,
  nextScheduledAt,
  outstanding,
  pendingFor,
  refill,
  step,
  summary,
} from "@/lib/sim/engine";
import type { Command, SimConfig, SimState, SubscriberId } from "@/lib/sim/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function make(overrides: Partial<SimConfig> = {}): SimState {
  return createInitialState(overrides);
}

function run(state: SimState, ...commands: Command[]): SimState {
  return commands.reduce((s, c) => applyCommand(s, c), state);
}

function advanceTo(state: SimState, t: number): SimState {
  return advance(state, t - state.now);
}

/** Steps until the predicate holds or the clock passes `maxMs`. */
function until(state: SimState, predicate: (s: SimState) => boolean, maxMs = 120_000): SimState {
  let s = state;
  while (!predicate(s) && s.now <= maxMs) s = step(s);
  return s;
}

function first(state: SimState, subscriber: SubscriberId) {
  return deliveriesFor(state, subscriber)[0];
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

const fail = (subscriber: SubscriberId = "A"): Command => ({ type: "setHealth", subscriber, health: "failing" });
const restore = (subscriber: SubscriberId = "A"): Command => ({ type: "restore", subscriber });
const send: Command = { type: "send" };

/* ------------------------------------------------------------------ */
/* Construction and basics                                             */
/* ------------------------------------------------------------------ */

describe("createInitialState", () => {
  it("starts empty at t = 0 with three healthy subscribers on the documented defaults", () => {
    const s = make();
    expect(s.now).toBe(0);
    expect(s.config).toEqual(DEFAULT_CONFIG);
    expect(Object.keys(s.subscribers)).toEqual(["A", "B", "C"]);
    for (const id of ["A", "B", "C"] as const) {
      const sub = s.subscribers[id];
      expect(sub.health).toBe("healthy");
      expect(sub.circuit).toEqual({ state: "closed", consecutiveFailures: 0, openedAt: null, probeInFlight: false });
      expect(sub.rateLimit.tokens).toBe(3);
      expect(sub.endpoint).toMatch(/^https:\/\/subscriber-[abc]\.example\/webhooks$/);
    }
    expect(listDeliveries(s)).toHaveLength(0);
    expect(nextScheduledAt(s)).toBeNull();
    expect(summary(s).outstanding).toBe(0);
  });

  it("accepts config overrides without touching the defaults", () => {
    const s = make({ workers: 5 });
    expect(s.config.workers).toBe(5);
    expect(DEFAULT_CONFIG.workers).toBe(2);
  });
});

describe("send", () => {
  it("creates one event and one delivery per subscriber, starting two on the two workers", () => {
    const s = run(make(), send);
    expect(Object.keys(s.events)).toEqual(["evt-0001"]);
    const ds = listDeliveries(s);
    expect(ds.map((d) => d.subscriberId)).toEqual(["A", "B", "C"]);
    expect(ds.map((d) => d.state)).toEqual(["processing", "processing", "queued"]);
    expect(ds.map((d) => d.attempts)).toEqual([1, 1, 0]);
    expect(s.inFlight.map((f) => f.worker)).toEqual([0, 1]);
    expect(s.queue).toEqual(["dlv-0003"]);
    expect(nextScheduledAt(s)).toBe(300);
    expect(s.log.at(-1)?.message).toContain("evt-0001");
  });

  it("delivers to healthy subscribers after the attempt latency and applies each effect once", () => {
    let s = run(make(), send);
    s = advanceTo(s, 300);
    expect(listDeliveries(s).map((d) => d.state)).toEqual(["delivered", "delivered", "processing"]);
    s = advanceTo(s, 600);
    expect(listDeliveries(s).every((d) => d.state === "delivered")).toBe(true);
    for (const id of ["A", "B", "C"] as const) {
      const sub = s.subscribers[id];
      expect(sub.delivered).toBe(1);
      expect(sub.effectsApplied).toBe(1);
      expect(sub.duplicatesIgnored).toBe(0);
      expect(sub.processedKeys).toEqual([s.events["evt-0001"].idempotencyKey]);
    }
    const a = first(s, "A");
    expect(a.history).toHaveLength(1);
    expect(a.history[0]).toMatchObject({ n: 1, outcome: "success", status: 200, startedAt: 0, completedAt: 300 });
    expect(a.history[0].note).toContain("applied the effect");
    expect(summary(s)).toMatchObject({ eventsSent: 1, deliveries: 3, delivered: 3, outstanding: 0, attempts: 3 });
  });

  it("uses synthetic payloads with a stable idempotency key per event", () => {
    const s = run(make(), send, send);
    const [e1, e2] = Object.values(s.events);
    expect(e1.type).toBe("reservation.confirmed");
    expect(e1.idempotencyKey).toBe("reservation.confirmed:RSV-10001");
    expect(e1.payload).toEqual({ reservationId: "RSV-10001", loungeCode: "LHR-T5-N", guests: 1, status: "confirmed" });
    expect(e2.idempotencyKey).not.toBe(e1.idempotencyKey);
  });
});

/* ------------------------------------------------------------------ */
/* Retries, backoff and dead letters                                   */
/* ------------------------------------------------------------------ */

describe("retries and backoff", () => {
  it("computes 500 ms x 2^(failures - 1) capped at 8 s", () => {
    expect([1, 2, 3, 4, 5, 6].map((f) => backoffMs(f, DEFAULT_CONFIG))).toEqual([500, 1000, 2000, 4000, 8000, 8000]);
  });

  it("schedules each retry with exponential backoff and honours the cap", () => {
    // A large failure budget and no circuit so the backoff curve is visible on its own.
    let s = run(make({ circuitThreshold: 99, failureBudget: 8 }), fail(), send);
    s = advanceTo(s, 300);
    const a = first(s, "A");
    expect(a).toMatchObject({ state: "retry-scheduled", attempts: 1, failures: 1, nextAttemptAt: 800 });
    expect(a.history[0]).toMatchObject({ outcome: "failure", status: 503 });
    expect(a.history[0].note).toContain("Retry 1 of 8");

    const gaps: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const d = first(s, "A");
      const due = d.nextAttemptAt as number;
      s = advanceTo(s, due);
      expect(first(s, "A").state).toBe("processing");
      s = advanceTo(s, due + 300);
      const after = first(s, "A");
      gaps.push((after.nextAttemptAt as number) - (due + 300));
    }
    expect(gaps).toEqual([1000, 2000, 4000, 8000, 8000, 8000]);
  });

  it("dead-letters after the failure budget: 4 failures, so 5 attempts at most", () => {
    let s = run(make({ circuitThreshold: 99 }), fail(), send);
    s = advanceTo(s, 60_000);
    const a = first(s, "A");
    expect(a.state).toBe("dead-letter");
    expect(a.attempts).toBe(5);
    expect(a.failures).toBe(5);
    expect(a.completedAt).toBe(9000); // 0, 800, 2100, 4400, 8700 + 300 ms
    expect(a.nextAttemptAt).toBeNull();
    expect(a.deadLetterReason).toContain("failure budget of 4 exhausted");
    expect(a.history.map((h) => h.status)).toEqual([503, 503, 503, 503, 503]);
    expect(a.history[4].note).toContain("dead-letter");
    expect(s.subscribers.A).toMatchObject({ failed: 5, deadLettered: 1, delivered: 0, effectsApplied: 0 });
    expect(deadLetters(s).map((d) => d.id)).toEqual([a.id]);
    expect(s.log.some((l) => l.level === "error" && l.message.includes("dead-letter queue"))).toBe(true);
    // B and C were unaffected.
    expect(first(s, "B").state).toBe("delivered");
    expect(first(s, "C").state).toBe("delivered");
  });
});

/* ------------------------------------------------------------------ */
/* Circuit breaker                                                     */
/* ------------------------------------------------------------------ */

describe("circuit breaker", () => {
  it("opens after 3 consecutive failures, parks deliveries, probes once per cooldown and closes only on a successful probe", () => {
    let s = run(make(), fail(), { type: "burst", count: 4 });
    const aIds = deliveriesFor(s, "A").map((d) => d.id);
    expect(aIds).toEqual(["dlv-0001", "dlv-0004", "dlv-0007", "dlv-0010"]);

    // Third consecutive failure at 1.2 s opens the circuit.
    s = advanceTo(s, 1199);
    expect(s.subscribers.A.circuit.state).toBe("closed");
    s = advanceTo(s, 1200);
    expect(s.subscribers.A.circuit).toMatchObject({ state: "open", openedAt: 1200, consecutiveFailures: 3 });
    expect(s.counters.circuitOpens).toBe(1);
    expect(s.log.some((l) => l.message.includes("Circuit opened for Subscriber A after 3 consecutive failures"))).toBe(true);

    // While open: nothing to A is attempted, budgets are untouched, B and C finish.
    const attemptsAtOpen = deliveriesFor(s, "A").map((d) => d.attempts);
    s = advanceTo(s, 5000);
    expect(deliveriesFor(s, "A").map((d) => d.attempts)).toEqual(attemptsAtOpen);
    expect(deliveriesFor(s, "A").map((d) => d.attempts)).toEqual([2, 1, 0, 0]);
    expect(s.inFlight.filter((f) => f.subscriberId === "A")).toHaveLength(0);
    expect(deliveriesFor(s, "B").every((d) => d.state === "delivered")).toBe(true);
    expect(deliveriesFor(s, "C").every((d) => d.state === "delivered")).toBe(true);
    expect(pendingFor(s, "A")).toEqual({ queued: 4, retrying: 0, processing: 0 });
    expect(nextScheduledAt(s)).toBe(7200);

    // Cooldown elapses: half-open, exactly one probe although a worker is idle.
    s = advanceTo(s, 7200);
    expect(s.subscribers.A.circuit).toMatchObject({ state: "half-open", probeInFlight: true });
    expect(s.inFlight).toHaveLength(1);
    expect(s.inFlight[0]).toMatchObject({ deliveryId: "dlv-0001", probe: true });
    expect(s.queue).toEqual(["dlv-0004", "dlv-0007", "dlv-0010"]);

    // The probe fails: re-open for another full cooldown.
    s = advanceTo(s, 7500);
    expect(s.subscribers.A.circuit).toMatchObject({ state: "open", openedAt: 7500, probeInFlight: false });
    expect(s.counters.circuitOpens).toBe(2);
    expect(s.deliveries["dlv-0001"]).toMatchObject({ failures: 3, state: "retry-scheduled", nextAttemptAt: 9500 });

    // Restoring health does not close the circuit.
    s = advanceTo(s, 8000);
    s = applyCommand(s, restore());
    expect(s.subscribers.A.health).toBe("healthy");
    expect(s.subscribers.A.circuit).toMatchObject({ state: "open", openedAt: 7500 });
    expect(s.log.at(-1)?.message).toContain("circuit stays open");

    // Second cooldown, successful probe, closed, parked deliveries flow.
    s = advanceTo(s, 13_499);
    expect(s.subscribers.A.circuit.state).toBe("open");
    s = advanceTo(s, 13_500);
    expect(s.subscribers.A.circuit.state).toBe("half-open");
    expect(s.inFlight.map((f) => f.deliveryId)).toEqual(["dlv-0001"]);
    s = advanceTo(s, 13_800);
    expect(s.subscribers.A.circuit).toEqual({ state: "closed", consecutiveFailures: 0, openedAt: null, probeInFlight: false });
    expect(s.log.some((l) => l.message.includes("Probe succeeded. Circuit closed for Subscriber A"))).toBe(true);
    expect(s.inFlight.map((f) => f.deliveryId)).toEqual(["dlv-0004", "dlv-0007"]);

    s = advanceTo(s, 16_000);
    expect(listDeliveries(s).every((d) => d.state === "delivered")).toBe(true);
    expect(deadLetters(s)).toHaveLength(0);
    const probeHistory = s.deliveries["dlv-0001"].history;
    expect(probeHistory.map((h) => [h.n, h.probe, h.outcome])).toEqual([
      [1, false, "failure"],
      [2, false, "failure"],
      [3, true, "failure"],
      [4, true, "success"],
    ]);
  });

  it("closes a half-open circuit when the probe gets a 429, because the subscriber is responding", () => {
    let s = run(make(), fail(), { type: "burst", count: 3 });
    s = until(s, (x) => x.subscribers.A.circuit.state === "open");
    s = applyCommand(s, { type: "setHealth", subscriber: "A", health: "rate-limited", retryAfterMs: 1000 });
    s = until(s, (x) => x.subscribers.A.circuit.state === "half-open");
    const probe = s.inFlight.find((f) => f.probe);
    expect(probe).toBeDefined();
    s = advanceTo(s, probe!.completesAt);
    expect(s.subscribers.A.circuit).toMatchObject({ state: "closed", consecutiveFailures: 0 });
    expect(s.deliveries[probe!.deliveryId]).toMatchObject({ state: "retry-scheduled", nextAttemptAt: probe!.completesAt + 1000 });
    expect(s.log.some((l) => l.message.includes("Probe answered 429"))).toBe(true);
  });

  it("resets the consecutive-failure count on any response", () => {
    let s = run(make({ circuitThreshold: 3 }), fail(), send);
    s = advanceTo(s, 300);
    expect(s.subscribers.A.circuit.consecutiveFailures).toBe(1);
    s = run(s, restore(), send);
    s = advanceTo(s, s.now + 300);
    expect(s.subscribers.A.circuit.consecutiveFailures).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

describe("local rate limiter (token bucket)", () => {
  it("refills whole tokens at 1 per second and banks nothing when full", () => {
    const full = { tokens: 3, capacity: 3, refillPerSecond: 1, lastRefillAt: 0 };
    expect(refill(full, 5000)).toEqual({ ...full, lastRefillAt: 5000 });
    const empty = { ...full, tokens: 0, lastRefillAt: 1000 };
    expect(refill(empty, 1999)).toBe(empty);
    expect(refill(empty, 2000)).toEqual({ ...empty, tokens: 1, lastRefillAt: 2000 });
    expect(refill(empty, 3500)).toEqual({ ...empty, tokens: 2, lastRefillAt: 3000 });
    expect(refill(empty, 9000)).toEqual({ ...empty, tokens: 3, lastRefillAt: 9000 });
  });

  it("makes deliveries wait without consuming attempts, then releases one per second", () => {
    // Ten workers so only the token bucket constrains dispatch.
    let s = run(make({ workers: 10 }), send, send, send, send, send);
    expect(s.inFlight).toHaveLength(9);
    for (const id of ["A", "B", "C"] as const) {
      expect(s.subscribers[id].rateLimit.tokens).toBe(0);
      const waiting = deliveriesFor(s, id).slice(3);
      expect(waiting.map((d) => d.state)).toEqual(["queued", "queued"]);
      expect(waiting.map((d) => d.attempts)).toEqual([0, 0]);
    }
    s = advanceTo(s, 300);
    expect(summary(s).delivered).toBe(9);
    expect(nextScheduledAt(s)).toBe(1000);
    s = advanceTo(s, 999);
    expect(deliveriesFor(s, "A")[3]).toMatchObject({ state: "queued", attempts: 0, history: [] });
    s = advanceTo(s, 1000);
    expect(deliveriesFor(s, "A")[3]).toMatchObject({ state: "processing", attempts: 1 });
    expect(deliveriesFor(s, "A")[4]).toMatchObject({ state: "queued", attempts: 0 });
    s = advanceTo(s, 2000);
    expect(deliveriesFor(s, "A")[4]).toMatchObject({ state: "processing", attempts: 1, history: [] });
    s = advanceTo(s, 2300);
    expect(listDeliveries(s).every((d) => d.state === "delivered" && d.attempts === 1)).toBe(true);
    expect(summary(s).attempts).toBe(15);
  });
});

describe("429 with Retry-After", () => {
  it("retries at exactly Retry-After, never counts a failure and dead-letters after the deferral budget", () => {
    let s = run(make(), { type: "setHealth", subscriber: "A", health: "rate-limited", retryAfterMs: 2500 }, send);
    s = advanceTo(s, 300);
    let a = first(s, "A");
    expect(a).toMatchObject({ state: "retry-scheduled", attempts: 1, failures: 0, deferrals: 1, nextAttemptAt: 2800 });
    expect(a.history[0]).toMatchObject({ outcome: "rate-limited", status: 429, retryAfterMs: 2500 });
    expect(a.history[0].note).toContain("exactly");
    expect(s.subscribers.A.circuit.consecutiveFailures).toBe(0);

    s = advanceTo(s, 2799);
    expect(first(s, "A").state).toBe("retry-scheduled");
    s = advanceTo(s, 2800);
    expect(first(s, "A")).toMatchObject({ state: "processing", attempts: 2 });

    s = advanceTo(s, 60_000);
    a = first(s, "A");
    expect(a.state).toBe("dead-letter");
    expect(a.attempts).toBe(7);
    expect(a.deferrals).toBe(7);
    expect(a.failures).toBe(0);
    expect(a.completedAt).toBe(6 * 2800 + 300);
    expect(a.deadLetterReason).toContain("deferral budget of 6 exhausted");
    expect(a.history.every((h) => h.status === 429)).toBe(true);
    expect(s.subscribers.A).toMatchObject({ deferred: 7, failed: 0, deadLettered: 1 });
    expect(s.subscribers.A.circuit.state).toBe("closed");
    expect(s.counters.circuitOpens).toBe(0);
  });

  it("uses the default Retry-After of 4 s when none is given", () => {
    let s = run(make(), { type: "setHealth", subscriber: "A", health: "rate-limited" }, send);
    s = advanceTo(s, 300);
    expect(first(s, "A").nextAttemptAt).toBe(4300);
    expect(s.subscribers.A.retryAfterMs).toBe(4000);
  });
});

/* ------------------------------------------------------------------ */
/* Idempotency, at-least-once and replay                               */
/* ------------------------------------------------------------------ */

describe("lost responses and consumer-side idempotency", () => {
  it("applies the effect on a timeout, then acknowledges the retry as a duplicate", () => {
    let s = run(make(), { type: "setHealth", subscriber: "A", health: "timeout" }, send);
    s = advanceTo(s, 300);
    const a = first(s, "A");
    expect(a).toMatchObject({ state: "retry-scheduled", failures: 1, nextAttemptAt: 800 });
    expect(a.history[0]).toMatchObject({ outcome: "timeout", status: 0 });
    expect(a.history[0].note).toContain("the consumer applied the effect");
    expect(s.subscribers.A).toMatchObject({ effectsApplied: 1, duplicatesIgnored: 0, failed: 1, delivered: 0 });
    expect(s.subscribers.A.processedKeys).toEqual([s.events["evt-0001"].idempotencyKey]);

    s = applyCommand(s, restore());
    s = advanceTo(s, 1100);
    const after = first(s, "A");
    expect(after.state).toBe("delivered");
    expect(after.history[1]).toMatchObject({ n: 2, outcome: "duplicate-ignored", status: 200 });
    expect(after.history[1].note).toContain("applied nothing new");
    expect(s.subscribers.A).toMatchObject({ effectsApplied: 1, duplicatesIgnored: 1, delivered: 1 });
    expect(s.log.some((l) => l.message.includes("as a duplicate"))).toBe(true);
  });

  it("keeps ignoring duplicates while responses stay lost, so the effect is never applied twice", () => {
    let s = run(make({ circuitThreshold: 99 }), { type: "setHealth", subscriber: "A", health: "timeout" }, send);
    s = advanceTo(s, 1100);
    expect(first(s, "A").history.map((h) => h.outcome)).toEqual(["timeout", "timeout"]);
    expect(s.subscribers.A).toMatchObject({ effectsApplied: 1, duplicatesIgnored: 1, failed: 2 });
  });
});

describe("replay", () => {
  it("creates a new delivery that records replayOf and never mutates the original", () => {
    let s = run(make({ circuitThreshold: 99 }), fail(), send);
    s = advanceTo(s, 60_000);
    const original = first(s, "A");
    expect(original.state).toBe("dead-letter");
    const snapshot = structuredClone(original);

    s = run(s, restore(), { type: "replay", deliveryId: original.id });
    expect(s.deliveries[original.id]).toBe(original);
    expect(s.deliveries[original.id]).toEqual(snapshot);
    const copy = listDeliveries(s).find((d) => d.replayOf === original.id);
    expect(copy).toBeDefined();
    expect(copy).toMatchObject({ id: "dlv-0004", eventId: original.eventId, subscriberId: "A", state: "processing", attempts: 1 });
    expect(copy!.history).toEqual([]);
    expect(s.counters.replays).toBe(1);

    s = advanceTo(s, s.now + 300);
    const done = s.deliveries[copy!.id];
    expect(done.state).toBe("delivered");
    // The consumer never applied the effect while failing, so the replay applies it for the first time.
    expect(done.history[0].outcome).toBe("success");
    expect(s.subscribers.A).toMatchObject({ effectsApplied: 1, duplicatesIgnored: 0, deadLettered: 1, delivered: 1 });
    expect(s.deliveries[original.id]).toEqual(snapshot);
  });

  it("ignores replays of deliveries that are not dead-lettered, with a log line", () => {
    let s = run(make(), send);
    const before = listDeliveries(s).length;
    s = run(s, { type: "replay", deliveryId: "dlv-0001" }, { type: "replay", deliveryId: "dlv-9999" });
    expect(listDeliveries(s)).toHaveLength(before);
    expect(s.counters.replays).toBe(0);
    expect(s.log.slice(-2).map((l) => l.level)).toEqual(["warn", "warn"]);
    expect(s.log.at(-2)?.message).toContain("not dead-lettered");
  });
});

/* ------------------------------------------------------------------ */
/* Bounds                                                              */
/* ------------------------------------------------------------------ */

describe("bounds", () => {
  it("rejects sends beyond the queue bound with a log line", () => {
    // No workers, so nothing drains and the bound is reached quickly.
    let s = run(make({ workers: 0, queueBound: 9 }), send, send, send);
    expect(outstanding(s)).toBe(9);
    s = applyCommand(s, send);
    expect(s.counters).toMatchObject({ eventsSent: 3, eventsRejected: 1, deliveriesCreated: 9 });
    expect(Object.keys(s.events)).toHaveLength(3);
    expect(s.log.at(-1)).toMatchObject({ level: "warn" });
    expect(s.log.at(-1)?.message).toContain("Queue bound reached (9 outstanding deliveries)");
  });

  it("stops a burst at the queue bound and says so", () => {
    const s = run(make({ workers: 0, queueBound: 9 }), { type: "burst", count: 25 });
    expect(s.counters.eventsSent).toBe(3);
    expect(s.counters.eventsRejected).toBe(1);
    expect(s.log.at(-1)?.message).toContain("Burst stopped after 3 of 25 events");
  });

  it("clamps bursts to the burst bound", () => {
    let s = run(make({ workers: 0 }), { type: "burst", count: 100 });
    expect(s.counters.eventsSent).toBe(25);
    expect(listDeliveries(s)).toHaveLength(75);
    expect(s.log.some((l) => l.message.includes("adjusted to 25"))).toBe(true);
    s = run(make({ workers: 0 }), { type: "burst", count: 0 });
    expect(s.counters.eventsSent).toBe(1);
  });

  it("keeps the log as a ring buffer of the newest entries", () => {
    let s = make({ logBound: 5 });
    for (let i = 0; i < 10; i += 1) s = advance(applyCommand(s, send), 600);
    expect(s.log).toHaveLength(5);
    expect(s.log.map((l) => l.seq)).toEqual(s.log.map((l) => l.seq).sort((a, b) => a - b));
    expect(s.log.at(-1)?.seq).toBe(s.seq.log);
    expect(s.seq.log).toBeGreaterThan(5);
  });

  it("keeps only the latest attempts in a delivery's history", () => {
    let s = run(make({ historyBound: 3, circuitThreshold: 99, failureBudget: 8 }), fail(), send);
    s = advanceTo(s, 120_000);
    const a = first(s, "A");
    expect(a.state).toBe("dead-letter");
    expect(a.attempts).toBe(9);
    expect(a.history.map((h) => h.n)).toEqual([7, 8, 9]);
  });
});

/* ------------------------------------------------------------------ */
/* Fairness, determinism and the controlled clock                       */
/* ------------------------------------------------------------------ */

describe("fairness", () => {
  it("keeps delivering to B and C while A fails and its circuit is open", () => {
    let s = run(make(), fail(), { type: "burst", count: 10 });
    s = advanceTo(s, 30_000);
    expect(s.counters.circuitOpens).toBeGreaterThanOrEqual(1);
    expect(s.subscribers.A.delivered).toBe(0);
    for (const id of ["B", "C"] as const) {
      const ds = deliveriesFor(s, id);
      expect(ds).toHaveLength(10);
      expect(ds.every((d) => d.state === "delivered" && d.attempts === 1)).toBe(true);
      // Paced only by the token bucket: three at once, then one per second.
      expect(Math.max(...ds.map((d) => d.completedAt ?? Infinity))).toBeLessThan(10_000);
      expect(s.subscribers[id]).toMatchObject({ delivered: 10, failed: 0, effectsApplied: 10 });
    }
  });

  it("lets a due retry rejoin the queue ahead of newer deliveries", () => {
    let s = run(make({ circuitThreshold: 99 }), fail(), send);
    s = advanceTo(s, 300); // dlv-0001 retry due at 800
    s = run(s, restore(), { type: "burst", count: 5 });
    s = advanceTo(s, 799);
    expect(s.queue.indexOf("dlv-0001")).toBe(-1);
    s = advanceTo(s, 800);
    // Both workers are busy until 900, so the retry waits at the head of the queue, ahead of the burst.
    expect(s.queue[0]).toBe("dlv-0001");
    expect(first(s, "A").state).toBe("queued");
    s = advanceTo(s, 900);
    expect(first(s, "A")).toMatchObject({ state: "processing", attempts: 2 });
  });
});

describe("determinism", () => {
  const script: { at: number; command: Command }[] = [
    { at: 0, command: fail() },
    { at: 100, command: { type: "burst", count: 7 } },
    { at: 2500, command: { type: "setHealth", subscriber: "B", health: "rate-limited", retryAfterMs: 1500 } },
    { at: 4000, command: { type: "setHealth", subscriber: "C", health: "timeout" } },
    { at: 6000, command: send },
    { at: 9000, command: restore() },
    { at: 9000, command: restore("B") },
    { at: 12_000, command: restore("C") },
    { at: 15_000, command: { type: "burst", count: 3 } },
  ];

  function play(sliceMs: number, endAt = 40_000): SimState {
    let s = make();
    let i = 0;
    while (s.now < endAt) {
      while (i < script.length && script[i].at <= s.now) s = applyCommand(s, script[i++].command);
      const nextCommandAt = i < script.length ? script[i].at : Infinity;
      const target = Math.min(endAt, s.now + sliceMs, nextCommandAt);
      s = advanceTo(s, target);
    }
    return s;
  }

  it("produces deep-equal states for the same commands", () => {
    expect(play(500)).toEqual(play(500));
  });

  it("does not depend on how the clock is sliced", () => {
    const coarse = play(40_000);
    const fine = play(16);
    expect(fine).toEqual(coarse);
    expect(summary(fine).attempts).toBeGreaterThan(30);
  });

  it("never mutates its inputs", () => {
    let s = deepFreeze(make());
    for (const { command } of script) {
      s = deepFreeze(applyCommand(s, command));
      s = deepFreeze(advance(s, 700));
    }
    s = deepFreeze(advance(s, 30_000));
    expect(deadLetters(s).length + summary(s).delivered).toBeGreaterThan(0);
  });
});

describe("step and nextScheduledAt", () => {
  it("advances by the idle quantum when nothing is scheduled", () => {
    const s = step(make());
    expect(s.now).toBe(IDLE_STEP_MS);
    expect(s.revision).toBe(0);
  });

  it("advances exactly to the next scheduled moment and processes it", () => {
    let s = run(make(), send);
    s = step(s);
    expect(s.now).toBe(300);
    expect(summary(s).delivered).toBe(2);
    s = step(s);
    expect(s.now).toBe(600);
    expect(summary(s).delivered).toBe(3);
    expect(nextScheduledAt(s)).toBeNull();
  });

  it("reports scripted commands, cooldowns and token refills as scheduled moments", () => {
    let s = applyCommand(make(), { type: "loadPreset", name: "healthy" });
    expect(s.counters.eventsSent).toBe(1); // the command at t = 0 ran immediately
    expect(nextScheduledAt(s)).toBe(300);
    s = advanceTo(s, 600);
    expect(nextScheduledAt(s)).toBe(1200); // the next scripted send

    let f = run(make(), fail(), { type: "burst", count: 3 });
    f = until(f, (x) => x.subscribers.A.circuit.state === "open");
    f = advanceTo(f, f.now + 3000);
    expect(nextScheduledAt(f)).toBe((f.subscribers.A.circuit.openedAt as number) + 6000);
  });

  it("bumps the revision only when something happens", () => {
    const s = run(make(), send);
    const idle = advance(s, 100);
    expect(idle.revision).toBe(s.revision);
    expect(idle.now).toBe(100);
    expect(advance(s, 300).revision).toBe(s.revision + 1);
  });
});

describe("presets and reset through the command union", () => {
  it("runs scripted commands on the simulated clock, not before", () => {
    let s = applyCommand(make(), { type: "loadPreset", name: "recovery" });
    expect(s.preset).toBe("recovery");
    expect(s.subscribers.A.health).toBe("failing");
    expect(s.counters.eventsSent).toBe(0);
    s = advanceTo(s, 199);
    expect(s.counters.eventsSent).toBe(0);
    s = advanceTo(s, 200);
    expect(s.counters.eventsSent).toBe(5);
    s = advanceTo(s, 8999);
    expect(s.subscribers.A.health).toBe("failing");
    s = advanceTo(s, 9000);
    expect(s.subscribers.A.health).toBe("healthy");
    expect(s.scheduled).toEqual([]);
  });

  it("resets to the initial state while keeping the config", () => {
    let s = run(make({ workers: 3 }), fail(), { type: "burst", count: 4 });
    s = advanceTo(s, 5000);
    const revision = s.revision;
    s = applyCommand(s, { type: "reset" });
    expect(s).toEqual({ ...createInitialState({ workers: 3 }), revision: revision + 1 });
  });

  it("changes nothing when health is set to its current value", () => {
    const s = run(make(), send);
    const same = applyCommand(s, restore());
    expect(same.log).toEqual(s.log);
    expect(same.subscribers.A).toBe(s.subscribers.A);
  });
});
