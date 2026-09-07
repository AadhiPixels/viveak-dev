"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { detectQuality, type Quality, type Variant } from "./compositions";
import { setHeroVariant } from "./progress";

const SignatureScene = dynamic(() => import("./SignatureScene"), { ssr: false });

export type StageMode = "poster" | "canvas";

interface Props {
  /** Scroll choreography and WebGL are allowed. */
  motion: boolean;
  /** Ambient pulses allowed (false in reduced motion). */
  ambient: boolean;
  /** Called when the mode is decided so the hero timeline can target poster layers. */
  onModeChange?: (mode: StageMode) => void;
  className?: string;
}

export const POSTERS = {
  k0: { desktop: "/posters/hero-k0-desktop.webp", mobile: "/posters/hero-k0-mobile.webp" },
  k2: { desktop: "/posters/hero-k2-desktop.webp", mobile: "/posters/hero-k2-mobile.webp" },
  k3: { desktop: "/posters/hero-k3-desktop.webp", mobile: "/posters/hero-k3-mobile.webp" },
} as const;

const MOBILE_QUERY = "(max-width: 63.999rem)";

function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    return !!gl;
  } catch {
    return false;
  }
}

export function Poster({
  which,
  className = "",
  priority = false,
  alt = "",
}: {
  which: keyof typeof POSTERS;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const src = POSTERS[which];
  return (
    <picture className={`pointer-events-none absolute inset-0 block ${className}`}>
      <source media={MOBILE_QUERY} type="image/avif" srcSet={src.mobile.replace(/\.webp$/, ".avif")} />
      <source media={MOBILE_QUERY} srcSet={src.mobile} />
      <source type="image/avif" srcSet={src.desktop.replace(/\.webp$/, ".avif")} />
      <img
        src={src.desktop}
        alt={alt}
        className="h-full w-full object-cover"
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}

/**
 * Fixed, full-viewport stage that carries the signature sculpture behind the
 * opening sequence and the evidence chapter. Serves the poster first, then
 * enhances to WebGL when available; falls back to poster cross-fades otherwise.
 */
export function SignatureStage({ motion, ambient: ambientProp, onModeChange, className = "" }: Props) {
  // QA tooling can switch ambient pulses off with ?vv-ambient=0 (no effect on the composition).
  const ambient = useMemo(() => {
    if (typeof window === "undefined") return ambientProp;
    return ambientProp && new URLSearchParams(window.location.search).get("vv-ambient") !== "0";
  }, [ambientProp]);
  const [mode, setMode] = useState<StageMode>("poster");
  const [canvasReady, setCanvasReady] = useState(false);
  const [wantCanvas, setWantCanvas] = useState(false);
  const [active, setActive] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const quality = useMemo<Quality>(() => (typeof window === "undefined" ? "medium" : detectQuality()), []);

  // Decide whether to enhance. Wait for idle so the poster and text paint first.
  useEffect(() => {
    if (!motion) return;
    if (!supportsWebGL()) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (nav.connection?.saveData) return;
    let cancelled = false;
    const start = () => {
      if (!cancelled) setWantCanvas(true);
    };
    const hasIdle = typeof window.requestIdleCallback === "function";
    const handle = hasIdle
      ? window.requestIdleCallback(start, { timeout: 1200 })
      : window.setTimeout(start, 350);
    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [motion]);

  // Variant tracking for the composition.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const apply = () => setHeroVariant(mq.matches ? ("mobile" as Variant) : ("desktop" as Variant));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Pause ambient work when the opening chapters are off screen or the tab is
  // hidden. The stage itself is fixed, so observe the sections it serves.
  useEffect(() => {
    const targets = ["hero", "evidence"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    let visible = document.visibilityState === "visible";
    const onScreen = new Map<Element, boolean>();
    const update = () => setActive(visible && Array.from(onScreen.values()).some(Boolean));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => onScreen.set(e.target, e.isIntersecting));
        update();
      },
      { threshold: 0 },
    );
    targets.forEach((t) => io.observe(t));
    const onVis = () => {
      visible = document.visibilityState === "visible";
      update();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  return (
    <div
      ref={rootRef}
      data-signature-stage
      data-mode={motion && canvasReady ? "canvas" : "poster"}
      className={`signature-stage ${className}`}
      aria-hidden="true"
    >
      <div className="stage-backdrop absolute inset-0" />
      {/* Poster layers. K0 is the first frame; K2/K3 cross-fade only in poster mode. */}
      <Poster which="k0" priority className={`poster poster-k0 transition-opacity duration-700 ${canvasReady ? "opacity-0" : "opacity-100"}`} />
      {!canvasReady ? <Poster which="k2" className="poster poster-k2 opacity-0" /> : null}
      {!canvasReady ? <Poster which="k3" className="poster poster-k3 opacity-0" /> : null}
      {motion && wantCanvas ? (
        <div className={`absolute inset-0 transition-opacity duration-700 ${canvasReady ? "opacity-100" : "opacity-0"}`}>
          <SignatureScene
            quality={quality}
            active={active}
            ambient={ambient}
            onReady={() => {
              setCanvasReady(true);
              setMode("canvas");
            }}
            onContextLost={() => {
              setCanvasReady(false);
              setWantCanvas(false);
              setMode("poster");
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
