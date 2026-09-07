"use client";

import { useMemo } from "react";
import { deadLetters, tokensNow } from "@/lib/sim/engine";
import { formatMs } from "@/lib/sim/format";
import { SUBSCRIBER_IDS, type CircuitState, type SimState, type SubscriberHealth, type SubscriberId } from "@/lib/sim/types";
import { circuitLabel, circuitTone, healthTone, type Tone } from "./bits";

/* ------------------------------------------------------------------ */
/* Model: everything the drawing needs, derived from the engine state   */
/* ------------------------------------------------------------------ */

interface WorkerSlot {
  index: number;
  deliveryId: string | null;
  subscriberId: SubscriberId | null;
  probe: boolean;
}

interface SubscriberNode {
  id: SubscriberId;
  name: string;
  health: SubscriberHealth;
  circuit: CircuitState;
  cooldownLeftMs: number | null;
  tokens: number;
  capacity: number;
  delivered: number;
  deadLettered: number;
  waiting: number;
  inFlight: boolean;
  recentDeadLetter: boolean;
}

export interface PipelineModel {
  eventsSent: number;
  queued: number;
  retrying: number;
  processing: number;
  deadLettered: number;
  recentSend: boolean;
  workers: WorkerSlot[];
  subscribers: SubscriberNode[];
}

const RECENT_SEND_MS = 900;
const RECENT_DEAD_MS = 1800;

export function buildPipelineModel(state: SimState): PipelineModel {
  const lastEventId = state.seq.events > 0 ? `evt-${String(state.seq.events).padStart(4, "0")}` : null;
  const lastEvent = lastEventId ? state.events[lastEventId] : undefined;
  const recentSend = Boolean(lastEvent && state.now - lastEvent.createdAt <= RECENT_SEND_MS);

  const workers: WorkerSlot[] = [];
  for (let i = 0; i < state.config.workers; i += 1) {
    const flight = state.inFlight.find((f) => f.worker === i);
    workers.push({
      index: i,
      deliveryId: flight?.deliveryId ?? null,
      subscriberId: flight?.subscriberId ?? null,
      probe: flight?.probe ?? false,
    });
  }

  const waiting: Record<SubscriberId, number> = { A: 0, B: 0, C: 0 };
  for (const id of state.queue) waiting[state.deliveries[id].subscriberId] += 1;
  for (const id of state.retries) waiting[state.deliveries[id].subscriberId] += 1;

  const recentDead: Record<SubscriberId, boolean> = { A: false, B: false, C: false };
  const dead = deadLetters(state);
  for (const d of dead) {
    if (d.completedAt !== undefined && state.now - d.completedAt <= RECENT_DEAD_MS) recentDead[d.subscriberId] = true;
  }

  const subscribers = SUBSCRIBER_IDS.map((id): SubscriberNode => {
    const s = state.subscribers[id];
    const cooldownLeftMs =
      s.circuit.state === "open" && s.circuit.openedAt !== null
        ? Math.max(0, s.circuit.openedAt + state.config.circuitCooldownMs - state.now)
        : null;
    return {
      id,
      name: s.name,
      health: s.health,
      circuit: s.circuit.state,
      cooldownLeftMs,
      tokens: tokensNow(state, id),
      capacity: s.rateLimit.capacity,
      delivered: s.delivered,
      deadLettered: s.deadLettered,
      waiting: waiting[id],
      inFlight: state.inFlight.some((f) => f.subscriberId === id),
      recentDeadLetter: recentDead[id],
    };
  });

  return {
    eventsSent: state.counters.eventsSent,
    queued: state.queue.length,
    retrying: state.retries.length,
    processing: state.inFlight.length,
    deadLettered: dead.length,
    recentSend,
    workers,
    subscribers,
  };
}

/* ------------------------------------------------------------------ */
/* Drawing helpers                                                     */
/* ------------------------------------------------------------------ */

const TONE_VAR: Record<Tone, string> = {
  signal: "var(--color-signal)",
  danger: "var(--color-danger)",
  amber: "var(--color-amber)",
  muted: "var(--color-silver-3)",
  neutral: "var(--color-lumen)",
};

function Pulse({ path, tone, dur = "1.2s", delay = "0s" }: { path: string; tone: Tone; dur?: string; delay?: string }) {
  return (
    <circle r={3.2} fill={TONE_VAR[tone]} opacity={0.95}>
      <animateMotion dur={dur} begin={delay} repeatCount="indefinite" path={path} />
    </circle>
  );
}

function Edge({ d, active, tone = "muted" }: { d: string; active?: boolean; tone?: Tone }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={active ? TONE_VAR[tone] : "var(--line-strong)"}
      strokeOpacity={active ? 0.55 : 1}
      strokeWidth={1.25}
    />
  );
}

function Box({
  x,
  y,
  w,
  h,
  tone,
  emphasis = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: Tone;
  emphasis?: boolean;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={10}
      fill="var(--color-graphite-2)"
      stroke={tone ? TONE_VAR[tone] : "var(--line)"}
      strokeOpacity={tone ? (emphasis ? 0.9 : 0.45) : 1}
      strokeWidth={1}
    />
  );
}

function Label({
  x,
  y,
  children,
  size = 12,
  tone,
  weight = 500,
  anchor = "start",
  muted = false,
}: {
  x: number;
  y: number;
  children: string;
  size?: number;
  tone?: Tone;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  muted?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      fill={tone ? TONE_VAR[tone] : muted ? "var(--color-silver-2)" : "var(--color-lumen)"}
      style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}
    >
      {children}
    </text>
  );
}

function Tokens({ x, y, tokens, capacity, gap = 10 }: { x: number; y: number; tokens: number; capacity: number; gap?: number }) {
  return (
    <g>
      {Array.from({ length: capacity }, (_, i) => (
        <circle
          key={i}
          cx={x + i * gap}
          cy={y}
          r={3}
          fill={i < tokens ? "var(--color-signal)" : "transparent"}
          stroke={i < tokens ? "var(--color-signal)" : "var(--color-silver-3)"}
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

function QueueBars({ x, y, count, max, width }: { x: number; y: number; count: number; max: number; width: number }) {
  const shown = Math.min(count, max);
  const step = width / max;
  return (
    <g>
      {Array.from({ length: max }, (_, i) => (
        <rect
          key={i}
          x={x + i * step}
          y={y}
          width={Math.max(2, step - 3)}
          height={12}
          rx={1.5}
          fill={i < shown ? "var(--color-silver)" : "var(--color-graphite-3)"}
          opacity={i < shown ? 0.85 : 1}
        />
      ))}
    </g>
  );
}

function workerText(slot: WorkerSlot): string {
  if (!slot.deliveryId) return `W${slot.index + 1}  idle`;
  return `W${slot.index + 1}  ${slot.deliveryId} → ${slot.subscriberId}${slot.probe ? " (probe)" : ""}`;
}

/** Short health labels that fit the diagram boxes; the cards carry the full wording. */
function healthShort(health: SubscriberHealth): string {
  switch (health) {
    case "healthy":
      return "Healthy";
    case "failing":
      return "Failing · 503";
    case "rate-limited":
      return "Throttling · 429";
    case "timeout":
      return "Lost responses";
  }
}

function subscriberTone(n: SubscriberNode): Tone {
  if (n.circuit === "open") return "danger";
  if (n.circuit === "half-open") return "amber";
  return healthTone(n.health);
}

function circuitText(n: SubscriberNode): string {
  if (n.circuit === "open" && n.cooldownLeftMs !== null) return `Circuit open · probe in ${formatMs(n.cooldownLeftMs)}`;
  if (n.circuit === "half-open") return "Circuit half-open · probing";
  return "Circuit closed";
}

/* ------------------------------------------------------------------ */
/* Horizontal layout (large screens)                                   */
/* ------------------------------------------------------------------ */

function Horizontal({ m, pulses }: { m: PipelineModel; pulses: boolean }) {
  const subY: Record<SubscriberId, number> = { A: 40, B: 148, C: 256 };
  const subH = 72;
  const subX = 720;
  const subW = 240;
  const dlqY = 352;
  const workersOut = { x: 650, y: 184 };
  const pathToSub = (id: SubscriberId) => {
    const cy = subY[id] + subH / 2;
    return `M${workersOut.x} ${workersOut.y} C685 ${workersOut.y}, 685 ${cy}, ${subX} ${cy}`;
  };
  const pathToDlq = (id: SubscriberId) => {
    const cy = subY[id] + subH / 2;
    return `M${subX + subW} ${cy} C994 ${cy}, 994 ${dlqY + 20}, ${subX + subW} ${dlqY + 20}`;
  };
  const sourceToQueue = "M170 184 H240";
  const queueToWorkers = "M410 184 H480";

  return (
    <svg viewBox="0 0 1000 400" className="h-auto w-full" aria-hidden="true" focusable="false">
      {/* Edges */}
      <Edge d={sourceToQueue} active={m.recentSend} tone="signal" />
      <Edge d={queueToWorkers} active={m.processing > 0} tone="signal" />
      {m.subscribers.map((s) => (
        <Edge key={`e-${s.id}`} d={pathToSub(s.id)} active={s.inFlight} tone={subscriberTone(s)} />
      ))}
      {m.subscribers.map((s) => (
        <Edge key={`d-${s.id}`} d={pathToDlq(s.id)} active={s.recentDeadLetter} tone="danger" />
      ))}

      {/* Source */}
      <Box x={20} y={150} w={150} h={68} />
      <Label x={36} y={176} size={12} muted>
        Source
      </Label>
      <Label x={36} y={200} size={13}>
        {`${m.eventsSent} events sent`}
      </Label>

      {/* Queue */}
      <Box x={240} y={134} w={170} h={100} />
      <Label x={256} y={158} size={12} muted>
        Queue
      </Label>
      <Label x={256} y={182} size={13}>
        {`${m.queued} waiting`}
      </Label>
      <Label x={256} y={200} size={11} muted>
        {`${m.retrying} retry-scheduled`}
      </Label>
      <QueueBars x={256} y={210} count={m.queued} max={16} width={138} />

      {/* Workers */}
      <Box x={480} y={124} w={170} h={120} />
      <Label x={496} y={148} size={12} muted>
        Workers
      </Label>
      {m.workers.map((w, i) => (
        <g key={w.index}>
          <rect
            x={494}
            y={160 + i * 36}
            width={142}
            height={28}
            rx={6}
            fill="var(--color-graphite)"
            stroke={w.deliveryId ? "var(--color-signal)" : "var(--line)"}
            strokeOpacity={w.deliveryId ? 0.5 : 1}
          />
          <Label x={504} y={178 + i * 36} size={11} tone={w.deliveryId ? undefined : "muted"}>
            {workerText(w)}
          </Label>
        </g>
      ))}

      {/* Subscribers */}
      {m.subscribers.map((s) => {
        const y = subY[s.id];
        const tone = subscriberTone(s);
        return (
          <g key={s.id}>
            <Box x={subX} y={y} w={subW} h={subH} tone={tone} emphasis={s.circuit !== "closed" || s.health !== "healthy"} />
            <Label x={subX + 14} y={y + 22} size={13}>
              {s.name}
            </Label>
            <Label x={subX + subW - 14} y={y + 22} size={11} anchor="end" tone={healthTone(s.health)}>
              {healthShort(s.health)}
            </Label>
            <Label x={subX + 14} y={y + 42} size={11} tone={circuitTone(s.circuit)}>
              {circuitText(s)}
            </Label>
            <Tokens x={subX + 18} y={y + 58} tokens={s.tokens} capacity={s.capacity} />
            <Label x={subX + subW - 14} y={y + 61} size={11} anchor="end" muted>
              {`${s.delivered} ok · ${s.waiting} waiting`}
            </Label>
          </g>
        );
      })}

      {/* Dead-letter queue */}
      <Box x={subX} y={dlqY} w={subW} h={40} tone={m.deadLettered > 0 ? "danger" : undefined} emphasis={m.deadLettered > 0} />
      <Label x={subX + 14} y={dlqY + 25} size={12} muted>
        Dead-letter queue
      </Label>
      <Label x={subX + subW - 14} y={dlqY + 25} size={13} anchor="end" tone={m.deadLettered > 0 ? "danger" : undefined}>
        {String(m.deadLettered)}
      </Label>

      {/* Pulses: decorative, motion only */}
      {pulses ? (
        <g>
          {m.recentSend ? <Pulse path={sourceToQueue} tone="signal" dur="0.9s" /> : null}
          {m.processing > 0 ? <Pulse path={queueToWorkers} tone="signal" dur="0.9s" /> : null}
          {m.subscribers.map((s) =>
            s.inFlight ? <Pulse key={`p-${s.id}`} path={pathToSub(s.id)} tone={subscriberTone(s)} /> : null,
          )}
          {m.subscribers.map((s) =>
            s.recentDeadLetter ? <Pulse key={`q-${s.id}`} path={pathToDlq(s.id)} tone="danger" dur="1.4s" /> : null,
          )}
        </g>
      ) : null}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Vertical layout (narrow screens)                                    */
/* ------------------------------------------------------------------ */

function Vertical({ m, pulses }: { m: PipelineModel; pulses: boolean }) {
  const subX: Record<SubscriberId, number> = { A: 20, B: 130, C: 240 };
  const subY = 340;
  const subW = 100;
  const subH = 152;
  const dlqY = 548;
  const centre = (id: SubscriberId) => subX[id] + subW / 2;
  const pathToSub = (id: SubscriberId) => `M180 288 C180 314, ${centre(id)} 314, ${centre(id)} ${subY}`;
  const pathToDlq = (id: SubscriberId) => `M${centre(id)} ${subY + subH} V${dlqY}`;
  const sourceToQueue = "M180 68 V104";
  const queueToWorkers = "M180 168 V204";

  return (
    <svg viewBox="0 0 360 616" className="h-auto w-full" aria-hidden="true" focusable="false">
      <Edge d={sourceToQueue} active={m.recentSend} tone="signal" />
      <Edge d={queueToWorkers} active={m.processing > 0} tone="signal" />
      {m.subscribers.map((s) => (
        <Edge key={`e-${s.id}`} d={pathToSub(s.id)} active={s.inFlight} tone={subscriberTone(s)} />
      ))}
      {m.subscribers.map((s) => (
        <Edge key={`d-${s.id}`} d={pathToDlq(s.id)} active={s.recentDeadLetter} tone="danger" />
      ))}

      {/* Source */}
      <Box x={20} y={16} w={320} h={52} />
      <Label x={36} y={38} size={12} muted>
        Source
      </Label>
      <Label x={36} y={56} size={13}>
        {`${m.eventsSent} events sent`}
      </Label>

      {/* Queue */}
      <Box x={20} y={104} w={320} h={64} />
      <Label x={36} y={126} size={12} muted>
        Queue
      </Label>
      <Label x={36} y={146} size={13}>
        {`${m.queued} waiting · ${m.retrying} retry-scheduled`}
      </Label>
      <QueueBars x={36} y={152} count={m.queued} max={16} width={288} />

      {/* Workers */}
      <Box x={20} y={204} w={320} h={84} />
      <Label x={36} y={226} size={12} muted>
        Workers
      </Label>
      {m.workers.map((w, i) => (
        <g key={w.index}>
          <rect
            x={36}
            y={236 + i * 24}
            width={288}
            height={20}
            rx={5}
            fill="var(--color-graphite)"
            stroke={w.deliveryId ? "var(--color-signal)" : "var(--line)"}
            strokeOpacity={w.deliveryId ? 0.5 : 1}
          />
          <Label x={46} y={250 + i * 24} size={11} tone={w.deliveryId ? undefined : "muted"}>
            {workerText(w)}
          </Label>
        </g>
      ))}

      {/* Subscribers */}
      {m.subscribers.map((s) => {
        const x = subX[s.id];
        const tone = subscriberTone(s);
        return (
          <g key={s.id}>
            <Box x={x} y={subY} w={subW} h={subH} tone={tone} emphasis={s.circuit !== "closed" || s.health !== "healthy"} />
            <Label x={x + 12} y={subY + 24} size={14}>
              {s.id}
            </Label>
            <Label x={x + 12} y={subY + 46} size={11} tone={healthTone(s.health)}>
              {healthShort(s.health).split(" · ")[0]}
            </Label>
            <Label x={x + 12} y={subY + 66} size={11} tone={circuitTone(s.circuit)}>
              {`${circuitLabel(s.circuit)}${s.cooldownLeftMs !== null ? ` · ${formatMs(s.cooldownLeftMs)}` : ""}`}
            </Label>
            <Tokens x={x + 16} y={subY + 86} tokens={s.tokens} capacity={s.capacity} />
            <Label x={x + 12} y={subY + 112} size={11} muted>
              {`${s.delivered} delivered`}
            </Label>
            <Label x={x + 12} y={subY + 132} size={11} muted>
              {`${s.waiting} waiting`}
            </Label>
          </g>
        );
      })}

      {/* Dead-letter queue */}
      <Box x={20} y={dlqY} w={320} h={48} tone={m.deadLettered > 0 ? "danger" : undefined} emphasis={m.deadLettered > 0} />
      <Label x={36} y={dlqY + 29} size={12} muted>
        Dead-letter queue
      </Label>
      <Label x={324} y={dlqY + 29} size={14} anchor="end" tone={m.deadLettered > 0 ? "danger" : undefined}>
        {String(m.deadLettered)}
      </Label>

      {pulses ? (
        <g>
          {m.recentSend ? <Pulse path={sourceToQueue} tone="signal" dur="0.8s" /> : null}
          {m.processing > 0 ? <Pulse path={queueToWorkers} tone="signal" dur="0.8s" /> : null}
          {m.subscribers.map((s) =>
            s.inFlight ? <Pulse key={`p-${s.id}`} path={pathToSub(s.id)} tone={subscriberTone(s)} dur="1s" /> : null,
          )}
          {m.subscribers.map((s) =>
            s.recentDeadLetter ? <Pulse key={`q-${s.id}`} path={pathToDlq(s.id)} tone="danger" dur="1.2s" /> : null,
          )}
        </g>
      ) : null}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * The pipeline picture. Purely derived from engine state; the text summary in
 * `TextualState` carries the same information for assistive technology, so
 * the drawing is hidden from it. Pulses render only while motion is enabled
 * and the clock is running.
 */
export function Pipeline({ state, motion, running }: { state: SimState; motion: boolean; running: boolean }) {
  const model = useMemo(() => buildPipelineModel(state), [state]);
  const pulses = motion && running;
  return (
    <div className="rounded-2xl border border-line bg-graphite p-3 md:p-5">
      <div className="mx-auto hidden max-w-[70rem] lg:block">
        <Horizontal m={model} pulses={pulses} />
      </div>
      <div className="mx-auto max-w-[26rem] lg:hidden">
        <Vertical m={model} pulses={pulses} />
      </div>
    </div>
  );
}
