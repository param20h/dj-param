import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GOOGLE_HEX, mats } from './materials';
import { kick, scene } from './state';

const DUST_COUNT = 240;
const BURST_COUNT = 64;
const BURST_LIFE = 1.8;
const GRAVITY = -5.5;

const DUST_HEIGHT = 5.5;

/**
 * Accent-tinted dust drifting up through the light beams. All motion runs in the vertex shader:
 * the CPU only advances `uRise` (so drift speed can follow energy without the dots jumping).
 */
function Dust() {
  const points = useRef<THREE.Points>(null);
  const rise = useRef(0);
  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(DUST_COUNT * 3);
    const seed = new Float32Array(DUST_COUNT);
    for (let i = 0; i < DUST_COUNT; i++) {
      // A volume around and in front of the booth, so the dots aren't hidden behind it.
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = Math.random() * DUST_HEIGHT;
      pos[i * 3 + 2] = -2.5 + Math.random() * 4.5;
      seed[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, DUST_HEIGHT / 2, 0), 10);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRise: { value: 0 },
        uBeat: { value: 0 },
        uEnergy: { value: 0 },
        uMotion: { value: 1 },
        uColor: { value: new THREE.Color() },
        uViewHeight: { value: 800 },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uRise;
        uniform float uBeat;
        uniform float uViewHeight;
        uniform float uMotion;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          // Rise and wrap; each particle drifts at its own speed and sways sideways.
          p.y = mod(p.y + uRise * (0.6 + aSeed * 0.8), ${DUST_HEIGHT.toFixed(1)});
          p.x += sin(uTime * 0.35 + aSeed * 40.0) * 0.35 * uMotion;
          p.z += cos(uTime * 0.27 + aSeed * 25.0) * 0.25 * uMotion;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;

          // World-space size → pixels, same attenuation as three's PointsMaterial (drawing-buffer height).
          float size = mix(0.08, 0.28, aSeed * aSeed) * (1.0 + uBeat * 0.7);
          gl_PointSize = size * uViewHeight * 0.5 / -mv.z;

          // Fade in at the floor and out at the top so wrapping is invisible; twinkle per particle.
          float edge = smoothstep(0.0, 0.6, p.y) * (1.0 - smoothstep(${(DUST_HEIGHT - 1.2).toFixed(1)}, ${DUST_HEIGHT.toFixed(1)}, p.y));
          float twinkle = 0.55 + 0.45 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 60.0);
          vAlpha = edge * twinkle;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uEnergy;
        uniform float uBeat;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          // Bright core + soft halo.
          float disc = smoothstep(0.5, 0.0, d);
          float core = smoothstep(0.18, 0.0, d);
          float a = (disc * disc * 0.6 + core) * vAlpha * (0.55 + uEnergy * 0.35 + uBeat * 0.4);
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const motion = scene.reducedMotion ? 0.1 : 1;
    // Low quality keeps the dust but thins it out.
    geometry.setDrawRange(0, scene.quality === 'high' ? DUST_COUNT : DUST_COUNT / 3);
    rise.current += (0.12 + scene.energy * 0.4) * motion * dt;

    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uRise.value = rise.current;
    u.uBeat.value = kick(scene.beat, 4) * scene.energy * motion;
    u.uEnergy.value = scene.energy;
    u.uMotion.value = motion;
    u.uViewHeight.value = state.size.height * state.gl.getPixelRatio();
    (u.uColor.value as THREE.Color).copy(mats.accentGlow.color);
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

/** One-shot burst of four-color confetti from the deck on every track change. */
function Burst() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const lastChange = useRef(0);
  const startedAt = useRef(-10);
  const sim = useMemo(
    () =>
      Array.from({ length: BURST_COUNT }, () => ({
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        size: 0,
      })),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.8, 1.8), toneMapped: false }), []);

  // Colors must exist before the first render so the material compiles with instance colors.
  useLayoutEffect(() => {
    const el = mesh.current;
    if (!el) return;
    const color = new THREE.Color();
    for (let i = 0; i < BURST_COUNT; i++) el.setColorAt(i, color.set(GOOGLE_HEX[i % 4]));
  }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const el = mesh.current;
    if (!el) return;

    if (scene.trackChangedAt !== lastChange.current) {
      lastChange.current = scene.trackChangedAt;
      if (scene.trackChangedAt > 0 && !scene.reducedMotion && scene.quality === 'high') {
        startedAt.current = t;
        sim.forEach((s, i) => {
          const side = i % 2 ? 1 : -1;
          s.p.set(side * (0.6 + Math.random() * 1.0), 1.5, 0.1 + Math.random() * 0.3);
          s.v.set(side * (0.4 + Math.random() * 1.6), 3 + Math.random() * 3, 0.5 + Math.random() * 1.6);
          s.spin.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
          s.size = 0.05 + Math.random() * 0.06;
        });
      }
    }

    const age = t - startedAt.current;
    el.visible = age < BURST_LIFE;
    if (!el.visible) return;
    const fade = 1 - age / BURST_LIFE;
    sim.forEach((s, i) => {
      s.v.y += GRAVITY * dt;
      s.v.multiplyScalar(1 - 0.6 * dt);
      s.p.addScaledVector(s.v, dt);
      dummy.position.copy(s.p);
      dummy.rotation.set(s.spin.x * age, s.spin.y * age, s.spin.z * age);
      dummy.scale.setScalar(s.size * fade);
      dummy.updateMatrix();
      el.setMatrixAt(i, dummy.matrix);
    });
    el.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, material, BURST_COUNT]} visible={false} frustumCulled={false}>
      <boxGeometry args={[1, 1, 0.3]} />
    </instancedMesh>
  );
}

export function Particles() {
  return (
    <group>
      <Dust />
      <Burst />
    </group>
  );
}
