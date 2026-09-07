/**
 * Pure geometry for the signature sculpture: engineered metallic ribbons and
 * luminous pathways. No three.js objects are created here, only typed arrays,
 * so the module is deterministic and unit-testable.
 *
 * A ribbon is described per keyframe as "ring data": for each of RINGS+1
 * samples along the curve, a centre position, an "up" vector (the thin axis of
 * the cross-section) and a width factor used to taper the ends. The runtime
 * blends ring data between two keyframes and extrudes a rectangular
 * cross-section with hard edges (8 vertices per ring) so highlights stay crisp.
 */

export type RibbonKind = "band" | "path";

export interface RibbonDef {
  id: string;
  kind: RibbonKind;
  /** Tube radius on the torus knot (keyframe 0). */
  r: number;
  width: number;
  thickness: number;
  /** Lane index used by the route keyframes. */
  lane: number;
}

export const RIBBONS: readonly RibbonDef[] = [
  { id: "band-0", kind: "band", r: 0.42, width: 0.3, thickness: 0.026, lane: 2 },
  { id: "band-1", kind: "band", r: 0.63, width: 0.15, thickness: 0.02, lane: 0 },
  { id: "band-2", kind: "band", r: 0.23, width: 0.11, thickness: 0.018, lane: 4 },
  { id: "path-0", kind: "path", r: 0.53, width: 0.011, thickness: 0.011, lane: 1 },
  { id: "path-1", kind: "path", r: 0.33, width: 0.009, thickness: 0.009, lane: 3 },
  { id: "path-2", kind: "path", r: 0.73, width: 0.009, thickness: 0.009, lane: 5 },
];

export const KEYFRAME_COUNT = 4; // K0 knot, K1 loosening, K2 routes, K3 settled

export interface RingData {
  /** xyz per ring. */
  p: Float32Array;
  /** xyz up vector per ring. */
  u: Float32Array;
  /** width factor per ring (0..1). */
  w: Float32Array;
  /** twist in turns applied across the ribbon length. */
  twist: number;
}

/** Scroll beats: which keyframes are blended for a given normalised progress. */
export const BEATS: readonly { from: number; to: number; a: number; b: number }[] = [
  { from: 0, to: 0.2, a: 0, b: 0 },
  { from: 0.2, to: 0.4, a: 0, b: 1 },
  { from: 0.4, to: 0.58, a: 1, b: 2 },
  { from: 0.58, to: 0.8, a: 2, b: 2 },
  { from: 0.8, to: 1, a: 2, b: 3 },
];

export function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** Resolve progress to a keyframe pair and an eased blend factor. */
export function resolveBeat(progress: number): { a: number; b: number; s: number } {
  const p = clamp01(progress);
  for (const beat of BEATS) {
    if (p <= beat.to) {
      const raw = beat.to === beat.from ? 0 : (p - beat.from) / (beat.to - beat.from);
      return { a: beat.a, b: beat.b, s: smoothstep(0, 1, clamp01(raw)) };
    }
  }
  return { a: 3, b: 3, s: 0 };
}

const TAU = Math.PI * 2;

function rotate(
  v: [number, number, number],
  rx: number,
  ry: number,
  rz: number,
): [number, number, number] {
  let [x, y, z] = v;
  // X
  let cy = Math.cos(rx);
  let sy = Math.sin(rx);
  let y1 = y * cy - z * sy;
  let z1 = y * sy + z * cy;
  y = y1;
  z = z1;
  // Y
  cy = Math.cos(ry);
  sy = Math.sin(ry);
  const x1 = x * cy + z * sy;
  z1 = -x * sy + z * cy;
  x = x1;
  z = z1;
  // Z
  cy = Math.cos(rz);
  sy = Math.sin(rz);
  const x2 = x * cy - y * sy;
  y1 = x * sy + y * cy;
  x = x2;
  y = y1;
  return [x, y, z];
}

function taper(u: number) {
  return smoothstep(0, 0.07, u) * (1 - smoothstep(0.93, 1, u));
}

const KNOT = { p: 2, q: 3, R: 1.05, tilt: [-0.42, 0.62, 0.12] as [number, number, number] };

/**
 * Keyframe 0 and 1: a (2,3) torus knot that loosens. `alpha` = 0 is the intact
 * knot, `alpha` = 1 is fully unwound into a stretched loop.
 */
function knotRing(def: RibbonDef, u: number, alpha: number): {
  p: [number, number, number];
  up: [number, number, number];
} {
  const theta = u * TAU;
  const { p: P, q: Q } = KNOT;
  const R = KNOT.R + 0.55 * alpha;
  const rr = def.r * (1 - 0.25 * alpha);
  const radial = rr * Math.cos(Q * theta) * (1 - 0.35 * alpha);
  const z = rr * Math.sin(Q * theta) * (1 - 0.8 * alpha);
  const x = (R + radial) * Math.cos(P * theta);
  const y = (R + radial) * Math.sin(P * theta);
  // Torus surface normal doubles as the ribbon's thin axis.
  const nx = Math.cos(Q * theta) * Math.cos(P * theta);
  const ny = Math.cos(Q * theta) * Math.sin(P * theta);
  const nz = Math.sin(Q * theta);
  let pos = rotate([x, y, z], KNOT.tilt[0], KNOT.tilt[1], KNOT.tilt[2]);
  const up = rotate([nx, ny, nz], KNOT.tilt[0], KNOT.tilt[1], KNOT.tilt[2]);
  if (alpha > 0) {
    // Start pulling the loop apart along the route direction and spread lanes.
    const spread = (def.lane - 2.5) * 0.16 * alpha;
    pos = [pos[0] + (u - 0.5) * 2.6 * alpha, pos[1] + spread, pos[2] * (1 - 0.3 * alpha)];
  }
  return { p: pos, up };
}

const LANE_Y = [1.05, 0.62, 0.2, -0.22, -0.64, -1.06];
const LANE_Z = [0.25, -0.35, 0.55, -0.1, 0.4, -0.55];
const LANE_AMP = [0.34, 0.22, 0.42, 0.18, 0.3, 0.16];
const LANE_FREQ = [1.0, 1.35, 0.85, 1.6, 1.1, 1.45];
const LANE_PHASE = [0.0, 1.9, 0.9, 3.3, 2.4, 4.6];

/** Keyframe 2: structured routes sweeping across the stage. */
function routeRing(def: RibbonDef, u: number): {
  p: [number, number, number];
  up: [number, number, number];
} {
  const L = def.lane;
  const x = -4.9 + u * 9.8;
  const wave = Math.sin(u * TAU * LANE_FREQ[L] + LANE_PHASE[L]);
  const y = LANE_Y[L] + LANE_AMP[L] * wave + 0.12 * Math.sin(u * TAU * 0.5 + L);
  const z = LANE_Z[L] + 0.18 * Math.cos(u * TAU * 0.7 + LANE_PHASE[L]);
  // Bands face the camera with a gentle roll so highlights travel along them.
  const roll = 0.55 + 0.35 * Math.sin(u * TAU * 0.5 + L * 0.7);
  const up: [number, number, number] = [0, Math.cos(roll), Math.sin(roll)];
  return { p: [x, y, z], up };
}

/** Keyframe 3: routes settle into a calm lower band and recede. */
function settledRing(def: RibbonDef, u: number): {
  p: [number, number, number];
  up: [number, number, number];
} {
  const L = def.lane;
  const x = -5.2 + u * 10.4;
  const y = -1.0 - L * 0.21 + 0.08 * Math.sin(u * TAU * 0.6 + L) + 0.05 * Math.sin(u * TAU * 1.3 + L * 2);
  const z = -1.2 + LANE_Z[L] * 0.6;
  const roll = 0.32 + 0.14 * Math.sin(u * TAU * 0.4 + L);
  const up: [number, number, number] = [0, Math.cos(roll), Math.sin(roll)];
  return { p: [x, y, z], up };
}

const KEYFRAME_TWIST = [0.42, 0.28, 0.1, 0.04];

export function buildKeyframe(def: RibbonDef, keyframe: number, rings: number): RingData {
  const n = rings + 1;
  const p = new Float32Array(n * 3);
  const u = new Float32Array(n * 3);
  const w = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const t = k / rings;
    let ring: { p: [number, number, number]; up: [number, number, number] };
    switch (keyframe) {
      case 0:
        ring = knotRing(def, t, 0);
        break;
      case 1:
        ring = knotRing(def, t, 0.55);
        break;
      case 2:
        ring = routeRing(def, t);
        break;
      default:
        ring = settledRing(def, t);
    }
    p[k * 3] = ring.p[0];
    p[k * 3 + 1] = ring.p[1];
    p[k * 3 + 2] = ring.p[2];
    u[k * 3] = ring.up[0];
    u[k * 3 + 1] = ring.up[1];
    u[k * 3 + 2] = ring.up[2];
    w[k] = taper(t);
  }
  return { p, u, w, twist: KEYFRAME_TWIST[keyframe] ?? 0 };
}

export function buildAllKeyframes(def: RibbonDef, rings: number): RingData[] {
  const out: RingData[] = [];
  for (let k = 0; k < KEYFRAME_COUNT; k++) out.push(buildKeyframe(def, k, rings));
  return out;
}

/** Blend ring data a → b by s into `out`. Up vectors are renormalised later. */
export function blendRings(a: RingData, b: RingData, s: number, out: RingData) {
  const n = a.w.length;
  if (s <= 0) {
    out.p.set(a.p);
    out.u.set(a.u);
    out.w.set(a.w);
    out.twist = a.twist;
    return;
  }
  if (s >= 1) {
    out.p.set(b.p);
    out.u.set(b.u);
    out.w.set(b.w);
    out.twist = b.twist;
    return;
  }
  const inv = 1 - s;
  for (let i = 0; i < n * 3; i++) {
    out.p[i] = a.p[i] * inv + b.p[i] * s;
    out.u[i] = a.u[i] * inv + b.u[i] * s;
  }
  for (let i = 0; i < n; i++) out.w[i] = a.w[i] * inv + b.w[i] * s;
  out.twist = a.twist * inv + b.twist * s;
}

export function allocRings(rings: number): RingData {
  const n = rings + 1;
  return { p: new Float32Array(n * 3), u: new Float32Array(n * 3), w: new Float32Array(n), twist: 0 };
}

/** Vertex/index layout for the extruded cross-section. */
export const VERTS_PER_RING = 8;

export function buildIndices(rings: number): Uint32Array {
  const idx = new Uint32Array(rings * 4 * 6);
  let o = 0;
  for (let k = 0; k < rings; k++) {
    const base = k * VERTS_PER_RING;
    const next = base + VERTS_PER_RING;
    for (let f = 0; f < 4; f++) {
      const a = base + f * 2;
      const b = base + f * 2 + 1;
      const c = next + f * 2;
      const d = next + f * 2 + 1;
      idx[o++] = a;
      idx[o++] = c;
      idx[o++] = b;
      idx[o++] = b;
      idx[o++] = c;
      idx[o++] = d;
    }
  }
  return idx;
}

/**
 * Extrude the blended ring data into positions and normals.
 * Face order per ring: top (+up), right (+side), bottom (-up), left (-side).
 */
export function extrude(
  data: RingData,
  width: number,
  thickness: number,
  positions: Float32Array,
  normals: Float32Array,
  scaleWidth = 1,
) {
  const n = data.w.length;
  const p = data.p;
  const up = data.u;
  let tx = 0;
  let ty = 0;
  let tz = 0;
  for (let k = 0; k < n; k++) {
    const kPrev = k === 0 ? 0 : k - 1;
    const kNext = k === n - 1 ? n - 1 : k + 1;
    tx = p[kNext * 3] - p[kPrev * 3];
    ty = p[kNext * 3 + 1] - p[kPrev * 3 + 1];
    tz = p[kNext * 3 + 2] - p[kPrev * 3 + 2];
    let len = Math.hypot(tx, ty, tz) || 1;
    tx /= len;
    ty /= len;
    tz /= len;

    // Orthogonalise the up vector against the tangent.
    let ux = up[k * 3];
    let uy = up[k * 3 + 1];
    let uz = up[k * 3 + 2];
    const d = ux * tx + uy * ty + uz * tz;
    ux -= tx * d;
    uy -= ty * d;
    uz -= tz * d;
    len = Math.hypot(ux, uy, uz);
    if (len < 1e-5) {
      // Degenerate: pick any perpendicular.
      if (Math.abs(tx) < 0.9) {
        ux = 0;
        uy = -tz;
        uz = ty;
      } else {
        ux = -tz;
        uy = 0;
        uz = tx;
      }
      len = Math.hypot(ux, uy, uz) || 1;
    }
    ux /= len;
    uy /= len;
    uz /= len;

    // Side = tangent × up
    let sx = ty * uz - tz * uy;
    let sy = tz * ux - tx * uz;
    let sz = tx * uy - ty * ux;

    // Twist about the tangent.
    const angle = data.twist * TAU * (k / (n - 1) - 0.5);
    if (angle !== 0) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const nux = ux * c + sx * s;
      const nuy = uy * c + sy * s;
      const nuz = uz * c + sz * s;
      const nsx = sx * c - ux * s;
      const nsy = sy * c - uy * s;
      const nsz = sz * c - uz * s;
      ux = nux;
      uy = nuy;
      uz = nuz;
      sx = nsx;
      sy = nsy;
      sz = nsz;
    }

    const hw = (width * scaleWidth * data.w[k]) / 2;
    const ht = (thickness * scaleWidth * Math.sqrt(data.w[k])) / 2;
    const cx = p[k * 3];
    const cy = p[k * 3 + 1];
    const cz = p[k * 3 + 2];

    const base = k * VERTS_PER_RING * 3;
    // top face: (-side,+up) and (+side,+up), normal +up
    setVert(positions, normals, base + 0, cx - sx * hw + ux * ht, cy - sy * hw + uy * ht, cz - sz * hw + uz * ht, ux, uy, uz);
    setVert(positions, normals, base + 3, cx + sx * hw + ux * ht, cy + sy * hw + uy * ht, cz + sz * hw + uz * ht, ux, uy, uz);
    // right face: (+side,+up) and (+side,-up), normal +side
    setVert(positions, normals, base + 6, cx + sx * hw + ux * ht, cy + sy * hw + uy * ht, cz + sz * hw + uz * ht, sx, sy, sz);
    setVert(positions, normals, base + 9, cx + sx * hw - ux * ht, cy + sy * hw - uy * ht, cz + sz * hw - uz * ht, sx, sy, sz);
    // bottom face: (+side,-up) and (-side,-up), normal -up
    setVert(positions, normals, base + 12, cx + sx * hw - ux * ht, cy + sy * hw - uy * ht, cz + sz * hw - uz * ht, -ux, -uy, -uz);
    setVert(positions, normals, base + 15, cx - sx * hw - ux * ht, cy - sy * hw - uy * ht, cz - sz * hw - uz * ht, -ux, -uy, -uz);
    // left face: (-side,-up) and (-side,+up), normal -side
    setVert(positions, normals, base + 18, cx - sx * hw - ux * ht, cy - sy * hw - uy * ht, cz - sz * hw - uz * ht, -sx, -sy, -sz);
    setVert(positions, normals, base + 21, cx - sx * hw + ux * ht, cy - sy * hw + uy * ht, cz - sz * hw + uz * ht, -sx, -sy, -sz);
  }
}

function setVert(
  positions: Float32Array,
  normals: Float32Array,
  o: number,
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
) {
  positions[o] = x;
  positions[o + 1] = y;
  positions[o + 2] = z;
  normals[o] = nx;
  normals[o + 1] = ny;
  normals[o + 2] = nz;
}

/** Sample a point along blended ring data at parameter t (0..1). */
export function pointAt(data: RingData, t: number, out: [number, number, number]) {
  const n = data.w.length;
  const f = clamp01(t) * (n - 1);
  const k = Math.floor(f);
  const k2 = Math.min(n - 1, k + 1);
  const s = f - k;
  out[0] = data.p[k * 3] * (1 - s) + data.p[k2 * 3] * s;
  out[1] = data.p[k * 3 + 1] * (1 - s) + data.p[k2 * 3 + 1] * s;
  out[2] = data.p[k * 3 + 2] * (1 - s) + data.p[k2 * 3 + 2] * s;
  return out;
}
