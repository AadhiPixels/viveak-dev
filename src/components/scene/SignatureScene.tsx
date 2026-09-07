"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RibbonSystem } from "./RibbonSystem";
import { resolveBeat } from "./ribbon-math";
import { COMPOSITIONS, QUALITY, lerp, lerp3, type Quality } from "./compositions";
import { heroProgress, onHeroProgress } from "./progress";

interface SceneProps {
  quality: Quality;
  /** True while the hero is on screen and motion is enabled; drives ambient pulses. */
  active: boolean;
  ambient: boolean;
  onReady?: () => void;
  onContextLost?: () => void;
  /** Fixed progress for poster generation. */
  fixedProgress?: number;
}

function Sculpture({ quality, active, ambient, onReady, fixedProgress }: SceneProps) {
  const settings = QUALITY[quality];
  const system = useMemo(() => new RibbonSystem(settings), [settings]);
  const invalidate = useThree((s) => s.invalidate);
  const current = useRef(fixedProgress ?? heroProgress.target);
  const readyRef = useRef(false);
  const tmpA = useRef<[number, number, number]>([0, 0, 0]);
  const tmpB = useRef<[number, number, number]>([0, 0, 0]);
  const tmpC = useRef<[number, number, number]>([0, 0, 0]);
  const lookTarget = useRef(new THREE.Vector3());

  useEffect(() => () => system.dispose(), [system]);

  // Re-render whenever scroll progress or variant changes.
  useEffect(() => onHeroProgress(() => invalidate()), [invalidate]);

  // Warm-up: a short burst of frames after mount so the environment map and
  // the first composition are fully rendered even when nothing else invalidates.
  useEffect(() => {
    let n = 0;
    let raf = 0;
    const tick = () => {
      invalidate();
      if (++n < 30) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [invalidate]);

  // Ambient pulses: a slow ticker, only while active and ambient motion allowed.
  useEffect(() => {
    if (!active || !ambient) return;
    const id = window.setInterval(() => invalidate(), 1000 / settings.pulseFps);
    return () => window.clearInterval(id);
  }, [active, ambient, invalidate, settings.pulseFps]);

  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const target = fixedProgress ?? heroProgress.target;
    const diff = target - current.current;
    if (Math.abs(diff) > 0.0004) {
      // Frame-rate independent smoothing; converges the same way in both directions.
      const k = 1 - Math.exp(-Math.min(delta, 0.05) * 14);
      current.current += diff * k;
      invalidate();
    } else {
      current.current = target;
    }
    const p = current.current;
    system.setProgress(p);

    const comp = COMPOSITIONS[heroProgress.variant];
    const { a, b, s } = resolveBeat(p);
    const ga = comp.group[a];
    const gb = comp.group[b];
    const ca = comp.camera[a];
    const cb = comp.camera[b];

    lerp3(ga.position, gb.position, s, tmpA.current);
    system.group.position.set(tmpA.current[0], tmpA.current[1], tmpA.current[2]);
    lerp3(ga.rotation, gb.rotation, s, tmpB.current);
    system.group.rotation.set(tmpB.current[0], tmpB.current[1], tmpB.current[2]);
    const sc = lerp(ga.scale, gb.scale, s);
    system.group.scale.setScalar(sc);
    system.setLighting(lerp(ga.light, gb.light, s), lerp(ga.glow, gb.glow, s));

    lerp3(ca.position, cb.position, s, tmpC.current);
    camera.position.set(tmpC.current[0], tmpC.current[1], tmpC.current[2]);
    lerp3(ca.target, cb.target, s, tmpA.current);
    lookTarget.current.set(tmpA.current[0], tmpA.current[1], tmpA.current[2]);
    camera.lookAt(lookTarget.current);
    const fov = lerp(ca.fov, cb.fov, s);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    if (ambient) system.updatePulses(state.clock.elapsedTime);
    else system.updatePulses(0);

    if (!readyRef.current) {
      readyRef.current = true;
      // Let this frame reach the screen before revealing the canvas.
      window.setTimeout(() => onReady?.(), 0);
    }
  });

  return <primitive object={system.group} />;
}

function ContextGuard({ onContextLost }: { onContextLost?: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onContextLost?.();
    };
    el.addEventListener("webglcontextlost", lost);
    return () => el.removeEventListener("webglcontextlost", lost);
  }, [gl, onContextLost]);
  return null;
}

/** Simple frame-time monitor: steps the pixel ratio down if frames are slow. */
function QualityMonitor({ maxDpr }: { maxDpr: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const samples = useRef<number[]>([]);
  const level = useRef(maxDpr);
  useFrame((_, delta) => {
    if (delta <= 0 || delta > 0.25) return;
    const arr = samples.current;
    arr.push(delta);
    if (arr.length < 40) return;
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    samples.current = [];
    if (avg > 0.03 && level.current > 1) {
      level.current = Math.max(1, level.current - 0.25);
      setDpr(level.current);
    }
  });
  return null;
}

export default function SignatureScene(props: SceneProps) {
  const settings = QUALITY[props.quality];
  return (
    <Canvas
      frameloop={props.fixedProgress !== undefined ? "always" : "demand"}
      dpr={[1, settings.maxDpr]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: props.fixedProgress !== undefined,
        failIfMajorPerformanceCaveat: false,
      }}
      camera={{ fov: 36, near: 0.1, far: 60, position: [0, 0, 6.4] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.02;
        gl.setClearColor(0x000000, 0);
        scene.fog = new THREE.Fog(new THREE.Color("#050507"), 9, 17);
      }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden="true"
      role="presentation"
    >
      <ContextGuard onContextLost={props.onContextLost} />
      {props.fixedProgress === undefined ? <QualityMonitor maxDpr={settings.maxDpr} /> : null}
      <directionalLight position={[3, 6, 4]} intensity={1.4} color="#ffffff" />
      <directionalLight position={[-5, -2, 3]} intensity={0.35} color="#c8f5ea" />
      <Environment resolution={settings.envResolution} frames={1} background={false}>
        {/* Studio: a broad top softbox, a cool rim, a faint emerald rim and a low front fill. */}
        <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[0, 6, 1]} scale={[12, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={7} color="#e9f1ff" position={[-7, 2.5, -3]} scale={[1.1, 9, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={4.5} color="#a9efe0" position={[7, -1.5, -2]} scale={[0.8, 9, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={1.1} color="#ffffff" position={[0, -5, 7]} scale={5} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 0, 9]} scale={[6, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      <Sculpture {...props} />
    </Canvas>
  );
}
