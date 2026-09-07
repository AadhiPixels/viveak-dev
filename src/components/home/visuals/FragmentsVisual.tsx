/**
 * Conceptual illustration for the platform-migration chapter: individually
 * managed instances (scattered fragments) resolve into an orchestrated,
 * uniformly scaled platform (an ordered grid on a single plate). The chapter
 * scrubs each tile from its scattered pose to the grid; with `motion` false
 * the resolved state renders directly. It does not depict any real system.
 */

export const FRAGMENT_COLUMNS = 6;
export const FRAGMENT_ROWS = 4;

/** Deterministic pseudo-random in [-1, 1] from an index. */
function noise(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export function fragmentPose(i: number) {
  // Rounded so server and client agree exactly (sin() differs in the last bits between engines).
  return {
    x: Math.round(noise(i, 1) * 140),
    y: Math.round(noise(i, 2) * 110),
    rotate: Math.round(noise(i, 3) * 34),
    scale: Math.round((0.8 + Math.abs(noise(i, 4)) * 0.28) * 100) / 100,
  };
}

export function FragmentsVisual({
  motion = false,
  className = "",
  light = false,
}: {
  motion?: boolean;
  className?: string;
  light?: boolean;
}) {
  const tiles = Array.from({ length: FRAGMENT_COLUMNS * FRAGMENT_ROWS }, (_, i) => i);
  return (
    <div
      className={`relative aspect-[16/10] w-full select-none ${className}`}
      role="img"
      aria-label="Conceptual illustration: scattered individual instances assembling into an orderly, orchestrated platform grid."
      data-visual="fragments"
    >
      {/* Platform plate */}
      <div
        data-plate
        className={`absolute inset-x-[8%] bottom-[10%] top-[12%] rounded-2xl border ${
          light ? "border-ink/10 bg-white/60" : "border-white/10 bg-white/[0.03]"
        }`}
        style={{
          boxShadow: light
            ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 30px 60px -40px rgba(5,5,7,0.35)"
            : "inset 0 1px 0 rgba(255,255,255,0.08), 0 40px 80px -50px rgba(0,0,0,0.9)",
        }}
      />
      <div
        className="absolute inset-x-[12%] bottom-[16%] top-[18%] grid gap-[3%]"
        style={{ gridTemplateColumns: `repeat(${FRAGMENT_COLUMNS}, minmax(0, 1fr))` }}
      >
        {tiles.map((i) => {
          const pose = fragmentPose(i);
          const scattered = motion
            ? { transform: `translate(${pose.x}%, ${pose.y}%) rotate(${pose.rotate}deg) scale(${pose.scale})`, opacity: 0.35 }
            : undefined;
          return (
            <div
              key={i}
              data-tile
              className={`relative aspect-square rounded-[14%] border ${
                light ? "border-ink/10 bg-white" : "border-white/10 bg-graphite-3"
              }`}
              style={{
                ...scattered,
                backgroundImage: light
                  ? "linear-gradient(180deg, rgba(255,255,255,1), rgba(233,227,216,0.9))"
                  : "linear-gradient(180deg, rgba(58,62,72,1), rgba(30,33,39,1))",
                willChange: motion ? "transform, opacity" : undefined,
              }}
            >
              <span
                className="absolute left-[18%] top-[18%] h-[10%] w-[34%] rounded-full"
                style={{ background: i % 5 === 0 ? "var(--color-signal)" : light ? "rgba(5,5,7,0.18)" : "rgba(255,255,255,0.2)" }}
              />
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-[8%] bottom-[3%] flex items-center justify-between" aria-hidden="true">
        <span className={`mono-label ${light ? "text-[#5b5f69]" : "text-silver-3"}`} data-label-before>
          EC2 instances, managed one by one
        </span>
        <span className={`mono-label ${light ? "text-[#5b5f69]" : "text-silver-3"}`} data-label-after>
          Kubernetes: scheduled, scaled, uniform
        </span>
      </div>
    </div>
  );
}
