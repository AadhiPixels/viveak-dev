/**
 * Art direction per breakpoint: where the camera sits and where the sculpture
 * group is placed for each keyframe. Values are blended with the same beats as
 * the ribbon geometry so camera and object always agree.
 */

export type Variant = "desktop" | "mobile";

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface GroupPose {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  /** Environment intensity multiplier for the metal, 1 = full studio light. */
  light: number;
  /** Luminous path intensity, 1 = full. */
  glow: number;
}

export interface Composition {
  camera: CameraPose[];
  group: GroupPose[];
}

export const COMPOSITIONS: Record<Variant, Composition> = {
  desktop: {
    camera: [
      { position: [0, 0.05, 6.4], target: [0, 0, 0], fov: 36 },
      { position: [0, 0.1, 6.9], target: [0, 0.05, 0], fov: 37 },
      { position: [0, 0.15, 7.6], target: [0.4, 0.1, 0], fov: 38 },
      { position: [0, -0.2, 8.2], target: [0.2, -0.6, 0], fov: 38 },
    ],
    group: [
      { position: [1.6, -0.12, 0], rotation: [0, 0, 0], scale: 0.95, light: 1, glow: 1 },
      { position: [1.1, 0.05, -0.2], rotation: [0.02, -0.08, 0], scale: 1.0, light: 1, glow: 1 },
      { position: [0.55, 0.15, -0.4], rotation: [0.06, -0.14, -0.02], scale: 1.0, light: 0.95, glow: 1 },
      { position: [0.2, -0.45, -0.9], rotation: [0.1, -0.1, 0], scale: 1.0, light: 0.7, glow: 0.6 },
    ],
  },
  mobile: {
    camera: [
      { position: [0, 0.2, 7.2], target: [0, 0.3, 0], fov: 50 },
      { position: [0, 0.2, 7.6], target: [0, 0.2, 0], fov: 51 },
      { position: [0, 0.1, 8.4], target: [0, 0.1, 0], fov: 52 },
      { position: [0, -0.2, 8.8], target: [0, -0.7, 0], fov: 52 },
    ],
    group: [
      { position: [0.4, 2.2, 0], rotation: [0.05, 0, 0], scale: 0.5, light: 1, glow: 1 },
      { position: [0.2, 1.35, -0.2], rotation: [0.05, -0.05, 0], scale: 0.6, light: 1, glow: 1 },
      { position: [0, 0.55, -0.5], rotation: [0.06, -0.08, 0], scale: 0.72, light: 0.95, glow: 1 },
      { position: [0, -0.9, -0.3], rotation: [0.1, -0.06, 0], scale: 0.8, light: 0.75, glow: 0.6 },
    ],
  },
};

export type Quality = "high" | "medium" | "low";

export interface QualitySettings {
  rings: number;
  maxDpr: number;
  halos: boolean;
  clearcoat: boolean;
  anisotropy: number;
  envResolution: 128 | 256;
  pulseFps: number;
}

export const QUALITY: Record<Quality, QualitySettings> = {
  high: { rings: 260, maxDpr: 1.75, halos: true, clearcoat: true, anisotropy: 0, envResolution: 256, pulseFps: 30 },
  medium: { rings: 200, maxDpr: 1.5, halos: true, clearcoat: true, anisotropy: 0, envResolution: 256, pulseFps: 24 },
  low: { rings: 140, maxDpr: 1.15, halos: false, clearcoat: false, anisotropy: 0, envResolution: 128, pulseFps: 15 },
};

/** Heuristic starting tier. The runtime monitor can still step down. */
export function detectQuality(): Quality {
  if (typeof window === "undefined") return "medium";
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 500;
  if (nav.connection?.saveData) return "low";
  if (cores <= 4 && memory <= 4) return small ? "low" : "medium";
  if (small) return "medium";
  if (cores >= 8 && memory >= 8) return "high";
  return "medium";
}

/** Blend helpers shared by the scene. */
export function lerp(a: number, b: number, s: number) {
  return a + (b - a) * s;
}

export function lerp3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  s: number,
  out: [number, number, number],
) {
  out[0] = a[0] + (b[0] - a[0]) * s;
  out[1] = a[1] + (b[1] - a[1]) * s;
  out[2] = a[2] + (b[2] - a[2]) * s;
  return out;
}
