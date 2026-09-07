"use client";

import { useId, useMemo, useState } from "react";
import { listDeliveries, refill } from "@/lib/sim/engine";
import { formatClock, formatMs, statusText } from "@/lib/sim/format";
import type { Delivery, SimState, SubscriberId } from "@/lib/sim/types";
import { Badge, Panel, SmallButton, deliveryLabel, deliveryTone, outcomeLabel, outcomeTone } from "./bits";

type SubscriberFilter = "all" | SubscriberId;
type StateFilter = "all" | "active" | "delivered" | "dead-letter" | "replays";

const ROW_LIMIT = 40;

/** Plain-English account of where a delivery is right now. */
export function describeDeliveryNow(d: Delivery, state: SimState): string {
  const sub = state.subscribers[d.subscriberId];
  switch (d.state) {
    case "queued": {
      if (sub.circuit.state === "open") return `Parked: ${sub.name}'s circuit is open.`;
      if (sub.circuit.state === "half-open" && sub.circuit.probeInFlight) return `Parked behind ${sub.name}'s half-open probe.`;
      if (refill(sub.rateLimit, state.now).tokens < 1) return `Waiting for a rate-limit token for ${sub.name}.`;
      return "Queued, waiting for a free worker.";
    }
    case "processing": {
      const flight = state.inFlight.find((f) => f.deliveryId === d.id);
      return flight
        ? `In flight on worker ${flight.worker + 1}${flight.probe ? " as the half-open probe" : ""}, response due at ${formatClock(flight.completesAt)}.`
        : "In flight.";
    }
    case "retry-scheduled":
      return d.nextAttemptAt === null
        ? "Retry scheduled."
        : `Retry scheduled for ${formatClock(d.nextAttemptAt)} (in ${formatMs(Math.max(0, d.nextAttemptAt - state.now))}).`;
    case "delivered":
      return `Delivered at ${formatClock(d.completedAt ?? state.now)} after ${d.attempts} attempt${d.attempts === 1 ? "" : "s"}.`;
    case "dead-letter":
      return `Dead-lettered at ${formatClock(d.completedAt ?? state.now)}: ${d.deadLetterReason ?? "budget exhausted"}.`;
  }
}

function nextCell(d: Delivery, now: number): string {
  switch (d.state) {
    case "queued":
      return "waiting";
    case "processing":
      return "in flight";
    case "retry-scheduled":
      return d.nextAttemptAt === null ? "scheduled" : `in ${formatMs(Math.max(0, d.nextAttemptAt - now))}`;
    case "delivered":
    case "dead-letter":
      return d.completedAt === undefined ? "done" : `at ${formatClock(d.completedAt)}`;
  }
}

function matches(d: Delivery, sub: SubscriberFilter, st: StateFilter): boolean {
  if (sub !== "all" && d.subscriberId !== sub) return false;
  switch (st) {
    case "all":
      return true;
    case "active":
      return d.state === "queued" || d.state === "processing" || d.state === "retry-scheduled";
    case "delivered":
      return d.state === "delivered";
    case "dead-letter":
      return d.state === "dead-letter";
    case "replays":
      return Boolean(d.replayOf);
  }
}

function FilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1">
      <span className="eyebrow mr-1">{label}</span>
      {options.map((o) => (
        <SmallButton key={o.value} onClick={() => onChange(o.value)} pressed={value === o.value} className="min-h-7 px-2.5">
          {o.label}
        </SmallButton>
      ))}
    </div>
  );
}

export function DeliveryInspector({
  delivery,
  state,
  onReplay,
}: {
  delivery: Delivery | null;
  state: SimState;
  onReplay: (id: string) => void;
}) {
  if (!delivery) {
    return (
      <Panel title="Inspector" label="select a delivery" className="h-full">
        <p className="text-[0.9rem] leading-relaxed text-silver-2">
          Choose a delivery in the table or the dead-letter queue to read its attempt history in plain English.
        </p>
      </Panel>
    );
  }
  const event = state.events[delivery.eventId];
  const sub = state.subscribers[delivery.subscriberId];
  const replayed = listDeliveries(state).find((d) => d.replayOf === delivery.id);
  return (
    <Panel
      title={delivery.id}
      label={delivery.replayOf ? `replay of ${delivery.replayOf}` : undefined}
      className="h-full"
      actions={
        <>
          <Badge tone={deliveryTone(delivery.state)} dot>
            {deliveryLabel(delivery.state)}
          </Badge>
          {delivery.state === "dead-letter" ? (
            <SmallButton onClick={() => onReplay(delivery.id)} className="border-signal/50 text-signal">
              Replay
            </SmallButton>
          ) : null}
        </>
      }
    >
      <p className="text-[0.9rem] leading-relaxed text-lumen">{describeDeliveryNow(delivery, state)}</p>
      {replayed ? <p className="mono-label mt-2 text-silver-2">Replayed as {replayed.id}.</p> : null}

      <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-line pt-4 text-[0.82rem]">
        <dt className="mono-label text-silver-3">Event</dt>
        <dd className="min-w-0 break-words text-silver">
          {event?.type} · {event?.id}
        </dd>
        <dt className="mono-label text-silver-3">Key</dt>
        <dd className="min-w-0 break-all font-mono text-[0.78rem] text-silver">{event?.idempotencyKey}</dd>
        <dt className="mono-label text-silver-3">To</dt>
        <dd className="min-w-0 break-all text-silver">
          {sub.name} · <span className="font-mono text-[0.78rem]">{sub.endpoint}</span>
        </dd>
        <dt className="mono-label text-silver-3">Created</dt>
        <dd className="text-silver">{formatClock(delivery.createdAt)}</dd>
        <dt className="mono-label text-silver-3">Budgets</dt>
        <dd className="text-silver">
          {delivery.attempts} attempt{delivery.attempts === 1 ? "" : "s"} · {delivery.failures} failure{delivery.failures === 1 ? "" : "s"} (budget{" "}
          {state.config.failureBudget}) · {delivery.deferrals} deferral{delivery.deferrals === 1 ? "" : "s"} (budget {state.config.deferralBudget})
        </dd>
        {delivery.deadLetterReason ? (
          <>
            <dt className="mono-label text-silver-3">Reason</dt>
            <dd className="text-danger">{delivery.deadLetterReason}</dd>
          </>
        ) : null}
      </dl>

      <h4 className="eyebrow mt-5 border-t border-line pt-4">Attempt history</h4>
      {delivery.history.length === 0 ? (
        <p className="mt-2 text-[0.85rem] text-silver-2">No attempt has completed yet.</p>
      ) : (
        <ol className="mt-2 space-y-3">
          {delivery.history.map((a) => (
            <li key={a.n} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-[0.85rem]">
              <div className="flex flex-col items-start gap-1">
                <span className="mono-label text-silver-3">#{a.n}</span>
                <Badge tone={outcomeTone(a.outcome)} className="px-1.5">
                  {outcomeLabel(a.outcome)}
                </Badge>
              </div>
              <div className="min-w-0">
                <p className="mono-label text-silver-3">
                  {formatClock(a.startedAt)} to {formatClock(a.completedAt)} · {statusText(a.status)}
                  {a.probe ? " · half-open probe" : ""}
                </p>
                <p className="mt-1 leading-relaxed text-silver">{a.note}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {delivery.attempts > delivery.history.length ? (
        <p className="mono-label mt-3 text-silver-3">
          Showing the last {delivery.history.length} of {delivery.attempts} attempts (history bound {state.config.historyBound}).
        </p>
      ) : null}
    </Panel>
  );
}

export function Deliveries({
  state,
  selectedId,
  onSelect,
}: {
  state: SimState;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const id = useId();
  const [subFilter, setSubFilter] = useState<SubscriberFilter>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");

  const { rows, total } = useMemo(() => {
    const all = listDeliveries(state);
    const filtered = all.filter((d) => matches(d, subFilter, stateFilter));
    return { rows: filtered.slice(-ROW_LIMIT).reverse(), total: filtered.length };
  }, [state, subFilter, stateFilter]);

  return (
    <Panel
      title="Deliveries"
      headingId={`${id}-heading`}
      label={total > ROW_LIMIT ? `newest ${ROW_LIMIT} of ${total}` : `${total} shown`}
      bodyClassName="px-0 md:px-0 pb-0"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-3 md:px-5">
        <FilterGroup<SubscriberFilter>
          label="Subscriber"
          value={subFilter}
          onChange={setSubFilter}
          options={[
            { value: "all", label: "All" },
            { value: "A", label: "A" },
            { value: "B", label: "B" },
            { value: "C", label: "C" },
          ]}
        />
        <FilterGroup<StateFilter>
          label="State"
          value={stateFilter}
          onChange={setStateFilter}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "delivered", label: "Delivered" },
            { value: "dead-letter", label: "Dead letters" },
            { value: "replays", label: "Replays" },
          ]}
        />
      </div>
      <div className="max-h-[34rem] overflow-auto border-t border-line">
        <table className="w-full border-collapse text-[0.82rem]">
          <thead>
            <tr className="text-left">
              <th scope="col" className="eyebrow px-4 py-2 font-medium md:px-5">
                Delivery
              </th>
              <th scope="col" className="eyebrow hidden px-2 py-2 font-medium md:table-cell">
                Event
              </th>
              <th scope="col" className="eyebrow px-2 py-2 font-medium">
                To
              </th>
              <th scope="col" className="eyebrow px-2 py-2 font-medium">
                State
              </th>
              <th scope="col" className="eyebrow px-2 py-2 font-medium">
                <abbr title="Attempts, failures, deferrals" className="no-underline">
                  <span className="sm:hidden">A · F · D</span>
                  <span className="hidden sm:inline">Att · fail · def</span>
                </abbr>
              </th>
              <th scope="col" className="eyebrow hidden px-2 py-2 pr-4 font-medium sm:table-cell md:pr-5">
                Next
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-silver-2 md:px-5">
                  No deliveries match. Send an event to begin.
                </td>
              </tr>
            ) : (
              rows.map((d) => {
                const selected = d.id === selectedId;
                const event = state.events[d.eventId];
                return (
                  <tr
                    key={d.id}
                    className={`border-t border-line transition-colors ${selected ? "bg-graphite-2" : "hover:bg-graphite-2/60"}`}
                  >
                    <td className="px-4 py-1.5 md:px-5">
                      <button
                        type="button"
                        onClick={() => onSelect(d.id)}
                        aria-pressed={selected}
                        className={`inline-block min-h-6 py-0.5 font-mono text-[0.78rem] underline-offset-4 hover:underline ${selected ? "text-signal" : "text-lumen"}`}
                      >
                        {d.id}
                      </button>
                      {d.replayOf ? <span className="mono-label ml-1.5 text-silver-3">replay</span> : null}
                    </td>
                    <td className="hidden px-2 py-1.5 text-silver-2 md:table-cell">{event?.type}</td>
                    <td className="px-2 py-1.5 font-mono text-[0.78rem] text-silver">{d.subscriberId}</td>
                    <td className="px-2 py-1.5">
                      <Badge tone={deliveryTone(d.state)} className="px-1.5">
                        {deliveryLabel(d.state)}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[0.78rem] tabular-nums text-silver">
                      {d.attempts} · {d.failures} · {d.deferrals}
                    </td>
                    <td className="hidden px-2 py-1.5 pr-4 font-mono text-[0.78rem] tabular-nums text-silver-2 sm:table-cell md:pr-5">
                      {nextCell(d, state.now)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
