"use client";

import type { RefObject } from "react";
import { useMotionEnabled } from "@/components/motion/MotionProvider";
import { gsap, useSceneGSAP } from "@/lib/motion/gsap";

/**
 * Subtle one-shot entrance for a walkthrough block: a short rise and fade as
 * it scrolls into view, then nothing. Only runs when motion is enabled; with
 * reduced motion the block simply renders in place. Inline styles are cleared
 * on completion so the settled interface has no lingering transform.
 */
export function useSettleIn(ref: RefObject<HTMLElement | null>) {
  const motionEnabled = useMotionEnabled();

  useSceneGSAP(
    () => {
      if (!motionEnabled || !ref.current) return;
      const el = ref.current;
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 20 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        },
      );
    },
    { scope: ref, dependencies: [motionEnabled] },
  );
}
