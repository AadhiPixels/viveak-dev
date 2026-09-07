import * as THREE from "three";
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
  type RibbonDef,
  type RingData,
} from "./ribbon-math";
import type { QualitySettings } from "./compositions";

interface RibbonRuntime {
  def: RibbonDef;
  keyframes: RingData[];
  current: RingData;
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  normals: Float32Array;
  mesh: THREE.Mesh;
  halo?: { geometry: THREE.BufferGeometry; positions: Float32Array; normals: Float32Array; mesh: THREE.Mesh };
}

const SIGNAL = new THREE.Color("#5fe0c6");
const PULSE = new THREE.Color("#d9fff6");

/**
 * Owns the ribbon meshes and updates their geometry from scroll progress.
 * Geometry work only happens when progress changes; pulses are the only
 * per-frame cost while the scene is idle.
 */
export class RibbonSystem {
  readonly group = new THREE.Group();
  readonly bandMaterial: THREE.MeshPhysicalMaterial;
  readonly pathMaterial: THREE.MeshBasicMaterial;
  readonly haloMaterial: THREE.MeshBasicMaterial;
  readonly pulseMaterial: THREE.MeshBasicMaterial;
  private ribbons: RibbonRuntime[] = [];
  private pulses: THREE.InstancedMesh;
  private pulseCount: number;
  private lastProgress = -1;
  private tmp: [number, number, number] = [0, 0, 0];
  private matrix = new THREE.Matrix4();
  private quality: QualitySettings;
  private baseEnvIntensity = 1.35;

  constructor(quality: QualitySettings) {
    this.quality = quality;
    this.bandMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#dfe3e9"),
      metalness: 1,
      roughness: 0.17,
      envMapIntensity: this.baseEnvIntensity,
      clearcoat: quality.clearcoat ? 0.55 : 0,
      clearcoatRoughness: 0.18,
      side: THREE.DoubleSide,
    });
    // Anisotropy needs UV derivatives; this geometry carries no UVs, so it stays off.
    this.pathMaterial = new THREE.MeshBasicMaterial({
      color: SIGNAL.clone(),
      toneMapped: false,
    });
    this.haloMaterial = new THREE.MeshBasicMaterial({
      color: SIGNAL.clone().multiplyScalar(0.7),
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    this.pulseMaterial = new THREE.MeshBasicMaterial({
      color: PULSE.clone(),
      toneMapped: false,
      transparent: true,
      opacity: 0.95,
    });

    const rings = quality.rings;
    const indices = buildIndices(rings);

    for (const def of RIBBONS) {
      const n = rings + 1;
      const positions = new Float32Array(n * VERTS_PER_RING * 3);
      const normals = new Float32Array(n * VERTS_PER_RING * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      const material = def.kind === "band" ? this.bandMaterial : this.pathMaterial;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = def.kind === "band" ? 0 : 1;
      this.group.add(mesh);

      const runtime: RibbonRuntime = {
        def,
        keyframes: buildAllKeyframes(def, rings),
        current: allocRings(rings),
        geometry,
        positions,
        normals,
        mesh,
      };

      if (def.kind === "path" && quality.halos) {
        const hp = new Float32Array(n * VERTS_PER_RING * 3);
        const hn = new Float32Array(n * VERTS_PER_RING * 3);
        const hg = new THREE.BufferGeometry();
        hg.setAttribute("position", new THREE.BufferAttribute(hp, 3));
        hg.setAttribute("normal", new THREE.BufferAttribute(hn, 3));
        hg.setIndex(new THREE.BufferAttribute(indices, 1));
        const hm = new THREE.Mesh(hg, this.haloMaterial);
        hm.frustumCulled = false;
        hm.renderOrder = 2;
        this.group.add(hm);
        runtime.halo = { geometry: hg, positions: hp, normals: hn, mesh: hm };
      }
      this.ribbons.push(runtime);
    }

    const pathCount = RIBBONS.filter((r) => r.kind === "path").length;
    this.pulseCount = pathCount * 2;
    const sphere = new THREE.SphereGeometry(0.022, 12, 8);
    this.pulses = new THREE.InstancedMesh(sphere, this.pulseMaterial, this.pulseCount);
    this.pulses.frustumCulled = false;
    this.pulses.renderOrder = 3;
    this.group.add(this.pulses);
  }

  /** Update geometry for a progress value. Returns true when geometry changed. */
  setProgress(progress: number): boolean {
    if (Math.abs(progress - this.lastProgress) < 0.0005 && this.lastProgress >= 0) return false;
    this.lastProgress = progress;
    const { a, b, s } = resolveBeat(progress);
    for (const r of this.ribbons) {
      blendRings(r.keyframes[a], r.keyframes[b], s, r.current);
      extrude(r.current, r.def.width, r.def.thickness, r.positions, r.normals);
      (r.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (r.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
      if (r.halo) {
        extrude(r.current, r.def.width, r.def.thickness, r.halo.positions, r.halo.normals, 4.5);
        (r.halo.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (r.halo.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
      }
    }
    return true;
  }

  /** Apply light and glow multipliers from the composition. */
  setLighting(light: number, glow: number) {
    this.bandMaterial.envMapIntensity = this.baseEnvIntensity * light;
    this.pathMaterial.color.copy(SIGNAL).multiplyScalar(0.35 + 0.65 * glow);
    this.haloMaterial.opacity = 0.14 * glow;
    this.pulseMaterial.opacity = 0.95 * glow;
  }

  /** Move the luminous pulses along the current paths. */
  updatePulses(time: number) {
    let i = 0;
    let pathIndex = 0;
    for (const r of this.ribbons) {
      if (r.def.kind !== "path") continue;
      for (let j = 0; j < 2; j++) {
        const t = (time * 0.024 + j / 2 + pathIndex * 0.21) % 1;
        pointAt(r.current, t, this.tmp);
        const fade = Math.sin(t * Math.PI); // fade in/out near the tapered ends
        const sc = 0.6 + 0.6 * fade;
        this.matrix.makeScale(sc, sc, sc);
        this.matrix.setPosition(this.tmp[0], this.tmp[1], this.tmp[2]);
        this.pulses.setMatrixAt(i++, this.matrix);
      }
      pathIndex++;
    }
    this.pulses.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    for (const r of this.ribbons) {
      r.geometry.dispose();
      r.halo?.geometry.dispose();
    }
    this.pulses.geometry.dispose();
    this.bandMaterial.dispose();
    this.pathMaterial.dispose();
    this.haloMaterial.dispose();
    this.pulseMaterial.dispose();
  }
}
