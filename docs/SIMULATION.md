# Webhook-delivery simulation

Interactive educational simulation. Synthetic data. Not connected to employer systems.

The lab at `/lab/webhook-delivery` runs an independently authored, deterministic TypeScript
model of a resilient webhook delivery pipeline. It illustrates patterns named on the CV
(HMAC-signed payloads, per-subscription circuit breakers, rate limiting, exponential-backoff
retries, a dead-letter queue, at-least-once delivery with consumer-side idempotency). Its
parameters are illustrative and were chosen for a readable demo, not taken from any production
system.

## Architecture

- `src/lib/sim/engine.ts` is pure: `createInitialState`, `applyCommand`, `advance` (by a
  number of simulated milliseconds), `step` (to the next scheduled moment, or by 250 ms when
  nothing is scheduled) and `nextScheduledAt`. No randomness, no timers, no DOM, no crypto.
  Every transition is a typed function of the previous state; states are never mutated
  (unchanged deliveries and subscribers keep their identity). Selectors: `listDeliveries`,
  `deliveriesFor`, `deadLetters`, `outstanding`, `pendingFor`, `tokensNow`, `summary`. The file
  opens with a README-style comment stating the transition rules.
- `src/lib/sim/types.ts` holds the state shape and the command union
  (`send | burst | setHealth | restore | replay | reset | loadPreset`).
- `src/lib/sim/config.ts` holds the defaults below, `describeConfig` (which renders the
  parameter table on the page from the same object) and the disclaimer string.
- `src/lib/sim/presets.ts` holds guided scenarios as scripted command lists on the simulated
  clock, each with a plain-English explanation. `src/lib/sim/format.ts` holds shared formatting.
- `src/lib/crypto/hmac.ts` is a separate module that uses Web Crypto; the engine never imports it.
- The React UI in `src/components/lab/` holds one engine state, advances it from a
  requestAnimationFrame loop scaled by an accelerated-time factor (×1 to ×16, default ×4), and
  derives every counter, badge, log line and animation from that state. Pausing stops the
  clock; stepping pauses and advances to the next scheduled moment. `WebhookLab` is the
  container; `Pipeline` draws the SVG; `HmacDemo` and `TextualState` are self-contained.

## Model

Three fixed synthetic subscribers, A, B and C, each with a synthetic endpoint name. Sending an
event creates one delivery per subscriber.

Delivery states: `queued` → `processing` → `delivered`, or `processing` → `retry-scheduled`
→ (back to `queued`, then `processing`, when due), or `processing` → `dead-letter` when a
budget is exhausted.

Queue order: the queue is ordered by delivery age. A retry that becomes due rejoins it ahead
of anything created after it, so older deliveries finish first and a retry never waits behind
a fresh burst. Dispatch scans the queue oldest first and skips deliveries that are not eligible
(open circuit, probe in flight, or no rate-limit token) rather than failing them, which is why
B and C keep flowing while A struggles.

Circuit states per subscriber: `closed` (normal), `open` (no attempts until the cooldown
elapses; waiting deliveries are parked, not failed), `half-open` (exactly one probe attempt is
allowed; a response closes the circuit, a failure or timeout re-opens it). Any response,
200 or 429, resets the consecutive-failure count: a 429 proves the subscriber is alive, so a
429 on a probe also closes the circuit and the deferred delivery then waits for Retry-After.
Restoring a subscriber's health never closes its circuit; only a probe does.

Attempt accounting: only real simulated requests are attempts. Waiting on an open circuit or on
the local rate limiter never consumes anything. Failures (simulated 5xx or timeout) consume the
failure budget; simulated 429 responses schedule a retry at exactly `Retry-After` and consume a
separate, smaller deferral budget so nothing loops forever. A budget of N means N retries may
be scheduled; the next failure (or 429) dead-letters the delivery.

Outcomes are decided by the subscriber's health when the attempt completes: `healthy` answers
200; `failing` answers 503; `rate-limited` answers 429 with its Retry-After; `timeout` applies
the effect at the consumer but loses the response, so the sender sees a failure.

Consumer-side idempotency: each subscriber remembers the idempotency keys it has processed. A
duplicate delivery of an already-applied event is acknowledged with 200 but applies no new
business effect; the counter `duplicatesIgnored` increments instead of `effectsApplied`. This is
how the lab demonstrates at-least-once delivery rather than exactly-once. (While responses are
still being lost, a repeat is ignored at the consumer and still times out for the sender.)

Replay: replaying a dead-lettered delivery creates a new delivery that records `replayOf`. The
original delivery and its attempt history are never mutated. Replays join the back of the queue
and count against the queue bound.

## Illustrative parameters (defaults)

| Parameter | Value | Note |
| --- | --- | --- |
| Workers | 2 concurrent attempts | Healthy subscribers keep flowing while one fails |
| Attempt latency | 300 ms simulated | Time a delivery spends in `processing` |
| Failure budget | 4 failures, so 5 attempts at most | Then `dead-letter` |
| Backoff | 500 ms × 2^(failures - 1), capped at 8 s | Exponential, bounded, no jitter |
| 429 deferrals | 6 per delivery | Retries exactly at `Retry-After` (default 4 s) |
| Circuit threshold | 3 consecutive failures | Opens the subscriber's circuit |
| Circuit cooldown | 6 s | Then one half-open probe |
| Local rate limit | 3 tokens, refill 1 per second | Token bucket per subscriber |
| Queue bound | 200 deliveries | Outstanding (queued, processing or retry-scheduled); further sends are rejected with a log line |
| Burst bound | 25 events | Per burst command; larger requests are clamped with a log line |
| Log bound | 300 entries | Ring buffer |
| History bound | 20 attempts per delivery | Oldest attempts are dropped |

Accelerated time: the UI advances the simulated clock faster than wall-clock time and says so
next to the clock ("Simulated time, ×N"). Frames longer than 250 ms of wall time (a background
tab) are clamped so the clock never leaps.

## HMAC demonstration

`signPayload(secret, timestamp, body)` computes `HMAC-SHA256(secret, timestamp + "." + body)`
and returns `t=<timestamp>,v1=<hex>`; timestamps are Unix milliseconds. `verifySignature`
checks the timestamp against a tolerance (default five minutes) first, then recomputes the
digest and compares it in constant time. The key shown in the lab is a public, demo-only value.
Editing the payload after signing makes verification fail; that is the point of the
demonstration. The lab also lets the reader age the timestamp beyond the tolerance.

## Tests

`tests/unit/sim/engine.test.ts` drives the engine with a controlled clock and covers: retries
and backoff, dead-lettering, circuit open/half-open/close transitions (including the exact
cooldown timings and the single probe), rate limiting without attempt consumption, Retry-After
honoured exactly, deferral-budget dead-lettering, timeouts with duplicates ignored, idempotent
replays that never mutate the original, bounded queues, bursts, logs and histories, healthy
subscribers not starving while A fails, age-ordered retries, determinism (same commands, same
states; the result does not depend on how the clock is sliced) and input immutability.
`tests/unit/sim/presets.test.ts` plays each guided scenario and checks the story it tells.
`tests/unit/hmac.test.ts` covers signing (cross-checked against Node's `crypto`), verification,
tampering, key mismatch, malformed headers and timestamp tolerance.
