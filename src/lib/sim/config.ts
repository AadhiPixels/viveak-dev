import type { SimConfig } from "./types";

/** Shown in place wherever the simulation appears (see docs/CONVENTIONS.md). */
export const LAB_DISCLAIMER = "Interactive educational simulation. Synthetic data. Not connected to employer systems.";

/** Canonical route of the lab, for links from other pages. */
export const LAB_HREF = "/lab/webhook-delivery";

/**
 * Illustrative defaults, chosen for a readable demo. They are not taken from
 * any production system. `docs/SIMULATION.md` mirrors this table.
 */
export const DEFAULT_CONFIG: SimConfig = {
  workers: 2,
  attemptLatencyMs: 300,
  failureBudget: 4,
  backoffBaseMs: 500,
  backoffCapMs: 8000,
  deferralBudget: 6,
  defaultRetryAfterMs: 4000,
  circuitThreshold: 3,
  circuitCooldownMs: 6000,
  rateLimitCapacity: 3,
  rateLimitRefillPerSecond: 1,
  queueBound: 200,
  burstBound: 25,
  logBound: 300,
  historyBound: 20,
};

/** How far `step` moves the clock when nothing is scheduled. */
export const IDLE_STEP_MS = 250;

export interface ParameterRow {
  parameter: string;
  value: string;
  note: string;
}

function seconds(ms: number): string {
  return `${ms / 1000} s`;
}

/** The parameter table rendered on the lab page, derived from a config so it stays truthful. */
export function describeConfig(c: SimConfig = DEFAULT_CONFIG): ParameterRow[] {
  return [
    {
      parameter: "Workers",
      value: `${c.workers} concurrent attempts`,
      note: "Healthy subscribers keep flowing while one fails",
    },
    {
      parameter: "Attempt latency",
      value: `${c.attemptLatencyMs} ms simulated`,
      note: "Time a delivery spends in processing",
    },
    {
      parameter: "Failure budget",
      value: `${c.failureBudget} failures, so ${c.failureBudget + 1} attempts at most`,
      note: "Then dead-letter",
    },
    {
      parameter: "Backoff",
      value: `${c.backoffBaseMs} ms × 2^(failures - 1), capped at ${seconds(c.backoffCapMs)}`,
      note: "Exponential, bounded, no jitter",
    },
    {
      parameter: "429 deferrals",
      value: `${c.deferralBudget} per delivery`,
      note: `Retries exactly at Retry-After (default ${seconds(c.defaultRetryAfterMs)})`,
    },
    {
      parameter: "Circuit threshold",
      value: `${c.circuitThreshold} consecutive failures`,
      note: "Opens the subscriber's circuit",
    },
    {
      parameter: "Circuit cooldown",
      value: seconds(c.circuitCooldownMs),
      note: "Then one half-open probe",
    },
    {
      parameter: "Local rate limit",
      value: `${c.rateLimitCapacity} tokens, refill ${c.rateLimitRefillPerSecond} per second`,
      note: "Token bucket per subscriber",
    },
    {
      parameter: "Queue bound",
      value: `${c.queueBound} deliveries`,
      note: "Outstanding deliveries; further sends are rejected with a log line",
    },
    {
      parameter: "Burst bound",
      value: `${c.burstBound} events`,
      note: "Per burst command; larger requests are clamped",
    },
    {
      parameter: "Log bound",
      value: `${c.logBound} entries`,
      note: "Ring buffer",
    },
    {
      parameter: "History bound",
      value: `${c.historyBound} attempts per delivery`,
      note: "Oldest attempts are dropped",
    },
  ];
}
