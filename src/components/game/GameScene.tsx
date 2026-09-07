"use client";
/* eslint-disable react-hooks/immutability -- three.js geometries and typed arrays are mutable by design; they are updated from the render loop, never during React render. */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { VERTS_PER_RING, allocRings, buildIndices, extrude, type RingData } from "@/components/scene/ribbon-math";
import { lanePosition, routeAt } from "@/lib/game/route";
import type { GameSession } from "./session";

/* ------------------------------------------------------------------ */
/* Track: a wide chrome ribbon rebuilt around the pulse every frame      */
/* ------------------------------------------------------------------ */

const TRACK_BEHIND = 14;
const TRACK_AHEAD = 150;
const TRACK_STEP = 1;
const TRACK_RINGS = Math.round((TRACK_BEHIND + TRACK_AHEAD) / TRACK_STEP);

function fillRoute(data: RingData, from: number, step: number, laneX: number, laneWidth: number, lift: number) {
  const n = data.w.length;
  for (let k = 0; k < n; k++) {
    const s = from + k * step;
    const p = lanePosition(s, laneX, laneWidth, lift);
    data.p[k * 3] = p.x;
    data.p[k * 3 + 1] = p.y;
    data.p[k * 3 + 2] = p.z;
    data.u[k * 3] = 0;
    data.u[k * 3 + 1] = 1;
    data.u[k * 3 + 2] = 0;
    data.w[k] = 1;
  }
  data.twist = 0;
}

function useRibbonGeometry(rings: number) {
  return useMemo(() => {
    const n = rings + 1;
    const positions = new Float32Array(n * VERTS_PER_RING * 3);
    const normals = new Float32Array(n * VERTS_PER_RING * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(buildIndices(rings), 1));
    const data = allocRings(rings);
    return { geometry, positions, normals, data };
  }, [rings]);
}

const POST_COUNT = 24;
const POST_SPACING = 12;

function Track({ session }: { session: GameSession }) {
  const deck = useRibbonGeometry(TRACK_RINGS);
  const lanes = [useRibbonGeometry(TRACK_RINGS), useRibbonGeometry(TRACK_RINGS), useRibbonGeometry(TRACK_RINGS)];
  const edges = [useRibbonGeometry(TRACK_RINGS), useRibbonGeometry(TRACK_RINGS)];
  const posts = useRef<THREE.InstancedMesh>(null);
  const postMatrix = useMemo(() => new THREE.Matrix4(), []);
  const postPos = useMemo(() => new THREE.Vector3(), []);
  const postScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const postQuat = useMemo(() => new THREE.Quaternion(), []);
  const edgeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#cfd3da", emissive: "#9aa0aa", emissiveIntensity: 0.25, metalness: 1, roughness: 0.25 }),
    [],
  );
  const postMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color("#5fe0c6").multiplyScalar(0.6), toneMapped: false }),
    [],
  );
  const deckMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#454b56"),
        metalness: 0.85,
        roughness: 0.5,
        clearcoat: 0.4,
        clearcoatRoughness: 0.3,
        envMapIntensity: 0.75,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const laneMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color("#5fe0c6").multiplyScalar(0.55), toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      deck.geometry.dispose();
      lanes.forEach((l) => l.geometry.dispose());
      edges.forEach((l) => l.geometry.dispose());
      deckMaterial.dispose();
      laneMaterial.dispose();
      edgeMaterial.dispose();
      postMaterial.dispose();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(() => {
    const g = session.state;
    const width = g.config.laneWidth;
    // Snap the window to whole units so the ribbon does not shimmer.
    const from = Math.floor(g.distance) - TRACK_BEHIND;
    fillRoute(deck.data, from, TRACK_STEP, 0, width, 0);
    extrude(deck.data, width * 3 + 1.4, 0.16, deck.positions, deck.normals);
    (deck.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (deck.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    lanes.forEach((lane, i) => {
      fillRoute(lane.data, from, TRACK_STEP, i - 1, width, 0.09);
      extrude(lane.data, 0.05, 0.02, lane.positions, lane.normals);
      (lane.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (lane.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    });
    const edgeLane = 1.5 + 0.7 / width;
    edges.forEach((edge, i) => {
      fillRoute(edge.data, from, TRACK_STEP, i === 0 ? -edgeLane : edgeLane, width, 0.12);
      extrude(edge.data, 0.12, 0.2, edge.positions, edge.normals);
      (edge.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (edge.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    });
    // Distance posts along both edges give a sense of speed.
    if (posts.current) {
      const first = Math.ceil((g.distance - 6) / POST_SPACING) * POST_SPACING;
      for (let i = 0; i < POST_COUNT; i++) {
        const s = first + Math.floor(i / 2) * POST_SPACING;
        const side = i % 2 === 0 ? -1 : 1;
        const p = lanePosition(s, side * (edgeLane + 0.25), width, 0.9);
        postPos.set(p.x, p.y, p.z);
        postScale.set(1, 1, 1);
        postMatrix.compose(postPos, postQuat, postScale);
        posts.current.setMatrixAt(i, postMatrix);
      }
      posts.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh geometry={deck.geometry} material={deckMaterial} frustumCulled={false} />
      {lanes.map((l, i) => (
        <mesh key={i} geometry={l.geometry} material={laneMaterial} frustumCulled={false} />
      ))}
      {edges.map((l, i) => (
        <mesh key={`e${i}`} geometry={l.geometry} material={edgeMaterial} frustumCulled={false} />
      ))}
      <instancedMesh ref={posts} args={[undefined, postMaterial, POST_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.06, 1.6, 0.06]} />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Objects: one instanced mesh per kind                                  */
/* ------------------------------------------------------------------ */

const KIND_ORDER = ["token", "fault", "gate", "shield", "retry", "burst"] as const;
const MAX_PER_KIND = 64;

function Objects({ session }: { session: GameSession }) {
  const refs = useRef<Record<string, THREE.InstancedMesh | null>>({});
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const scl = useMemo(() => new THREE.Vector3(), []);

  const geometries = useMemo(
    () => ({
      token: new THREE.IcosahedronGeometry(0.3, 1),
      fault: new THREE.BoxGeometry(0.86, 0.86, 0.86),
      gate: new THREE.BoxGeometry(1.5, 0.14, 0.26),
      shield: new THREE.TorusGeometry(0.4, 0.06, 10, 28),
      retry: new THREE.OctahedronGeometry(0.32, 0),
      burst: new THREE.ConeGeometry(0.3, 0.7, 12),
    }),
    [],
  );
  const materials = useMemo(
    () => ({
      token: new THREE.MeshStandardMaterial({ color: "#5fe0c6", emissive: "#5fe0c6", emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.2 }),
      fault: new THREE.MeshStandardMaterial({ color: "#3a0d10", emissive: "#ff3b3b", emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.6 }),
      gate: new THREE.MeshStandardMaterial({ color: "#8a6a1a", emissive: "#f2c14e", emissiveIntensity: 0.9, roughness: 0.4 }),
      shield: new THREE.MeshStandardMaterial({ color: "#dfe3e9", emissive: "#ffffff", emissiveIntensity: 0.35, metalness: 1, roughness: 0.2 }),
      retry: new THREE.MeshStandardMaterial({ color: "#9ff3ff", emissive: "#7fe6ff", emissiveIntensity: 0.9, roughness: 0.3 }),
      burst: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#d9fff6", emissiveIntensity: 1.2, roughness: 0.2 }),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
    [geometries, materials],
  );

  useFrame((state) => {
    const g = session.state;
    const width = g.config.laneWidth;
    const time = state.clock.elapsedTime;
    const counts: Record<string, number> = {};
    for (const kind of KIND_ORDER) counts[kind] = 0;
    for (const o of g.objects) {
      const mesh = refs.current[o.kind];
      if (!mesh) continue;
      const i = counts[o.kind]++;
      if (i >= MAX_PER_KIND) continue;
      const p = lanePosition(o.at, o.lane, width, o.kind === "gate" ? 0.6 : 0.62);
      pos.set(p.x, p.y + (o.kind === "token" ? Math.sin(time * 3 + o.id) * 0.06 : 0), p.z);
      if (o.spent) scl.setScalar(0.0001);
      else scl.setScalar(1);
      if (o.kind === "token" || o.kind === "retry") e.set(time * 1.2 + o.id, time * 1.7, 0);
      else if (o.kind === "shield") e.set(Math.PI / 2, time * 0.8, 0);
      else if (o.kind === "burst") e.set(0, time * 2, 0);
      else e.set(0, 0, 0);
      q.setFromEuler(e);
      matrix.compose(pos, q, scl);
      mesh.setMatrixAt(i, matrix);
    }
    for (const kind of KIND_ORDER) {
      const mesh = refs.current[kind];
      if (!mesh) continue;
      mesh.count = Math.min(MAX_PER_KIND, counts[kind]);
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {KIND_ORDER.map((kind) => (
        <instancedMesh
          key={kind}
          ref={(el) => {
            refs.current[kind] = el;
          }}
          args={[geometries[kind], materials[kind], MAX_PER_KIND]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Pulse, camera, lights                                                 */
/* ------------------------------------------------------------------ */

function Pulse({ session }: { session: GameSession }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const trail = useRibbonGeometry(24);
  const trailMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#8ff0dc", transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false }),
    [],
  );
  useEffect(() => () => trailMaterial.dispose(), [trailMaterial]);

  useFrame((state) => {
    const g = session.state;
    const width = g.config.laneWidth;
    const p = lanePosition(g.distance, g.laneX, width, 0.62);
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.position.set(p.x, p.y, p.z);
      const hit = g.t < g.hitUntil && g.phase === "running";
      const flicker = hit ? (Math.sin(t * 40) > 0 ? 1 : 0.25) : 1;
      group.current.scale.setScalar(flicker);
    }
    if (ring.current) {
      ring.current.visible = g.shield;
      ring.current.rotation.y = t * 1.5;
      ring.current.rotation.x = Math.PI / 2 + Math.sin(t * 2) * 0.2;
    }
    if (light.current) light.current.intensity = g.t < g.burstUntil ? 14 : 8;
    // Trail follows the recent route behind the pulse.
    const n = trail.data.w.length;
    for (let k = 0; k < n; k++) {
      const back = (1 - k / (n - 1)) * 7;
      const s = g.distance - back;
      const lp = lanePosition(s, g.laneX, width, 0.62);
      trail.data.p[k * 3] = lp.x;
      trail.data.p[k * 3 + 1] = lp.y;
      trail.data.p[k * 3 + 2] = lp.z;
      trail.data.u[k * 3] = 0;
      trail.data.u[k * 3 + 1] = 1;
      trail.data.u[k * 3 + 2] = 0;
      trail.data.w[k] = k / (n - 1);
    }
    trail.data.twist = 0;
    extrude(trail.data, 0.34, 0.1, trail.positions, trail.normals);
    (trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (trail.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <>
      <group ref={group}>
        <mesh>
          <sphereGeometry args={[0.3, 24, 18]} />
          <meshStandardMaterial color="#d9fff6" emissive="#bffff0" emissiveIntensity={1.4} roughness={0.2} />
        </mesh>
        <mesh ref={ring} visible={false}>
          <torusGeometry args={[0.62, 0.035, 8, 40]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <pointLight ref={light} color="#5fe0c6" intensity={8} distance={9} decay={2} />
      </group>
      <mesh geometry={trail.geometry} material={trailMaterial} frustumCulled={false} />
    </>
  );
}

function FollowCamera({ session, reduced }: { session: GameSession; reduced: boolean }) {
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const shake = useRef(0);
  useEffect(() => session.onEvent((e) => {
    if (e.type === "fault" && !e.absorbed) shake.current = reduced ? 0 : 0.35;
  }), [session, reduced]);

  useFrame((state, delta) => {
    const g = session.state;
    const cam = state.camera;
    const width = g.config.laneWidth;
    const portrait = state.size.height > state.size.width;
    const back = portrait ? 8.5 : 7;
    const height = portrait ? 3.6 : 2.7;
    const cp = lanePosition(g.distance - back, g.laneX * 0.3, width, height);
    desired.set(cp.x, cp.y, cp.z);
    const k = 1 - Math.exp(-delta * 6);
    cam.position.lerp(desired, g.phase === "ready" ? 1 : k);
    const look = routeAt(g.distance + (portrait ? 14 : 11));
    target.set(look.x, look.y + 0.7, look.z);
    if (shake.current > 0) {
      shake.current = Math.max(0, shake.current - delta);
      const a = shake.current * 0.12;
      cam.position.x += (Math.random() - 0.5) * a;
      cam.position.y += (Math.random() - 0.5) * a;
    }
    cam.lookAt(target);
    const pc = cam as THREE.PerspectiveCamera;
    const fov = portrait ? 62 : 52;
    if (Math.abs(pc.fov - fov) > 0.01) {
      pc.fov = fov;
      pc.updateProjectionMatrix();
    }
  });
  return null;
}

function Loop({ session }: { session: GameSession }) {
  useFrame((_, delta) => session.tick(delta));
  return null;
}

function ContextGuard({ onLost }: { onLost: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onLost();
    };
    el.addEventListener("webglcontextlost", lost);
    return () => el.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}

export default function GameScene({
  session,
  reduced,
  onContextLost,
}: {
  session: GameSession;
  reduced: boolean;
  onContextLost: () => void;
}) {
  return (
    <Canvas
      frameloop="always"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      camera={{ fov: 52, near: 0.1, far: 220, position: [0, 3, 8] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.setClearColor(new THREE.Color("#050507"), 1);
        scene.fog = new THREE.FogExp2(new THREE.Color("#050507"), 0.024);
      }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
      role="presentation"
    >
      <ContextGuard onLost={onContextLost} />
      <Loop session={session} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 8, 2]} intensity={1.1} color="#ffffff" />
      <directionalLight position={[-6, 3, -4]} intensity={0.4} color="#c8f5ea" />
      <Environment resolution={128} frames={1} background={false}>
        <Lightformer form="rect" intensity={2.5} color="#ffffff" position={[0, 6, 0]} scale={[14, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#dfe6f2" position={[0, 2.5, -24]} scale={[60, 7, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#a9efe0" position={[0, 1.5, 24]} scale={[60, 4, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={4} color="#e9f1ff" position={[-8, 2, -4]} scale={[1, 10, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color="#a9efe0" position={[8, -1, -3]} scale={[0.8, 10, 1]} target={[0, 0, 0]} />
      </Environment>
      <Track session={session} />
      <Objects session={session} />
      <Pulse session={session} />
      <FollowCamera session={session} reduced={reduced} />
    </Canvas>
  );
}
