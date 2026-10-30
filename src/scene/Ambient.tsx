import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GOOGLE_MATS, mats } from './materials';
import { kick, scene } from './state';

type GlyphKind = 'plus' | 'circle' | 'slash' | 'chevron';

/** Fat brand glyphs (plus, circle, //, >) rebuilt as flat 3D shapes. */
function Glyph({ kind, material }: { kind: GlyphKind; material: THREE.Material }) {
  switch (kind) {
    case 'plus':
      return (
        <group>
          <mesh material={material}><boxGeometry args={[0.6, 0.2, 0.08]} /></mesh>
          <mesh material={material}><boxGeometry args={[0.2, 0.6, 0.08]} /></mesh>
        </group>
      );
    case 'circle':
      return (
        <mesh material={material} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.08, 40]} />
        </mesh>
      );
    case 'slash':
      return (
        <group rotation={[0, 0, -0.45]}>
          <mesh material={material} position={[-0.14, 0, 0]}><boxGeometry args={[0.1, 0.7, 0.08]} /></mesh>
          <mesh material={material} position={[0.14, 0, 0]}><boxGeometry args={[0.1, 0.7, 0.08]} /></mesh>
        </group>
      );
    case 'chevron':
      return (
        <group>
          <mesh material={material} position={[0, 0.12, 0]} rotation={[0, 0, -0.75]}><boxGeometry args={[0.4, 0.12, 0.08]} /></mesh>
          <mesh material={material} position={[0, -0.12, 0]} rotation={[0, 0, 0.75]}><boxGeometry args={[0.4, 0.12, 0.08]} /></mesh>
        </group>
      );
  }
}

const KINDS: GlyphKind[] = ['plus', 'circle', 'slash', 'chevron'];

const GLYPHS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const radius = 4.2 + (i % 3) * 1.4;
  return {
    kind: KINDS[i % 4],
    material: GOOGLE_MATS[(i * 3) % 4],
    base: new THREE.Vector3(Math.cos(angle) * radius, 2.6 + Math.sin(angle * 2) * 1.6 + (i % 2), -3.5 - (i % 4) * 1.3),
    phase: i * 1.37,
    scale: 0.6 + (i % 3) * 0.25,
  };
});

export function Ambient() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const ringMats = useMemo(() => [0, 1, 2].map(() => mats.ring.clone()), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const motion = scene.reducedMotion ? 0.15 : 1;
    const k = kick(scene.beat, 4) * scene.energy * motion;

    GLYPHS.forEach((g, i) => {
      const el = refs.current[i];
      if (!el) return;
      el.position.set(
        g.base.x + Math.sin(t * 0.3 + g.phase) * 0.3 * motion,
        g.base.y + Math.sin(t * 0.5 + g.phase) * 0.4 * motion,
        g.base.z,
      );
      el.rotation.set(Math.sin(t * 0.2 + g.phase) * 0.4 * motion, t * 0.25 * motion + g.phase, Math.cos(t * 0.15 + g.phase) * 0.3 * motion);
      el.scale.setScalar(g.scale * (1 + k * 0.12));
    });

    // Beat rings spreading across the floor from the booth.
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const phase = ((scene.beat + i * 4 / 3) / 4) % 1;
      ring.scale.setScalar(1.6 + phase * 6);
      ringMats[i].color.copy(mats.ring.color);
      ringMats[i].opacity = (1 - phase) * 0.35 * scene.energy * motion;
    });
  });

  return (
    <group>
      {GLYPHS.map((g, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <Glyph kind={g.kind} material={g.material} />
        </group>
      ))}
      {ringMats.map((m, i) => (
        <mesh key={i} ref={(el) => (rings.current[i] = el)} material={m} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[0.98, 1, 96]} />
        </mesh>
      ))}
    </group>
  );
}
