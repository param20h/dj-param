import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, ContactShadows, Grid, PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing';
import { Robot } from './Robot';
import { DjDeck } from './DjDeck';
import { Ambient } from './Ambient';
import { Lights } from './Lights';
import { Particles } from './Particles';
import { mats, updateMaterials } from './materials';
import { BPM, damp, introProgress, kick, scene, smoothstep } from './state';

const LOOK_AT = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

/**
 * Keeps the booth framed from 320px portrait to ultrawide, with gentle pointer parallax.
 * Before Start it slowly orbits from a high, wide vantage; on Start it dollies into the framing.
 */
function CameraRig() {
  const { camera, size } = useThree();

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const portrait = aspect < 0.8;
    // Fit the booth (≈4.2 wide; speakers may crop on phones) and the robot (≈3.6 tall).
    const fitWidth = (portrait ? 3.5 : 5.4) / (2 * tanHalf * aspect);
    const fitHeight = 4.0 / (2 * tanHalf);
    const distance = Math.max(fitWidth, fitHeight);
    // Bias the robot upward so the bottom control dock never covers its face.
    const lookY = portrait ? 1.05 : 1.6;

    const px = scene.reducedMotion ? 0 : state.pointer.x;
    const py = scene.reducedMotion ? 0 : state.pointer.y;
    const framedX = px * 0.6;
    const framedY = 2.3 + py * 0.3;

    // Pre-start orbit: wider, higher, drifting side to side.
    const orbit = scene.reducedMotion ? 0 : Math.sin(t * 0.18) * 0.5;
    const wideD = distance * 1.25;
    const orbitX = Math.sin(orbit) * wideD;
    const orbitZ = Math.cos(orbit) * wideD;
    const orbitY = 3.4;

    // 0 = orbit, 1 = framed. Eased so the dolly starts and lands softly.
    const w = scene.startedAt < 0 ? 0 : smoothstep(0, 1, introProgress(t));
    const tx = orbitX + (framedX - orbitX) * w;
    const ty = orbitY + (framedY - orbitY) * w;
    const tz = orbitZ + (distance - orbitZ) * w;
    const lambda = w > 0 && w < 1 ? 12 : 3;

    cam.position.x = damp(cam.position.x, tx, lambda, dt);
    cam.position.y = damp(cam.position.y, ty, lambda, dt);
    cam.position.z = damp(cam.position.z, tz, w > 0 && w < 1 ? 12 : 4, dt);
    lookTarget.set(0, lookY + (1 - w) * 0.2, 0);
    LOOK_AT.lerp(lookTarget, 1 - Math.exp(-8 * dt));
    cam.lookAt(LOOK_AT);
  });

  return null;
}

/** One clock for the whole scene: beat only advances while music is playing. */
function Conductor() {
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    if (scene.started && scene.startedAt < 0) scene.startedAt = t;
    const playing = scene.mode === 'playing';
    if (playing) scene.beat += (dt * BPM) / 60;
    scene.energy = damp(scene.energy, playing ? 1 : 0, playing ? 1.5 : 3, dt);
    updateMaterials(dt, t);
  }, -1);
  return null;
}

const SECTION_BASE = new THREE.Color('#c7d2e1');
const sectionTarget = new THREE.Color();

/** Infinite grid whose section lines flash toward the accent on the kick. */
function Floor() {
  const grid = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const mat = grid.current?.material as THREE.ShaderMaterial | undefined;
    const uniform = mat?.uniforms?.sectionColor;
    if (!uniform) return;
    const k = kick(scene.beat, 4) * scene.energy * (scene.reducedMotion ? 0.3 : 1);
    sectionTarget.copy(mats.accent.color).multiplyScalar(0.55);
    (uniform.value as THREE.Color).copy(SECTION_BASE).lerp(sectionTarget, k);
  });
  return (
    <Grid
      ref={grid}
      position={[0, 0, 0]}
      args={[40, 40]}
      cellSize={0.5}
      cellThickness={0.6}
      cellColor="#dbe3ee"
      sectionSize={2}
      sectionThickness={1}
      sectionColor="#c7d2e1"
      fadeDistance={22}
      fadeStrength={1.5}
      infiniteGrid
    />
  );
}

/** Bloom only catches the glow materials (colors pushed above 1.0); low quality drops it. */
function Effects({ quality }: { quality: 'high' | 'low' }) {
  if (quality === 'low') return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} radius={0.7} />
      <Vignette offset={0.25} darkness={0.12} />
      <SMAA />
    </EffectComposer>
  );
}

export function Stage() {
  const [quality, setQuality] = useState<'high' | 'low'>('high');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => (scene.reducedMotion = mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    scene.quality = quality;
  }, [quality]);

  return (
    <div className="fixed inset-0" aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 35, position: [0, 3.4, 16], near: 0.1, far: 60 }}
        gl={{ antialias: quality === 'low', powerPreference: 'high-performance' }}
      >
        {/* factor starts at 0.5 and steps 0.1 per slow measurement window: only a sustained drop lowers quality, not one startup hitch. */}
        <PerformanceMonitor
          factor={0.5}
          step={0.1}
          onChange={({ factor }) => factor <= 0.2 && setQuality('low')}
          flipflops={4}
          onFallback={() => setQuality('low')}
        />
        <AdaptiveDpr pixelated={false} />
        <color attach="background" args={['#f4f7fb']} />
        <fog attach="fog" args={['#f4f7fb', 9, 22]} />
        <hemisphereLight args={['#ffffff', '#d6deea', 1.1]} />
        <directionalLight position={[3, 6, 5]} intensity={2.2} />
        <directionalLight position={[-4, 3, -3]} intensity={0.6} />

        <Conductor />
        <CameraRig />
        <Floor />
        <ContactShadows position={[0, 0.01, 0]} scale={10} far={3} blur={2.4} opacity={0.6} resolution={512} frames={60} color="#000000" />
        <Ambient />
        <Lights />
        <DjDeck />
        <Robot />
        <Particles />
        <Effects quality={quality} />
      </Canvas>
    </div>
  );
}
