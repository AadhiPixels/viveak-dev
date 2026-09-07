"use client";

import { useId, useMemo, useState } from "react";
import { formatClock } from "@/lib/sim/format";
import type { LogEntry } from "@/lib/sim/types";
import { Panel, SmallButton, levelTone, toneText } from "./bits";

const VISIBLE = 60;

/**
 * Bounded, newest first, deliberately not a live region: log lines are too
 * frequent to announce. Meaningful changes are announced by the container.
 */
export function LogPanel({ log, bound }: { log: LogEntry[]; bound: number }) {
  const id = useId();
  const [showAll, setShowAll] = useState(false);
  const items = useMemo(() => {
    const newestFirst = log.slice().reverse();
    return showAll ? newestFirst : newestFirst.slice(0, VISIBLE);
  }, [log, showAll]);

  return (
    <Panel
      title="Log"
      headingId={`${id}-heading`}
      label={`${items.length} of ${log.length} · ring buffer of ${bound}`}
      bodyClassName="px-0 md:px-0 py-0"
      actions={
        log.length > VISIBLE ? (
          <SmallButton onClick={() => setShowAll((v) => !v)} pressed={showAll}>
            {showAll ? `Newest ${VISIBLE}` : "Show all"}
          </SmallButton>
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="px-4 py-4 text-[0.9rem] text-silver-2 md:px-5">The log is empty.</p>
      ) : (
        <ol
          className="max-h-[26rem] overflow-y-auto py-2 font-mono text-[0.76rem] leading-relaxed focus-visible:outline-2 focus-visible:outline-signal"
          aria-label="Simulation log, newest first"
          tabIndex={0}
        >
          {items.map((entry) => (
            <li key={entry.seq} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 px-4 py-0.5 md:px-5">
              <span className="tabular-nums text-silver-3">{formatClock(entry.at)}</span>
              <span className={`${toneText(levelTone(entry.level))} break-words`}>{entry.message}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
