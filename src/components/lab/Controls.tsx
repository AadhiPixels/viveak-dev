"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";

export interface ControlsProps {
  paused: boolean;
  burstCount: number;
  burstBound: number;
  onBurstCount: (n: number) => void;
  onSend: () => void;
  onBurst: () => void;
  onFailA: () => void;
  onRateLimitA: () => void;
  onLoseA: () => void;
  onRestoreA: () => void;
  onTogglePause: () => void;
  onStep: () => void;
  onReset: () => void;
}

export const SHORTCUTS: { key: string; label: string; action: string }[] = [
  { key: "s", label: "S", action: "Send event" },
  { key: "b", label: "B", action: "Send burst" },
  { key: "f", label: "F", action: "Fail A" },
  { key: "r", label: "R", action: "Restore A" },
  { key: " ", label: "Space", action: "Pause or resume" },
  { key: ".", label: ".", action: "Step" },
  { key: "0", label: "0", action: "Reset" },
];

function Key({ children }: { children: string }) {
  return (
    <kbd className="mono-label inline-flex min-w-6 items-center justify-center rounded border border-(--line-strong) px-1.5 py-0.5 text-silver">
      {children}
    </kbd>
  );
}

/** The full control strip: actions, burst size, and the shortcut legend. */
export function Controls(props: ControlsProps) {
  const id = useId();
  const burstId = `${id}-burst`;
  return (
    <div className="rounded-2xl border border-line bg-graphite px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" onClick={props.onSend}>
          Send event
        </Button>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={props.onBurst}>
            Send burst
          </Button>
          <label htmlFor={burstId} className="sr-only">
            Burst size, 1 to {props.burstBound} events
          </label>
          <input
            id={burstId}
            type="number"
            inputMode="numeric"
            min={1}
            max={props.burstBound}
            step={1}
            value={props.burstCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) props.onBurstCount(Math.min(props.burstBound, Math.max(1, Math.round(n))));
            }}
            className="mono-label h-9 w-16 rounded-full border border-(--line-strong) bg-transparent px-3 text-center text-lumen"
            aria-describedby={`${id}-burst-hint`}
          />
          <span id={`${id}-burst-hint`} className="mono-label text-silver-3">
            of {props.burstBound}
          </span>
        </div>

        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <Button size="sm" variant="secondary" onClick={props.onFailA} className="text-danger">
          Fail A
        </Button>
        <Button size="sm" variant="secondary" onClick={props.onRateLimitA} className="text-amber">
          Simulate 429 on A
        </Button>
        <Button size="sm" variant="secondary" onClick={props.onLoseA} className="text-amber">
          Lose A&apos;s responses
        </Button>
        <Button size="sm" variant="secondary" onClick={props.onRestoreA} className="text-signal">
          Restore A
        </Button>

        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <Button size="sm" variant="secondary" onClick={props.onTogglePause} aria-pressed={props.paused}>
          {props.paused ? "Resume" : "Pause"}
        </Button>
        <Button size="sm" variant="secondary" onClick={props.onStep} title="Advance to the next scheduled moment">
          Step
        </Button>
        <Button size="sm" variant="ghost" onClick={props.onReset}>
          Reset
        </Button>
      </div>

      <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
        <dt className="eyebrow">Keys</dt>
        {SHORTCUTS.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <dd className="m-0">
              <Key>{s.label}</Key>
            </dd>
            <dd className="mono-label m-0 text-silver-2">{s.action}</dd>
          </div>
        ))}
        <dd className="mono-label m-0 text-silver-3">Shortcuts are ignored while typing in a field.</dd>
      </dl>
    </div>
  );
}

/** Compact sticky strip for narrow screens. Same actions, same engine. */
export function CompactControls(props: Pick<ControlsProps, "paused" | "onSend" | "onBurst" | "onFailA" | "onRestoreA" | "onTogglePause" | "onStep">) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <Button size="sm" variant="primary" onClick={props.onSend} className="w-full px-2">
        Send
      </Button>
      <Button size="sm" variant="secondary" onClick={props.onBurst} className="w-full px-2">
        Burst
      </Button>
      <Button size="sm" variant="secondary" onClick={props.onTogglePause} className="w-full px-2" aria-pressed={props.paused}>
        {props.paused ? "Resume" : "Pause"}
      </Button>
      <Button size="sm" variant="secondary" onClick={props.onFailA} className="w-full px-2 text-danger">
        Fail A
      </Button>
      <Button size="sm" variant="secondary" onClick={props.onRestoreA} className="w-full px-2 text-signal">
        Restore A
      </Button>
      <Button size="sm" variant="secondary" onClick={props.onStep} className="w-full px-2">
        Step
      </Button>
    </div>
  );
}
