/**
 * State shape and command union for the webhook-delivery simulation.
 *
 * Interactive educational simulation. Synthetic data. Not connected to
 * employer systems. Everything here is plain data so that the engine can stay
 * pure and every state can be compared with deep equality in tests.
 */

export type SubscriberId = "A" | "B" | "C";

export const SUBSCRIBER_IDS: readonly SubscriberId[] = ["A", "B", "C"] as const;

export type DeliveryState = "queued" | "processing" | "retry-scheduled" | "delivered" | "dead-letter";

export type CircuitState = "closed" | "open" | "half-open";

export type SubscriberHealth = "healthy" | "failing" | "rate-limited" | "timeout";

export type AttemptOutcome = "success" | "failure" | "rate-limited" | "timeout" | "duplicate-ignored";

/** Simulated HTTP status. 0 means no response arrived before the client timeout. */
export type SimStatusCode = 200 | 429 | 503 | 0;

export interface Attempt {
  /** 1-based attempt number within the delivery. */
  n: number;
  startedAt: number;
  completedAt: number;
  outcome: AttemptOutcome;
  status: SimStatusCode;
  /** True when this attempt was the single probe allowed by a half-open circuit. */
  probe: boolean;
  /** Present on simulated 429 responses. */
  retryAfterMs?: number;
  /** Plain-English account of what happened, written by the engine. */
  note: string;
}

export interface Delivery {
  id: string;
  /** Creation order; the queue is kept sorted by it. */
  seq: number;
  eventId: string;
  subscriberId: SubscriberId;
  state: DeliveryState;
  /** Real simulated requests only. Waiting never counts. */
  attempts: number;
  /** Simulated 5xx responses and timeouts. */
  failures: number;
  /** Simulated 429 responses honoured with Retry-After. */
  deferrals: number;
  createdAt: number;
  /** Set while `retry-scheduled`; null otherwise. */
  nextAttemptAt: number | null;
  /** Bounded to `config.historyBound`; the oldest attempts are dropped. */
  history: Attempt[];
  /** Id of the dead-lettered delivery this one replays. */
  replayOf?: string;
  deadLetterReason?: string;
  completedAt?: number;
}

export interface Circuit {
  state: CircuitState;
  consecutiveFailures: number;
  /** Simulated time at which the circuit last opened; null while closed. */
  openedAt: number | null;
  /** True while the single half-open probe is in flight. */
  probeInFlight: boolean;
}

export interface RateLimit {
  /** Whole tokens available now. */
  tokens: number;
  capacity: number;
  refillPerSecond: number;
  /** Time of the last refill tick (or of the last moment the bucket was full). */
  lastRefillAt: number;
}

export interface Subscriber {
  id: SubscriberId;
  name: string;
  endpoint: string;
  health: SubscriberHealth;
  /** Retry-After the subscriber sends while `rate-limited`. */
  retryAfterMs: number;
  circuit: Circuit;
  rateLimit: RateLimit;
  /** Idempotency keys the consumer has already applied, in order of first sight. */
  processedKeys: string[];
  /** Business effects applied by the consumer (one per idempotency key at most). */
  effectsApplied: number;
  /** Duplicate deliveries acknowledged with 200 but not applied again. */
  duplicatesIgnored: number;
  /** Deliveries acknowledged with 200 (first-time or duplicate). */
  delivered: number;
  /** Failed attempts: simulated 5xx responses and timeouts. */
  failed: number;
  /** Attempts answered with 429 and deferred. */
  deferred: number;
  /** Deliveries moved to the dead-letter queue. */
  deadLettered: number;
}

export interface EventPayload {
  reservationId: string;
  loungeCode: string;
  guests: number;
  status: string;
}

export interface SimEvent {
  id: string;
  type: string;
  createdAt: number;
  idempotencyKey: string;
  payload: EventPayload;
}

export type LogLevel = "info" | "success" | "warn" | "error";

export interface LogEntry {
  /** Monotonic id, stable across ring-buffer trimming. */
  seq: number;
  at: number;
  level: LogLevel;
  subscriberId?: SubscriberId;
  deliveryId?: string;
  message: string;
}

export interface SimConfig {
  /** Concurrent attempts across all subscribers. */
  workers: number;
  /** Simulated time a delivery spends in `processing`. */
  attemptLatencyMs: number;
  /** Failures a delivery may absorb and still retry; the next failure dead-letters it. */
  failureBudget: number;
  /** Backoff after the first failure; doubles each time. */
  backoffBaseMs: number;
  backoffCapMs: number;
  /** 429 responses a delivery may honour; the next one dead-letters it. */
  deferralBudget: number;
  /** Retry-After a rate-limited subscriber sends unless a command overrides it. */
  defaultRetryAfterMs: number;
  /** Consecutive failures that open a subscriber's circuit. */
  circuitThreshold: number;
  /** Time an open circuit waits before allowing one half-open probe. */
  circuitCooldownMs: number;
  rateLimitCapacity: number;
  rateLimitRefillPerSecond: number;
  /** Maximum outstanding deliveries (queued, processing or retry-scheduled). */
  queueBound: number;
  /** Maximum events per burst command. */
  burstBound: number;
  /** Log ring-buffer size. */
  logBound: number;
  /** Attempts kept per delivery. */
  historyBound: number;
}

export interface InFlight {
  deliveryId: string;
  subscriberId: SubscriberId;
  /** Worker slot index, 0-based, for the visualisation. */
  worker: number;
  startedAt: number;
  completesAt: number;
  probe: boolean;
}

export interface Counters {
  eventsSent: number;
  eventsRejected: number;
  deliveriesCreated: number;
  attempts: number;
  replays: number;
  circuitOpens: number;
}

export type PresetName = "healthy" | "failure" | "recovery" | "rate-limit" | "lost-response";

export type Command =
  | { type: "send" }
  | { type: "burst"; count: number }
  | { type: "setHealth"; subscriber: SubscriberId; health: SubscriberHealth; retryAfterMs?: number }
  | { type: "restore"; subscriber: SubscriberId }
  | { type: "replay"; deliveryId: string }
  | { type: "reset" }
  | { type: "loadPreset"; name: PresetName };

export interface ScheduledCommand {
  /** Simulated time at which the command runs. */
  at: number;
  command: Command;
}

export interface SimState {
  /** Simulated clock in milliseconds. */
  now: number;
  config: SimConfig;
  /** Insertion order is creation order (ids are non-numeric strings). */
  events: Record<string, SimEvent>;
  /** Insertion order is creation order. */
  deliveries: Record<string, Delivery>;
  subscribers: Record<SubscriberId, Subscriber>;
  /** Ids of `queued` deliveries, oldest first. Due retries rejoin in age order. */
  queue: string[];
  /** Ids of `retry-scheduled` deliveries. */
  retries: string[];
  /** Attempts currently occupying workers. */
  inFlight: InFlight[];
  /** Ring buffer, oldest first, bounded to `config.logBound`. */
  log: LogEntry[];
  counters: Counters;
  /** Scripted preset commands still to run, sorted by `at`. */
  scheduled: ScheduledCommand[];
  /** Deterministic id counters. */
  seq: { events: number; deliveries: number; log: number };
  preset: PresetName | null;
  /** Increments whenever the state changes beyond the clock moving. */
  revision: number;
}
