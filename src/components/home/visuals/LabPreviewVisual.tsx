/**
 * Lightweight illustrative preview of the webhook-delivery lab for the
 * homepage. It shares the lab's visual language (source, queue, workers,
 * subscribers, dead-letter queue) but is a static SVG with optional ambient
 * pulses; the working simulation with its own state model lives on the lab
 * page. Nothing here is driven by scroll. Two authored layouts: wide and tall.
 */

interface Node {
  x: number;
  y: number;
  w: number;
  h: number;
  l: string;
  s: string;
  tone?: string;
  blink?: boolean;
}

interface Layout {
  viewBox: string;
  routes: string[];
  failing: number[];
  dead: string;
  nodes: Node[];
  fs: number;
}

const WIDE: Layout = {
  viewBox: "0 0 800 380",
  fs: 1,
  routes: [
    "M 96 200 C 150 200, 160 200, 214 200",
    "M 298 200 C 340 200, 350 150, 392 150",
    "M 298 200 C 340 200, 350 250, 392 250",
    "M 462 150 C 530 150, 530 90, 598 90",
    "M 462 150 C 530 150, 530 200, 598 200",
    "M 462 250 C 530 250, 530 200, 598 200",
    "M 462 250 C 530 250, 530 310, 598 310",
  ],
  failing: [4, 5],
  dead: "M 427 270 C 427 300, 427 320, 427 336",
  nodes: [
    { x: 24, y: 176, w: 72, h: 48, l: "Event source", s: "send · burst" },
    { x: 214, y: 172, w: 84, h: 56, l: "Queue", s: "bounded" },
    { x: 392, y: 132, w: 70, h: 36, l: "Worker", s: "" },
    { x: 392, y: 232, w: 70, h: 36, l: "Worker", s: "" },
    { x: 598, y: 66, w: 172, h: 48, l: "Subscriber A", s: "healthy · 200", tone: "var(--color-signal)" },
    { x: 598, y: 176, w: 172, h: 48, l: "Subscriber B", s: "503 · retry in 2 s", tone: "var(--color-danger)", blink: true },
    { x: 598, y: 286, w: 172, h: 48, l: "Subscriber C", s: "healthy · 200", tone: "var(--color-signal)" },
    { x: 366, y: 336, w: 122, h: 36, l: "Dead-letter queue", s: "" },
  ],
};

const TALL: Layout = {
  viewBox: "0 0 400 720",
  fs: 1.2,
  routes: [
    "M 200 88 C 200 120, 200 130, 200 160",
    "M 200 236 C 200 270, 110 270, 110 310",
    "M 200 236 C 200 270, 290 270, 290 310",
    "M 110 366 C 110 400, 200 400, 200 430",
    "M 290 366 C 290 400, 200 400, 200 430",
    "M 200 490 C 200 515, 200 525, 200 550",
    "M 200 610 C 200 630, 200 640, 200 660",
  ],
  failing: [5],
  dead: "M 340 340 C 372 340, 372 380, 372 440 L 372 630",
  nodes: [
    { x: 120, y: 36, w: 160, h: 52, l: "Event source", s: "send · burst" },
    { x: 120, y: 160, w: 160, h: 76, l: "Queue", s: "bounded" },
    { x: 60, y: 310, w: 100, h: 56, l: "Worker", s: "" },
    { x: 240, y: 310, w: 100, h: 56, l: "Worker", s: "" },
    { x: 60, y: 430, w: 280, h: 60, l: "Subscriber A", s: "healthy · 200", tone: "var(--color-signal)" },
    { x: 60, y: 550, w: 280, h: 60, l: "Subscriber B", s: "503 · retry in 2 s", tone: "var(--color-danger)", blink: true },
    { x: 60, y: 660, w: 280, h: 52, l: "Subscriber C", s: "healthy · 200", tone: "var(--color-signal)" },
    { x: 246, y: 630, w: 0, h: 0, l: "", s: "" },
  ],
};

function Drawing({ layout, motion, className }: { layout: Layout; motion: boolean; className: string }) {
  const fs = layout.fs;
  return (
    <svg
      viewBox={layout.viewBox}
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label="Illustration of the webhook-delivery lab: events pass through a queue and workers to three subscribers, one of which is failing and retrying, with a dead-letter queue."
      data-visual="lab-preview"
    >
      <defs>
        <style>{`
          @keyframes lab-blink { 0%, 45% { opacity: 1 } 50%, 95% { opacity: 0.25 } 100% { opacity: 1 } }
          [data-blink] { animation: lab-blink 2.4s ease-in-out infinite; }
        `}</style>
      </defs>
      {layout.routes.map((d, i) => (
        <path key={`h-${i}`} d={d} fill="none" stroke="var(--color-signal)" strokeOpacity="0.16" strokeWidth="8" strokeLinecap="round" />
      ))}
      {layout.routes.map((d, i) => {
        const failing = layout.failing.includes(i);
        return (
          <path key={`r-${i}`} d={d} fill="none" stroke={failing ? "var(--color-danger)" : "var(--color-signal)"} strokeOpacity={failing ? 0.85 : 1} strokeWidth="1.8" strokeLinecap="round" />
        );
      })}
      <path d={layout.dead} fill="none" stroke="var(--color-silver-3)" strokeDasharray="4 6" strokeWidth="1.6" />
      {motion
        ? layout.routes.map((d, i) =>
            layout.failing.includes(i) ? null : (
              <circle key={`p-${i}`} r="3" fill="#d9fff6">
                <animateMotion dur={`${2.2 + (i % 3) * 0.4}s`} begin={`${(i * 0.4).toFixed(2)}s`} repeatCount="indefinite" path={d} />
              </circle>
            ),
          )
        : null}
      {layout.nodes
        .filter((n) => n.w > 0)
        .map((n) => (
          <g key={`${n.l}-${n.x}-${n.y}`} transform={`translate(${n.x} ${n.y})`}>
            <rect width={n.w} height={n.h} rx="9" fill="rgba(22,24,29,0.94)" stroke="rgba(255,255,255,0.12)" />
            {n.tone ? <rect x="0.5" y="0.5" width={n.w - 1} height={n.h - 1} rx="8.5" fill="none" stroke={n.tone} strokeOpacity="0.8" /> : null}
            <text x={12 * fs} y={n.s ? 20 * fs : n.h / 2 + 4 * fs} fill="var(--color-lumen)" fontFamily="var(--font-sans)" fontSize={12 * fs} fontWeight="500">
              {n.l}
            </text>
            {n.s ? (
              <text x={12 * fs} y={n.h - 11 * fs} fill={n.tone ?? "var(--color-silver-2)"} fontFamily="var(--font-mono)" fontSize={10.5 * fs} data-blink={n.blink && motion ? "" : undefined}>
                {n.s}
              </text>
            ) : null}
            {n.tone ? <circle cx={n.w - 14} cy={14} r="3.5" fill={n.tone} data-blink={n.blink && motion ? "" : undefined} /> : null}
          </g>
        ))}
      {layout === TALL ? (
        <text x="372" y="648" textAnchor="middle" fill="var(--color-silver-3)" fontFamily="var(--font-mono)" fontSize="11">
          DLQ
        </text>
      ) : null}
    </svg>
  );
}

export function LabPreviewVisual({
  motion = false,
  className = "",
  layout = "responsive",
}: {
  motion?: boolean;
  className?: string;
  layout?: "responsive" | "wide" | "tall";
}) {
  if (layout === "wide") return <Drawing layout={WIDE} motion={motion} className={className} />;
  if (layout === "tall") return <Drawing layout={TALL} motion={motion} className={className} />;
  return (
    <>
      <Drawing layout={WIDE} motion={motion} className={`hidden lg:block ${className}`} />
      <Drawing layout={TALL} motion={motion} className={`mx-auto max-w-[24rem] lg:hidden ${className}`} />
    </>
  );
}
