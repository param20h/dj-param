import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mats, GOOGLE_HEX } from './materials';
import { damp, introProgress, kick, scene, smoothstep } from './state';

const TRUSS_Y = 4.7;
const TRUSS_Z = -1.6;
const BEAM_LENGTH = 6.2;
const FIXTURE_X = [-2.4, -0.8, 0.8, 2.4];

/** Open cone hanging from the origin, fading out toward its far end and at grazing edges. */
function makeBeamGeometry() {
  const geo = new THREE.CylinderGeometry(0.06, 1.1, BEAM_LENGTH, 32, 1, true);
  geo.translate(0, -BEAM_LENGTH / 2, 0);
  return geo;
}

function makeBeamMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying float vAlong;
      varying float vFacing;
      void main() {
        vAlong = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFacing = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlong;
      varying float vFacing;
      void main() {
        float a = pow(vAlong, 1.8) * pow(vFacing, 2.0) * uOpacity;
        gl_FragColor = vec4(uColor * 1.6, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/** Overhead truss with four moving-head lights, one per Google color, sweeping on the beat. */
export function Lights() {
  const heads = useRef<(THREE.Group | null)[]>([]);
  const beamGeo = useMemo(makeBeamGeometry, []);
  const fixtures = useMemo(
    () =>
      GOOGLE_HEX.map((hex) => ({
        beam: makeBeamMaterial(hex),
        lens: new THREE.MeshBasicMaterial({ color: hex, toneMapped: false }),
        base: new THREE.Color(hex),
        power: 0,
      })),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const { beat, energy, mode, reducedMotion } = scene;
    const intro = introProgress(t);
    const motion = reducedMotion ? 0 : 1;

    fixtures.forEach((f, i) => {
      // Power on one after another during the intro.
      const on = scene.startedAt < 0 ? 0 : smoothstep(0.3 + i * 0.12, 0.45 + i * 0.12, intro);
      const level = mode === 'playing' ? 0.55 + kick(beat + i * 0.5, 3) * 0.45 * energy : mode === 'paused' ? 0.18 : 0.35;
      f.power = damp(f.power, on * level, 6, dt);
      f.beam.uniforms.uOpacity.value = f.power * 0.55;
      f.lens.color.copy(f.base).multiplyScalar(0.25 + f.power * 4);

      const head = heads.current[i];
      if (!head) return;
      const side = i < 2 ? -1 : 1;
      const pan = (Math.sin(beat * Math.PI * 0.125 + i * 1.3) * 0.45 * energy + side * -0.18) * motion;
      const tilt = -0.32 - Math.sin(beat * Math.PI * 0.25 + i * 0.9) * 0.22 * energy * motion;
      head.rotation.z = damp(head.rotation.z, pan, 4, dt);
      head.rotation.x = damp(head.rotation.x, tilt, 4, dt);
    });
  });

  return (
    <group position={[0, TRUSS_Y, TRUSS_Z]}>
      <mesh material={mats.joint}>
        <boxGeometry args={[6.4, 0.08, 0.08]} />
      </mesh>
      <mesh material={mats.joint} position={[0, 0.16, 0]}>
        <boxGeometry args={[6.4, 0.04, 0.04]} />
      </mesh>
      {FIXTURE_X.map((x, i) => (
        <group key={x} position={[x, -0.08, 0]}>
          <mesh material={mats.bodyDark} position={[0, -0.06, 0]}>
            <boxGeometry args={[0.22, 0.1, 0.16]} />
          </mesh>
          <group ref={(el) => (heads.current[i] = el)} position={[0, -0.16, 0]}>
            <mesh material={mats.body} position={[0, -0.1, 0]}>
              <cylinderGeometry args={[0.1, 0.13, 0.22, 20]} />
            </mesh>
            <mesh material={fixtures[i].lens} position={[0, -0.215, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.11, 24]} />
            </mesh>
            <mesh geometry={beamGeo} material={fixtures[i].beam} position={[0, -0.22, 0]} renderOrder={2} />
          </group>
        </group>
      ))}
    </group>
  );
}
