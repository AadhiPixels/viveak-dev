"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MILESTONES, statusText, summary, type GameEvent, type Phase } from "@/lib/game/engine";
import { useMotion } from "@/components/motion/MotionProvider";
import { ArrowRight } from "@/components/ui/Icons";
import { GameSession } from "./session";

const GameScene = dynamic(() => import("./GameScene"), { ssr: false });

const BEST_KEY = "vv-throughput-best";

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => {};
let webglCache: "yes" | "no" | null = null;
function webglSnapshot(): "yes" | "no" {
  if (webglCache === null) webglCache = supportsWebGL() ? "yes" : "no";
  return webglCache;
}
function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function coarseSnapshot() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function readBest(): number {
  try {
    return Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeBest(v: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* ignore */
  }
}

/**
 * Throughput: the playable arcade layer. The engine lives in src/lib/game and
 * the 3D view in GameScene; this component owns input, HUD and overlays.
 */
export function Throughput() {
  const { reduced } = useMotion();
  const session = useMemo(() => new GameSession(), []);
  const [phase, setPhase] = useState<Phase>("ready");
  const detectedWebgl = useSyncExternalStore(noopSubscribe, webglSnapshot, () => "unknown" as const);
  const [contextLost, setContextLost] = useState(false);
  const webgl = contextLost ? "no" : detectedWebgl;
  const storedBest = useSyncExternalStore(noopSubscribe, readBest, () => 0);
  const [sessionBest, setSessionBest] = useState(0);
  const best = Math.max(storedBest, sessionBest);
  const [toast, setToast] = useState<string | null>(null);
  const coarse = useSyncExternalStore(subscribeCoarse, coarseSnapshot, () => false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const streakRef = useRef<HTMLSpanElement>(null);
  const livesRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  // Phase and event fan-out.
  useEffect(() => {
    const offPhase = session.onPhase((p) => {
      setPhase(p);
      if (p === "over") {
        const s = session.state.score;
        setSessionBest((b) => Math.max(b, s));
        if (s > readBest()) writeBest(s);
      }
    });
    const offEvent = session.onEvent((e: GameEvent) => {
      const flash = flashRef.current;
      if (flash) {
        flash.dataset.flash = e.type === "fault" ? (e.absorbed ? "absorbed" : "hit") : e.type === "gate" ? "gate" : e.type === "token" ? "" : "good";
        if (flash.dataset.flash) {
          flash.classList.remove("is-flashing");
          void flash.offsetWidth; // restart the CSS animation
          flash.classList.add("is-flashing");
        }
      }
      if (e.type === "milestone") showToast(e.caption);
      if (e.type === "shield") showToast("Circuit breaker armed: the next 503 is absorbed.");
      if (e.type === "burst") showToast("Burst: auto-scaling, deliveries count double.");
      if (e.type === "gate") showToast("429 rate limit: backing off.");
      if (e.type === "retry") showToast(e.restored ? "Retry recovered." : "Retries full: +25 delivered.");
      if (e.type === "fault" && e.absorbed) showToast("Circuit opened. Fault absorbed.");
    });
    return () => {
      offPhase();
      offEvent();
    };
  }, [session, showToast]);

  // HUD refresh at ~15 fps, outside React.
  useEffect(() => {
    const id = window.setInterval(() => {
      const g = session.state;
      if (scoreRef.current) scoreRef.current.textContent = g.score.toLocaleString("en-GB");
      if (streakRef.current) streakRef.current.textContent = g.streak > 0 ? `streak ${g.streak} · ×${g.multiplier}` : "×1";
      if (livesRef.current) {
        const dots = livesRef.current.children;
        for (let i = 0; i < dots.length; i++) (dots[i] as HTMLElement).dataset.on = i < g.lives ? "true" : "false";
      }
      if (chipsRef.current) {
        const chips: string[] = [];
        if (g.shield) chips.push("Circuit breaker armed");
        if (g.t < g.slowUntil) chips.push("Rate limited");
        if (g.t < g.burstUntil) chips.push("Burst");
        chipsRef.current.textContent = chips.join(" · ");
      }
    }, 66);
    return () => window.clearInterval(id);
  }, [session]);

  // Assistive status once a second while running, immediately on phase changes.
  useEffect(() => {
    const update = () => {
      if (statusRef.current) statusRef.current.textContent = statusText(session.state);
    };
    update();
    const id = window.setInterval(() => {
      if (session.state.phase === "running") update();
    }, 2500);
    return () => window.clearInterval(id);
  }, [session, phase]);

  // Keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const g = session.state;
      const active = rootRef.current?.contains(document.activeElement) || g.phase === "running";
      if (!active) return;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          if (g.phase === "running") e.preventDefault();
          session.left();
          break;
        case "ArrowRight":
        case "d":
        case "D":
          if (g.phase === "running") e.preventDefault();
          session.right();
          break;
        case " ":
        case "Enter":
          if (g.phase === "ready") {
            e.preventDefault();
            session.start();
          } else if (g.phase === "running" || g.phase === "paused") {
            e.preventDefault();
            session.togglePause();
          } else if (g.phase === "over") {
            e.preventDefault();
            session.reset();
            session.start();
          }
          break;
        case "p":
        case "P":
        case "Escape":
          if (g.phase === "running" || g.phase === "paused") {
            e.preventDefault();
            session.togglePause();
          }
          break;
        case "r":
        case "R":
          if (g.phase === "over" || g.phase === "paused") {
            session.reset();
            session.start();
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session]);

  // Expose the session for end-to-end tests and debugging; it holds game numbers only.
  useEffect(() => {
    (window as Window & { __throughput?: GameSession }).__throughput = session;
    return () => {
      delete (window as Window & { __throughput?: GameSession }).__throughput;
    };
  }, [session]);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") session.pause();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [session]);

  // Touch and pointer steering: tap a side, or swipe.
  const pointerStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (session.state.phase !== "running") return;
    pointerStart.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || session.state.phase !== "running") return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 28) {
      if (dx < 0) session.left();
      else session.right();
      return;
    }
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rel = (e.clientX - rect.left) / rect.width;
    if (rel < 0.5) session.left();
    else session.right();
  };

  const stats = summary(session.state);
  const nextMilestone = MILESTONES[session.state.milestoneIndex];

  return (
    <div
      ref={rootRef}
      className="throughput relative w-full touch-pan-y select-none overflow-hidden rounded-2xl border border-line bg-ink text-lumen"
      role="application"
      aria-label="Throughput, an arcade game. Use the left and right arrow keys or tap the sides to change lane. Space starts and pauses."
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      data-phase={phase}
    >
      <div className="relative h-[min(78svh,720px)] min-h-[440px] lg:aspect-[16/9] lg:h-auto lg:max-h-[80svh] lg:min-h-[520px]">
        {webgl === "yes" ? (
          <GameScene session={session} reduced={reduced} onContextLost={() => setContextLost(true)} />
        ) : webgl === "no" ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
            <p className="t-lead max-w-md text-silver">
              Throughput needs WebGL, which this browser has switched off. The rest of the site works without it;
              the <Link href="/lab/webhook-delivery" className="underline">webhook-delivery lab</Link> runs in plain
              HTML.
            </p>
          </div>
        ) : null}

        {/* Hit and pickup feedback */}
        <div ref={flashRef} className="throughput-flash pointer-events-none absolute inset-0" aria-hidden="true" />

        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
          <div>
            <p className="eyebrow text-silver-2">Delivered</p>
            <p className="font-display text-[2rem] font-semibold leading-none tracking-[-0.03em] tabular-nums md:text-[2.6rem]">
              <span ref={scoreRef}>0</span>
            </p>
            <p className="mono-label mt-1 text-silver-2">
              <span ref={streakRef}>×1</span>
              {nextMilestone ? <span className="text-silver-3"> · next {nextMilestone.value.toLocaleString("en-GB")}</span> : null}
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow text-silver-2">Retries</p>
            <div ref={livesRef} className="mt-1.5 flex justify-end gap-1.5" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} data-on="true" className="throughput-life h-2.5 w-6 rounded-full" />
              ))}
            </div>
            <div ref={chipsRef} className="mono-label mt-2 min-h-[1.2em] text-signal" />
          </div>
        </div>

        {toast ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-4 md:bottom-8">
            <p className="rounded-full border border-line bg-ink/80 px-4 py-2 text-[0.9rem] text-lumen backdrop-blur">
              {toast}
            </p>
          </div>
        ) : null}

        {/* Touch controls */}
        {coarse && phase === "running" ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-between p-3" aria-hidden="true">
            <span className="mono-label rounded-full border border-line bg-ink/70 px-3 py-1.5 text-silver-2">Tap left</span>
            <span className="mono-label rounded-full border border-line bg-ink/70 px-3 py-1.5 text-silver-2">Tap right</span>
          </div>
        ) : null}

        {/* Pause button while running */}
        {phase === "running" ? (
          <button
            type="button"
            onClick={() => session.togglePause()}
            className="btn btn-secondary absolute bottom-4 left-1/2 min-h-9 -translate-x-1/2 px-3.5 py-2 text-[0.85rem] md:bottom-6"
          >
            Pause
          </button>
        ) : null}

        {/* Overlays */}
        {phase === "ready" ? (
          <Overlay>
            <p className="eyebrow">Throughput · a game built for this site</p>
            <h2 className="t-display-m mt-3 text-lumen">Keep a million events moving.</h2>
            <p className="t-body mt-4 max-w-[46ch] text-silver">
              You are a delivery pulse on a chrome route. Collect acknowledged deliveries, dodge 503 faults, accept the
              odd 429 rate limit, and use circuit breakers, retries and bursts when the route gives you one.
            </p>
            <ul className="mono-label mt-5 grid gap-1.5 text-silver-2 sm:grid-cols-2">
              <li>Left / right arrows or A / D: change lane</li>
              <li>Tap the left or right half on touch</li>
              <li>Space: start and pause · Esc: pause</li>
              <li>R: restart</li>
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-primary gap-2" onClick={() => session.start()} autoFocus>
                Play <ArrowRight />
              </button>
              {best > 0 ? <span className="mono-label text-silver-2">Best: {best.toLocaleString("en-GB")} delivered</span> : null}
            </div>
            <p className="mono-label mt-6 max-w-[54ch] text-silver-3">
              Game numbers, not production data. The vocabulary borrows from the delivery-platform work described on
              this site.
            </p>
          </Overlay>
        ) : null}

        {phase === "paused" ? (
          <Overlay>
            <p className="eyebrow">Paused</p>
            <h2 className="t-display-m mt-3 text-lumen">Back-pressure engaged.</h2>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-primary" onClick={() => session.togglePause()} autoFocus>
                Resume
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  session.reset();
                  session.start();
                }}
              >
                Restart
              </button>
            </div>
          </Overlay>
        ) : null}

        {phase === "over" ? (
          <Overlay>
            <p className="eyebrow">Dead-lettered</p>
            <h2 className="t-display-m mt-3 text-lumen">
              {stats.delivered.toLocaleString("en-GB")} {stats.delivered === 1 ? "event" : "events"} delivered.
            </h2>
            <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
              <Stat label="Best streak" value={stats.bestStreak.toLocaleString("en-GB")} />
              <Stat label="Time on route" value={`${stats.seconds}s`} />
              <Stat label="Faults hit" value={String(stats.faults)} />
              <Stat label="Best run" value={Math.max(best, stats.delivered).toLocaleString("en-GB")} />
            </dl>
            <p className="t-body mt-5 max-w-[46ch] text-silver">
              The real delivery service moves around a million events a day, with retries, circuit breakers and a
              dead-letter queue doing quietly what you just did by hand.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn btn-primary gap-2"
                onClick={() => {
                  session.reset();
                  session.start();
                }}
                autoFocus
              >
                Play again <ArrowRight />
              </button>
              <Link href="/lab/webhook-delivery" className="btn btn-secondary">
                Open the real simulation
              </Link>
              <Link href="/work/external-api-platform" className="btn btn-ghost">
                Read the case study
              </Link>
            </div>
          </Overlay>
        ) : null}
      </div>
      <p ref={statusRef} className="sr-only" role="status" aria-live="polite" />
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-end overflow-y-auto bg-[linear-gradient(to_top,rgba(5,5,7,0.94),rgba(5,5,7,0.6)_55%,rgba(5,5,7,0.2))] p-5 pt-28 md:items-center md:p-10 md:pt-32">
      <div className="max-w-2xl">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 font-display text-[1.5rem] font-semibold leading-none tracking-[-0.02em] text-lumen tabular-nums">{value}</dd>
    </div>
  );
}
