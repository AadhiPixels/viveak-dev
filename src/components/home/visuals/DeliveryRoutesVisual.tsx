/**
 * Conceptual illustration for the external API platform chapter: events fan out
 * from a source through a queue and workers to three subscribers, with a
 * dead-letter queue for exhausted deliveries. Luminous routes echo the
 * signature sculpture. Not a diagram of any employer's systems.
 *
 * Two authored layouts: `wide` for landscape columns and `tall` for portrait
 * screens (a vertical flow with readable labels). Paths carry `data-draw` so
 * the chapter can draw them on scroll; nodes carry `data-node`. With `motion`
 * false everything renders fully drawn and static.
 */

type Tone = "signal" | "amber" | "muted";

interface Node {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub: string;
  tone?: Tone;
}

interface Layout {
  viewBox: string;
  routes: { d: string; kind: "main" | "branch" | "dead" }[];
  nodes: Node[];
  note: { x: number; y: number; text: string; anchor?: "start" | "end" };
  fontScale: number;
}

const WIDE: Layout = {
  viewBox: "0 0 800 540",
  fontScale: 1,
  routes: [
    { d: "M 92 262 C 150 262, 170 262, 232 262", kind: "main" },
    { d: "M 318 262 C 360 262, 372 208, 414 208", kind: "main" },
    { d: "M 318 262 C 360 262, 372 316, 414 316", kind: "main" },
    { d: "M 486 208 C 560 208, 560 124, 636 124", kind: "branch" },
    { d: "M 486 208 C 560 208, 560 262, 636 262", kind: "branch" },
    { d: "M 486 316 C 560 316, 560 262, 636 262", kind: "branch" },
    { d: "M 486 316 C 560 316, 560 400, 636 400", kind: "branch" },
    { d: "M 450 340 C 450 400, 450 440, 450 470", kind: "dead" },
  ],
  nodes: [
    { id: "source", x: 20, y: 236, w: 72, h: 52, label: "Event source", sub: "reservation.confirmed" },
    { id: "queue", x: 232, y: 232, w: 86, h: 60, label: "Queue", sub: "ordered by age" },
    { id: "worker-a", x: 414, y: 188, w: 72, h: 40, label: "Worker", sub: "" },
    { id: "worker-b", x: 414, y: 296, w: 72, h: 40, label: "Worker", sub: "" },
    { id: "sub-a", x: 636, y: 98, w: 150, h: 52, label: "Subscriber A", sub: "closed · 200", tone: "signal" },
    { id: "sub-b", x: 636, y: 236, w: 150, h: 52, label: "Subscriber B", sub: "half-open · probe", tone: "amber" },
    { id: "sub-c", x: 636, y: 374, w: 150, h: 52, label: "Subscriber C", sub: "closed · 200", tone: "signal" },
    { id: "dlq", x: 392, y: 470, w: 116, h: 44, label: "Dead-letter queue", sub: "1 parked · replay", tone: "muted" },
  ],
  note: { x: 530, y: 470, text: "retries · backoff · per-subscription circuits" },
};

const TALL: Layout = {
  viewBox: "0 0 400 860",
  fontScale: 1.25,
  routes: [
    { d: "M 200 96 C 200 130, 200 140, 200 170", kind: "main" },
    { d: "M 200 250 C 200 290, 110 290, 110 330", kind: "main" },
    { d: "M 200 250 C 200 290, 290 290, 290 330", kind: "main" },
    { d: "M 110 386 C 110 430, 200 430, 200 470", kind: "branch" },
    { d: "M 290 386 C 290 430, 200 430, 200 470", kind: "branch" },
    { d: "M 200 530 C 200 560, 200 570, 200 590", kind: "branch" },
    { d: "M 200 650 C 200 680, 200 690, 200 710", kind: "branch" },
    { d: "M 330 358 C 360 358, 372 400, 372 470 L 372 700", kind: "dead" },
  ],
  nodes: [
    { id: "source", x: 120, y: 40, w: 160, h: 56, label: "Event source", sub: "reservation.confirmed" },
    { id: "queue", x: 120, y: 170, w: 160, h: 80, label: "Queue", sub: "ordered by age" },
    { id: "worker-a", x: 60, y: 330, w: 100, h: 56, label: "Worker", sub: "" },
    { id: "worker-b", x: 240, y: 330, w: 100, h: 56, label: "Worker", sub: "" },
    { id: "sub-a", x: 60, y: 470, w: 280, h: 60, label: "Subscriber A", sub: "closed · 200", tone: "signal" },
    { id: "sub-b", x: 60, y: 590, w: 280, h: 60, label: "Subscriber B", sub: "half-open · probe", tone: "amber" },
    { id: "sub-c", x: 60, y: 710, w: 280, h: 60, label: "Subscriber C", sub: "closed · 200", tone: "signal" },
    { id: "dlq", x: 200, y: 800, w: 190, h: 52, label: "Dead-letter queue", sub: "1 parked · replay", tone: "muted" },
  ],
  note: { x: 20, y: 830, text: "retries · backoff · circuits" },
};

const TONE_STROKE: Record<Tone, string> = {
  signal: "var(--color-signal)",
  amber: "var(--color-amber)",
  muted: "var(--color-silver-3)",
};

function Drawing({
  layout,
  motion,
  light,
  className,
}: {
  layout: Layout;
  motion: boolean;
  light: boolean;
  className: string;
}) {
  const ink = light ? "var(--color-ink)" : "var(--color-lumen)";
  const faint = light ? "rgba(5,5,7,0.18)" : "rgba(255,255,255,0.14)";
  const panel = light ? "rgba(255,255,255,0.8)" : "rgba(22,24,29,0.92)";
  const fs = layout.fontScale;
  return (
    <svg
      viewBox={layout.viewBox}
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label="Conceptual illustration: events flow from a source through a queue and two workers to three subscribers, each with its own circuit, with a dead-letter queue for exhausted deliveries."
      data-visual="delivery-routes"
    >
      {layout.routes.map((r, i) => (
        <path
          key={`halo-${i}`}
          d={r.d}
          fill="none"
          stroke={r.kind === "dead" ? "var(--color-silver-3)" : "var(--color-signal)"}
          strokeOpacity={r.kind === "dead" ? 0.12 : 0.18}
          strokeWidth={r.kind === "main" ? 9 : 7}
          strokeLinecap="round"
          data-draw
          pathLength={1}
        />
      ))}
      {layout.routes.map((r, i) => (
        <path
          key={`route-${i}`}
          d={r.d}
          fill="none"
          stroke={r.kind === "dead" ? "var(--color-silver-3)" : "var(--color-signal)"}
          strokeOpacity={r.kind === "dead" ? 0.7 : 1}
          strokeWidth={r.kind === "main" ? 2.2 : 1.6}
          strokeDasharray={r.kind === "dead" ? "4 6" : undefined}
          strokeLinecap="round"
          data-draw
          pathLength={1}
        />
      ))}
      {motion
        ? layout.routes
            .filter((r) => r.kind !== "dead")
            .map((r, i) => (
              <circle key={`pulse-${i}`} r="3.2" fill="#d9fff6">
                <animateMotion dur={`${2.4 + (i % 3) * 0.5}s`} begin={`${(i * 0.45).toFixed(2)}s`} repeatCount="indefinite" path={r.d} />
              </circle>
            ))
        : null}
      {layout.nodes.map((n) => (
        <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
          <g data-node>
          <rect width={n.w} height={n.h} rx="10" fill={panel} stroke={faint} />
          {n.tone ? (
            <rect x="0.5" y="0.5" width={n.w - 1} height={n.h - 1} rx="9.5" fill="none" stroke={TONE_STROKE[n.tone]} strokeOpacity="0.9" />
          ) : null}
          <text
            x={12 * fs}
            y={n.sub ? 22 * fs : n.h / 2 + 4 * fs}
            fill={ink}
            fontFamily="var(--font-sans)"
            fontSize={12.5 * fs}
            fontWeight="500"
          >
            {n.label}
          </text>
          {n.sub ? (
            <text
              x={12 * fs}
              y={n.h - 12 * fs}
              fill={n.tone ? TONE_STROKE[n.tone] : light ? "#5b5f69" : "var(--color-silver-2)"}
              fontFamily="var(--font-mono)"
              fontSize={10.5 * fs}
            >
              {n.sub}
            </text>
          ) : null}
          {n.tone && n.tone !== "muted" ? <circle cx={n.w - 16} cy={16} r="3.5" fill={TONE_STROKE[n.tone]} /> : null}
          </g>
        </g>
      ))}
      <text
        x={layout.note.x}
        y={layout.note.y}
        textAnchor={layout.note.anchor ?? "start"}
        fill={light ? "#5b5f69" : "var(--color-silver-3)"}
        fontFamily="var(--font-mono)"
        fontSize={10.5 * fs}
      >
        {layout.note.text}
      </text>
    </svg>
  );
}

export function DeliveryRoutesVisual({
  motion = false,
  className = "",
  light = false,
  layout = "responsive",
}: {
  motion?: boolean;
  className?: string;
  /** Light variant for warm-white surfaces (case-study pages use dark). */
  light?: boolean;
  /** `responsive` switches at the lg breakpoint; force one layout otherwise. */
  layout?: "responsive" | "wide" | "tall";
}) {
  if (layout === "wide") return <Drawing layout={WIDE} motion={motion} light={light} className={className} />;
  if (layout === "tall") return <Drawing layout={TALL} motion={motion} light={light} className={className} />;
  return (
    <>
      <Drawing layout={WIDE} motion={motion} light={light} className={`hidden lg:block ${className}`} />
      <Drawing layout={TALL} motion={motion} light={light} className={`mx-auto max-w-[26rem] lg:hidden ${className}`} />
    </>
  );
}
