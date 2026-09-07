/**
 * The single authoritative scroll-progress source for the opening sequence.
 * The hero's ScrollTrigger writes `target`; the WebGL scene (or the poster
 * fallback) reads it. Nothing else drives the sculpture.
 */
import type { Variant } from "./compositions";

export const heroProgress = {
  target: 0,
  variant: "desktop" as Variant,
};

const listeners = new Set<() => void>();

export function setHeroProgress(value: number) {
  const v = value < 0 ? 0 : value > 1 ? 1 : value;
  if (v === heroProgress.target) return;
  heroProgress.target = v;
  listeners.forEach((l) => l());
}

export function setHeroVariant(variant: Variant) {
  heroProgress.variant = variant;
  listeners.forEach((l) => l());
}

export function onHeroProgress(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
