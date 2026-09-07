/**
 * Conceptual illustration for the marketing-platform migration chapter:
 * customers keep flowing at a steady rhythm while responsibility hands over
 * from the outgoing platform to the incoming one. `handover` moves the
 * crossover along the flow; the chapter scrubs it on scroll and, with `motion`
 * false, renders the completed handover.
 *
 * Two authored orientations: `wide` (two horizontal rails, flow left to right)
 * and `tall` (two vertical rails, flow top to bottom) for portrait screens.
 */

export type Orientation = "wide" | "tall";

export const FINAL_HANDOVER = 0.72;
const DOTS = 8;

const WIDE = { length: 800, depth: 400, railA: 120, railB: 280, start: 720, travel: 620, bend: 70 };
const TALL = { length: 640, depth: 400, railA: 110, railB: 290, start: 560, travel: 440, bend: 60 };

function geo(o: Orientation) {
  return o === "wide" ? WIDE : TALL;
}

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Position of the crossover along the flow axis for a handover in [0, 1]. */
export function crossoverCentre(handover: number, o: Orientation = "wide") {
  const g = geo(o);
  const h = Math.min(1, Math.max(0, handover));
  return g.start - g.travel * h;
}

/** SVG path of the flow for a handover value. */
export function flowPath(handover: number, o: Orientation = "wide") {
  const g = geo(o);
  const c = crossoverCentre(handover, o);
  const a = (c - g.bend).toFixed(1);
  const b = (c + g.bend).toFixed(1);
  const c1 = (c - 8).toFixed(1);
  const c2 = (c + 8).toFixed(1);
  if (o === "wide") {
    return `M -10 ${g.railA} H ${a} C ${c1} ${g.railA}, ${c2} ${g.railB}, ${b} ${g.railB} H ${g.length + 10}`;
  }
  return `M ${g.railA} -10 V ${a} C ${g.railA} ${c1}, ${g.railB} ${c2}, ${g.railB} ${b} V ${g.length + 10}`;
}

/** Cross-axis position of the flow at `along` for a handover value. */
export function flowAt(along: number, handover: number, o: Orientation = "wide") {
  const g = geo(o);
  const c = crossoverCentre(handover, o);
  if (along <= c - g.bend) return g.railA;
  if (along >= c + g.bend) return g.railB;
  return g.railA + (g.railB - g.railA) * smooth((along - (c - g.bend)) / (2 * g.bend));
}

/** Kept for callers that only know the wide orientation. */
export function flowY(x: number, handover: number) {
  return flowAt(x, handover, "wide");
}

function Drawing({
  o,
  motion,
  light,
  id,
  className,
}: {
  o: Orientation;
  motion: boolean;
  light: boolean;
  id: string;
  className: string;
}) {
  const g = geo(o);
  const ink = light ? "var(--color-ink)" : "var(--color-lumen)";
  const muted = light ? "#5b5f69" : "var(--color-silver-2)";
  const rail = light ? "rgba(5,5,7,0.16)" : "rgba(255,255,255,0.16)";
  const accent = light ? "var(--color-signal-deep)" : "var(--color-signal)";
  const initial = motion ? 0 : FINAL_HANDOVER;
  const pathId = `${id}-${o}-flow`;
  const wide = o === "wide";
  const viewBox = wide ? `0 0 ${g.length} ${g.depth}` : `0 0 ${g.depth} ${g.length}`;
  const fs = wide ? 11 : 13;
  const c = crossoverCentre(initial, o);
  return (
    <svg
      viewBox={viewBox}
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label="Conceptual illustration: a steady flow of customers moves from the outgoing platform to the incoming platform without interruption."
      data-visual="continuity"
      data-orientation={o}
    >
      {wide ? (
        <>
          <line x1="0" y1={g.railA} x2={g.length} y2={g.railA} stroke={rail} />
          <line x1="0" y1={g.railB} x2={g.length} y2={g.railB} stroke={rail} />
          <text x="0" y={g.railA - 18} fill={muted} fontFamily="var(--font-mono)" fontSize={fs}>
            OUTGOING PLATFORM · Oracle Crowdtwist
          </text>
          <text x={g.length} y={g.railB + 30} textAnchor="end" fill={muted} fontFamily="var(--font-mono)" fontSize={fs}>
            INCOMING PLATFORM · Salesforce Marketing Cloud
          </text>
        </>
      ) : (
        <>
          <line x1={g.railA} y1="0" x2={g.railA} y2={g.length} stroke={rail} />
          <line x1={g.railB} y1="0" x2={g.railB} y2={g.length} stroke={rail} />
          <text x={g.railA - 14} y="26" textAnchor="end" fill={muted} fontFamily="var(--font-mono)" fontSize={fs}>
            OUTGOING
          </text>
          <text x={g.railA - 14} y="44" textAnchor="end" fill={muted} fontFamily="var(--font-mono)" fontSize={fs}>
            Crowdtwist
          </text>
          <text x={g.railB - 14} y={g.length - 58} textAnchor="end" fill={muted} fontFamily="var(--font-mono)" fontSize={fs}>
            INCOMING
          </text>
          <text x={g.railB - 14} y={g.length - 40} textAnchor="end" fill={muted} fontFamily="var(--font-mono)" fontSize={fs}>
            Marketing Cloud
          </text>
        </>
      )}

      <path data-flow-halo d={flowPath(initial, o)} fill="none" stroke={accent} strokeOpacity="0.16" strokeWidth="16" strokeLinecap="round" />
      <path id={pathId} data-flow d={flowPath(initial, o)} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />

      <g data-cutover transform={wide ? `translate(${c.toFixed(1)} 0)` : `translate(0 ${c.toFixed(1)})`}>
        {wide ? (
          <>
            <line x1="0" y1={g.railA - 40} x2="0" y2={g.railB + 40} stroke={rail} strokeDasharray="3 5" />
            <text x="8" y={g.railA - 44} fill={muted} fontFamily="var(--font-mono)" fontSize="10.5">
              cutover
            </text>
          </>
        ) : (
          <>
            <line x1={g.railA - 40} y1="0" x2={g.railB + 40} y2="0" stroke={rail} strokeDasharray="3 5" />
            <text x={g.railB + 46} y="4" fill={muted} fontFamily="var(--font-mono)" fontSize="12">
              cutover
            </text>
          </>
        )}
      </g>

      {motion
        ? Array.from({ length: DOTS }, (_, i) => (
            <circle key={i} r={wide ? 5.5 : 6.5} fill={ink}>
              <animateMotion dur="7s" begin={`${(-(i * 7) / DOTS).toFixed(2)}s`} repeatCount="indefinite">
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </circle>
          ))
        : Array.from({ length: DOTS }, (_, i) => {
            const along = 40 + (i * (g.length - 80)) / (DOTS - 1);
            const across = flowAt(along, FINAL_HANDOVER, o);
            return wide ? (
              <circle key={i} cx={along} cy={across} r="5.5" fill={ink} />
            ) : (
              <circle key={i} cx={across} cy={along} r="6.5" fill={ink} />
            );
          })}

      {wide ? (
        <text x="0" y="372" fill={muted} fontFamily="var(--font-mono)" fontSize={fs}>
          CUSTOMERS KEEP FLOWING · zero customer-visible disruption
        </text>
      ) : (
        <text x={g.depth / 2} y={g.length - 6} textAnchor="middle" fill={muted} fontFamily="var(--font-mono)" fontSize={fs}>
          CUSTOMERS KEEP FLOWING
        </text>
      )}
    </svg>
  );
}

export function ContinuityVisual({
  motion = false,
  className = "",
  light = true,
  id = "continuity",
  orientation = "responsive",
}: {
  motion?: boolean;
  className?: string;
  light?: boolean;
  id?: string;
  orientation?: "responsive" | Orientation;
}) {
  if (orientation === "wide") return <Drawing o="wide" motion={motion} light={light} id={id} className={className} />;
  if (orientation === "tall") return <Drawing o="tall" motion={motion} light={light} id={id} className={className} />;
  return (
    <>
      <Drawing o="wide" motion={motion} light={light} id={id} className={`hidden lg:block ${className}`} />
      <Drawing o="tall" motion={motion} light={light} id={id} className={`mx-auto max-w-[22rem] lg:hidden ${className}`} />
    </>
  );
}
