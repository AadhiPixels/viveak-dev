import { describe, expect, it } from "vitest";
import {
  RIBBONS,
  VERTS_PER_RING,
  allocRings,
  blendRings,
  buildAllKeyframes,
  buildIndices,
  extrude,
  pointAt,
  resolveBeat,
} from "@/components/scene/ribbon-math";

describe("ribbon-math", () => {
  it("maps progress to keyframe pairs monotonically", () => {
    expect(resolveBeat(0)).toEqual({ a: 0, b: 0, s: 0 });
    expect(resolveBeat(0.3)).toMatchObject({ a: 0, b: 1 });
    expect(resolveBeat(0.5)).toMatchObject({ a: 1, b: 2 });
    expect(resolveBeat(0.7)).toMatchObject({ a: 2, b: 2 });
    expect(resolveBeat(0.9)).toMatchObject({ a: 2, b: 3 });
    expect(resolveBeat(1).s).toBe(1);
    // Reverse direction resolves identically (pure function).
    expect(resolveBeat(0.45)).toEqual(resolveBeat(0.45));
  });

  it("builds finite, deterministic keyframes for every ribbon", () => {
    for (const def of RIBBONS) {
      const a = buildAllKeyframes(def, 64);
      const b = buildAllKeyframes(def, 64);
      expect(a).toHaveLength(4);
      for (let k = 0; k < 4; k++) {
        expect(a[k].p.every(Number.isFinite)).toBe(true);
        expect(a[k].u.every(Number.isFinite)).toBe(true);
        expect(Array.from(a[k].p)).toEqual(Array.from(b[k].p));
        // Ends taper to zero width.
        expect(a[k].w[0]).toBe(0);
        expect(a[k].w[64]).toBe(0);
        expect(Math.max(...a[k].w)).toBeCloseTo(1, 5);
      }
    }
  });

  it("blends ring data linearly and symmetrically", () => {
    const def = RIBBONS[0];
    const [k0, , k2] = buildAllKeyframes(def, 32);
    const out = allocRings(32);
    blendRings(k0, k2, 0.5, out);
    expect(out.p[0]).toBeCloseTo((k0.p[0] + k2.p[0]) / 2, 6);
    blendRings(k0, k2, 0, out);
    expect(Array.from(out.p)).toEqual(Array.from(k0.p));
    blendRings(k0, k2, 1, out);
    expect(Array.from(out.p)).toEqual(Array.from(k2.p));
  });

  it("extrudes hard-edged cross-sections with unit normals", () => {
    const def = RIBBONS[0];
    const rings = 48;
    const [k0] = buildAllKeyframes(def, rings);
    const positions = new Float32Array((rings + 1) * VERTS_PER_RING * 3);
    const normals = new Float32Array((rings + 1) * VERTS_PER_RING * 3);
    extrude(k0, def.width, def.thickness, positions, normals);
    expect(positions.every(Number.isFinite)).toBe(true);
    for (let i = 0; i < normals.length; i += 3) {
      const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
      expect(len).toBeCloseTo(1, 4);
    }
    const idx = buildIndices(rings);
    expect(idx.length).toBe(rings * 4 * 6);
    expect(Math.max(...idx)).toBe((rings + 1) * VERTS_PER_RING - 1);
  });

  it("samples points along the blended path", () => {
    const def = RIBBONS[3];
    const [k0] = buildAllKeyframes(def, 16);
    const out: [number, number, number] = [0, 0, 0];
    pointAt(k0, 0, out);
    expect(out).toEqual([k0.p[0], k0.p[1], k0.p[2]]);
    pointAt(k0, 1, out);
    expect(out[0]).toBeCloseTo(k0.p[16 * 3], 6);
  });
});
