"use client";

import { useId, useMemo } from "react";
import { deadLetters, listDeliveries } from "@/lib/sim/engine";
import { formatClock } from "@/lib/sim/format";
import type { SimState } from "@/lib/sim/types";
import { Panel, SmallButton } from "./bits";

export function DeadLetters({
  state,
  selectedId,
  onInspect,
  onReplay,
}: {
  state: SimState;
  selectedId: string | null;
  onInspect: (id: string) => void;
  onReplay: (id: string) => void;
}) {
  const id = useId();
  const { items, replayedBy } = useMemo(() => {
    const dead = deadLetters(state).slice().reverse();
    const map = new Map<string, string>();
    for (const d of listDeliveries(state)) if (d.replayOf) map.set(d.replayOf, d.id);
    return { items: dead, replayedBy: map };
  }, [state]);

  return (
    <Panel
      title="Dead-letter queue"
      headingId={`${id}-heading`}
      label={items.length === 0 ? "empty" : `${items.length} parked`}
      bodyClassName="px-0 md:px-0"
    >
      {items.length === 0 ? (
        <p className="px-4 text-[0.9rem] leading-relaxed text-silver-2 md:px-5">
          Nothing here. A delivery arrives when it exhausts its failure budget or its 429 deferral budget. Replaying
          one creates a fresh delivery that records the original; the original is never changed.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((d) => {
            const replay = replayedBy.get(d.id);
            const selected = d.id === selectedId;
            return (
              <li key={d.id} className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3 md:px-5 ${selected ? "bg-graphite-2" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className={`font-mono text-[0.8rem] ${selected ? "text-signal" : "text-lumen"}`}>{d.id}</span>
                    <span className="mono-label text-silver-3">
                      to {d.subscriberId} · {formatClock(d.completedAt ?? state.now)}
                    </span>
                    {d.replayOf ? <span className="mono-label text-silver-3">replay of {d.replayOf}</span> : null}
                  </p>
                  <p className="mt-1 text-[0.82rem] leading-snug text-danger">{d.deadLetterReason}</p>
                  {replay ? <p className="mono-label mt-1 text-silver-2">Replayed as {replay}.</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SmallButton onClick={() => onInspect(d.id)} pressed={selected} ariaLabel={`Inspect ${d.id}`}>
                    Inspect
                  </SmallButton>
                  <SmallButton onClick={() => onReplay(d.id)} className="border-signal/50 text-signal" ariaLabel={`Replay ${d.id}`}>
                    Replay
                  </SmallButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
