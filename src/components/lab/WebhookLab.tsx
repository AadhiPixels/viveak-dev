"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useMotionEnabled } from "@/components/motion/MotionProvider";
import { advance, applyCommand, createInitialState, step, summary } from "@/lib/sim/engine";
import { formatClock } from "@/lib/sim/format";
import { PRESETS, PRESET_ORDER, isPresetName } from "@/lib/sim/presets";
import type { Command, PresetName, SimState } from "@/lib/sim/types";
import { Badge, Stat } from "./bits";
import { CompactControls, Controls } from "./Controls";
import { DeadLetters } from "./DeadLetters";
import { Deliveries, DeliveryInspector } from "./Deliveries";
import { LogPanel } from "./LogPanel";
import { Pipeline } from "./Pipeline";
import { SubscriberCards } from "./SubscriberCards";
import { TextualState } from "./TextualState";

export const SPEEDS = [1, 2, 4, 8, 16] as const;
export const DEFAULT_SPEED = 4;
export const DEFAULT_PRESET: PresetName = "healthy";

/** Wall-clock frames longer than this (a background tab, a long task) are clamped so the clock never leaps. */
const MAX_FRAME_MS = 250;
/** The clock display refreshes at least this often even when nothing else changes. */
const SYNC_INTERVAL_MS = 100;

function initialState(): SimState {
  return applyCommand(createInitialState(), { type: "loadPreset", name: DEFAULT_PRESET });
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function isNativelyActivated(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "BUTTON" || tag === "A" || tag === "SUMMARY" || target.getAttribute("role") === "button";
}

/**
 * The lab. One engine state, advanced from a requestAnimationFrame loop scaled
 * by the accelerated-time factor. Every panel below derives from `state`.
 * Pausing stops the clock; stepping advances to the next scheduled moment.
 */
export function WebhookLab() {
  const id = useId();
  const motion = useMotionEnabled();
  const [state, setState] = useState<SimState>(initialState);
  const stateRef = useRef<SimState>(state);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);
  const speedRef = useRef(speed);
  const [burstCount, setBurstCount] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const commit = useCallback((next: SimState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const command = useCallback(
    (c: Command) => {
      commit(applyCommand(stateRef.current, c));
    },
    [commit],
  );

  // The accelerated clock.
  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last: number | null = null;
    let lastSync = 0;
    const tick = (now: number) => {
      if (last !== null) {
        const wall = Math.min(MAX_FRAME_MS, Math.max(0, now - last));
        const previous = stateRef.current;
        const next = advance(previous, wall * speedRef.current);
        stateRef.current = next;
        if (next.revision !== previous.revision || now - lastSync >= SYNC_INTERVAL_MS) {
          lastSync = now;
          setState(next);
        }
      }
      last = now;
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [paused]);

  const send = useCallback(() => command({ type: "send" }), [command]);
  const burst = useCallback(() => command({ type: "burst", count: burstCount }), [command, burstCount]);
  const failA = useCallback(() => command({ type: "setHealth", subscriber: "A", health: "failing" }), [command]);
  const rateLimitA = useCallback(() => command({ type: "setHealth", subscriber: "A", health: "rate-limited" }), [command]);
  const loseA = useCallback(() => command({ type: "setHealth", subscriber: "A", health: "timeout" }), [command]);
  const restoreA = useCallback(() => command({ type: "restore", subscriber: "A" }), [command]);
  const replay = useCallback(
    (deliveryId: string) => {
      command({ type: "replay", deliveryId });
      setSelectedId(deliveryId);
    },
    [command],
  );

  const togglePause = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    setAnnouncement(next ? "Simulation paused." : "Simulation running.");
  }, []);

  const stepOnce = useCallback(() => {
    setPaused(true);
    commit(step(stateRef.current));
  }, [commit]);

  const reset = useCallback(() => {
    command({ type: "reset" });
    setSelectedId(null);
    setAnnouncement("Simulation reset to an empty pipeline.");
  }, [command]);

  const loadPreset = useCallback(
    (name: PresetName) => {
      command({ type: "loadPreset", name });
      setSelectedId(null);
      setPaused(false);
      setAnnouncement(`Scenario loaded: ${PRESETS[name].title}. Simulation running.`);
    },
    [command],
  );

  // Keyboard shortcuts. Never while typing; space and enter keep their native meaning on buttons and links.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const key = e.key;
      if ((key === " " || key === "Enter") && isNativelyActivated(e.target)) return;
      switch (key.toLowerCase()) {
        case "s":
          send();
          break;
        case "b":
          burst();
          break;
        case "f":
          failA();
          break;
        case "r":
          restoreA();
          break;
        case " ":
          e.preventDefault();
          togglePause();
          break;
        case ".":
          stepOnce();
          break;
        case "0":
          reset();
          break;
        default:
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [send, burst, failA, restoreA, togglePause, stepOnce, reset]);

  const totals = useMemo(() => summary(state), [state]);
  const selected = selectedId ? (state.deliveries[selectedId] ?? null) : null;
  const preset = state.preset ? PRESETS[state.preset] : null;

  const controls = {
    paused,
    burstCount,
    burstBound: state.config.burstBound,
    onBurstCount: setBurstCount,
    onSend: send,
    onBurst: burst,
    onFailA: failA,
    onRateLimitA: rateLimitA,
    onLoseA: loseA,
    onRestoreA: restoreA,
    onTogglePause: togglePause,
    onStep: stepOnce,
    onReset: reset,
  };

  return (
    <div className="relative flex flex-col gap-4">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {/* Clock, speed and scenario */}
      <div className="rounded-2xl border border-line bg-graphite px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="eyebrow">Simulated time, ×{speed}</p>
              <p className="mt-1 font-display text-[1.75rem] font-medium tabular-nums leading-none tracking-[-0.03em] text-lumen">
                t = {formatClock(state.now)}
              </p>
            </div>
            <Badge tone={paused ? "amber" : "signal"} dot className="mb-1">
              {paused ? "Paused" : "Running"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <label className="flex items-center gap-2">
              <span className="eyebrow">Speed</span>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="mono-label h-9 rounded-full border border-(--line-strong) bg-graphite px-3 text-lumen"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    ×{s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="eyebrow">Scenario</span>
              <select
                value={state.preset ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isPresetName(v)) loadPreset(v);
                  else reset();
                }}
                className="mono-label h-9 rounded-full border border-(--line-strong) bg-graphite px-3 text-lumen"
              >
                {PRESET_ORDER.map((name) => (
                  <option key={name} value={name}>
                    {PRESETS[name].title}
                  </option>
                ))}
                <option value="">Free play</option>
              </select>
            </label>
          </div>
        </div>
        <p className="mt-4 max-w-[78ch] border-t border-line pt-4 text-[0.92rem] leading-relaxed text-silver">
          {preset
            ? preset.explanation
            : "Free play. Send events, break Subscriber A, and watch the retries, the circuit breaker and the dead-letter queue respond. Every number on this page comes from the same deterministic engine."}
        </p>
      </div>

      <Pipeline state={state} motion={motion} running={!paused} />

      <Controls {...controls} />

      {/* Totals */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl border border-line bg-graphite px-4 py-4 sm:grid-cols-4 md:px-5 xl:grid-cols-8">
        <Stat label="Events" value={totals.eventsSent} hint="Events accepted by the source" />
        <Stat label="Deliveries" value={totals.deliveries} />
        <Stat label="Delivered" value={totals.delivered} tone={totals.delivered > 0 ? "signal" : "neutral"} />
        <Stat label="Dead letters" value={totals.deadLettered} tone={totals.deadLettered > 0 ? "danger" : "neutral"} />
        <Stat label="In flight" value={totals.processing} />
        <Stat label="Waiting" value={totals.queued + totals.retryScheduled} hint="Queued or retry-scheduled" />
        <Stat label="Effects" value={totals.effectsApplied} hint="Business effects applied by consumers" />
        <Stat label="Duplicates" value={totals.duplicatesIgnored} tone={totals.duplicatesIgnored > 0 ? "amber" : "neutral"} hint="Duplicate deliveries acknowledged but not applied" />
      </dl>

      <SubscriberCards state={state} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Deliveries state={state} selectedId={selectedId} onSelect={setSelectedId} />
        <DeliveryInspector delivery={selected} state={state} onReplay={replay} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <DeadLetters state={state} selectedId={selectedId} onInspect={setSelectedId} onReplay={replay} />
        <LogPanel log={state.log} bound={state.config.logBound} />
      </div>

      <TextualState state={state} paused={paused} speed={speed} />

      {/* Sticky quick controls on narrow screens */}
      <div
        aria-label="Quick controls"
        role="group"
        className="safe-pb sticky bottom-0 z-20 rounded-2xl border border-line bg-graphite/90 p-2 backdrop-blur-md lg:hidden"
        id={`${id}-quick`}
      >
        <CompactControls {...controls} />
      </div>
    </div>
  );
}
