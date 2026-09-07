"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

/**
 * Single registration point for GSAP plugins. Import gsap and ScrollTrigger
 * from here in client components so configuration is applied once.
 */
let registered = false;

export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  ScrollTrigger.config({
    // Mobile browser chrome showing/hiding must not re-run the choreography.
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load,resize",
  });
  gsap.defaults({ ease: "none" });
  if (process.env.NODE_ENV !== "production") {
    (window as Window & { __ScrollTrigger?: typeof ScrollTrigger }).__ScrollTrigger = ScrollTrigger;
  }
  registered = true;
}

registerGsap();

export const BREAKPOINTS = {
  desktop: "(min-width: 64rem)",
  mobile: "(max-width: 63.999rem)",
} as const;

export { gsap, ScrollTrigger, useGSAP };

/**
 * True once the scoped element is within `rootMargin` of the viewport (and stays
 * true). Scenes far below the fold use it to defer their timelines: building every
 * ScrollTrigger during hydration forces one synchronous layout per trigger, which
 * is the single biggest block of main-thread work on a phone.
 */
function useNearViewport(scope: React.RefObject<HTMLElement | null>, rootMargin: string | false): boolean {
  const [near, setNear] = useState(
    () => rootMargin === false || typeof window === "undefined" || typeof IntersectionObserver === "undefined",
  );
  useEffect(() => {
    if (rootMargin === false || near) return;
    const el = scope.current;
    if (!el) {
      const frame = requestAnimationFrame(() => setNear(true));
      return () => cancelAnimationFrame(frame);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [scope, rootMargin, near]);
  return near;
}

/**
 * Scene hook: useGSAP with revertOnUpdate so that every dependency change
 * (motion preference, stage mode) fully reverts the previous timelines and
 * ScrollTriggers before rebuilding them. Without this, useGSAP defers cleanup
 * to unmount and pins stack up.
 *
 * `lazy` (a rootMargin such as "150% 0px") waits until the scope is near the
 * viewport before the callback runs; until then the scene keeps its static,
 * fully visible markup, which is exactly what reduced motion renders.
 */
export function useSceneGSAP(
  callback: () => void | (() => void),
  options: { scope: React.RefObject<HTMLElement | null>; dependencies: unknown[]; lazy?: string },
) {
  const near = useNearViewport(options.scope, options.lazy ?? false);
  return useGSAP(
    () => {
      if (!near) return;
      const cleanup = callback();
      scheduleScrollRefresh();
      return cleanup;
    },
    { scope: options.scope, dependencies: [near, ...options.dependencies], revertOnUpdate: true },
  );
}

let refreshHandle = 0;

/**
 * Coalesce ScrollTrigger.refresh() calls into one per frame. Scenes are built
 * in document order, but pinned sections change the positions of everything
 * below them, so a refresh after each build keeps every trigger accurate.
 */
export function scheduleScrollRefresh() {
  if (typeof window === "undefined" || refreshHandle) return;
  refreshHandle = window.requestAnimationFrame(() => {
    refreshHandle = 0;
    ScrollTrigger.refresh();
  });
}
