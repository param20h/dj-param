import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Edges, RoundedBox, Text } from '@react-three/drei';
import { GOOGLE_GLOW, GOOGLE_MATS, mats } from './materials';
import { damp, kick, scene } from './state';

const HAIRLINE = '#f0f0f0';
const TOP_Y = 1.32;

const VU_SEGMENTS = 7;
/** Bottom-up segment colors: green → yellow → red, like a real meter. */
const VU_COLOR = [3, 3, 3, 3, 2, 2, 1];

interface TurntableRefs {
  spin: React.RefObject<THREE.Group>;
  arm: React.RefObject<THREE.Group>;
  jog: React.RefObject<THREE.Mesh>;
}

function Turntable({ x, refs }: { x: number; refs: TurntableRefs }) {
  return (
    <group position={[x, TOP_Y, 0.05]}>
      <RoundedBox args={[1.05, 0.08, 0.95]} radius={0.03} position={[0, 0.04, 0]} material={mats.deckTop} />
      <group ref={refs.spin} position={[0, 0.1, 0]}>
        <mesh material={mats.vinyl}>
          <cylinderGeometry args={[0.4, 0.4, 0.03, 48]} />
        </mesh>
        {[0.3, 0.22].map((r) => (
          <mesh key={r} material={mats.groove} position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r, r + 0.008, 48]} />
          </mesh>
        ))}
        <mesh material={mats.label} position={[0, 0.018, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.005, 32]} />
        </mesh>
        {/* marker so the spin reads */}
        <mesh material={mats.vinyl} position={[0.07, 0.022, 0]}>
          <boxGeometry args={[0.1, 0.004, 0.025]} />
        </mesh>
      </group>
      {/* jog ring light */}
      <mesh ref={refs.jog} material={mats.accentGlow} position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.43, 0.455, 64]} />
      </mesh>
      {/* tonearm: swings onto the record while playing, lifts off when paused */}
      <group ref={refs.arm} position={[0.42, 0.12, -0.32]} rotation={[0, 0.5, 0]}>
        <mesh material={mats.metal}>
          <cylinderGeometry args={[0.04, 0.05, 0.06, 16]} />
        </mesh>
        <mesh material={mats.metal} position={[0, 0.04, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.45, 8]} />
        </mesh>
      </group>
    </group>
  );
}

export function DjDeck() {
  const leftDeck: TurntableRefs = { spin: useRef(null), arm: useRef(null), jog: useRef(null) };
  const rightDeck: TurntableRefs = { spin: useRef(null), arm: useRef(null), jog: useRef(null) };
  const vu = useRef<(THREE.Mesh | null)[]>([]);
  const vuLevel = useRef([0, 0]);
  const fader = useRef<THREE.Mesh>(null);
  const pads = useRef<(THREE.Mesh | null)[]>([]);
  const knobs = useRef<(THREE.Mesh | null)[]>([]);
  const woofers = useRef<(THREE.Group | null)[]>([]);
  const speed = useRef(0);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const playing = scene.mode === 'playing';
    // 33⅓ rpm ≈ 3.5 rad/s; spin down gently on pause like a real platter.
    speed.current = damp(speed.current, playing ? 3.5 : 0, playing ? 3 : 1.2, dt);
    [leftDeck, rightDeck].forEach((deck, i) => {
      if (deck.spin.current) deck.spin.current.rotation.y -= speed.current * dt * (i ? 1.03 : 1);
      if (deck.jog.current) deck.jog.current.rotation.z += speed.current * dt * 0.5;
      const arm = deck.arm.current;
      if (arm) arm.rotation.y = damp(arm.rotation.y, scene.startedAt >= 0 && scene.mode !== 'paused' ? -0.32 : 0.5, 2.5, dt);
    });

    if (fader.current) fader.current.position.x = damp(fader.current.position.x, scene.fader * 0.16, 20, dt);

    const k = kick(scene.beat, 6) * scene.energy;
    pads.current.forEach((pad, i) => {
      if (!pad) return;
      const lit = scene.pad === i % 4 && i < 4 ? 1 : 0;
      const beatLit = Math.floor(scene.beat) % 4 === i % 4 && i >= 4 ? k : 0;
      pad.scale.y = damp(pad.scale.y, 1 + (lit + beatLit) * 2.5, 20, dt);
      // Lit pads switch to the glow material so they bloom.
      pad.material = lit + beatLit > 0.3 ? GOOGLE_GLOW[i % 4] : GOOGLE_MATS[i % 4];
    });
    knobs.current.forEach((knob, i) => {
      if (knob) knob.rotation.y = Math.sin(scene.beat * 0.25 + i * 2) * 1.2 * scene.energy;
    });
    woofers.current.forEach((w) => w?.scale.setScalar(1 + k * 0.12));

    // VU meters: pseudo-levels from the beat (raw audio is out of scope), fast attack, slow release.
    vuLevel.current.forEach((level, side) => {
      const target = scene.energy * (0.45 + 0.45 * kick(scene.beat + side * 0.12, 3) + 0.15 * Math.sin(t * (7 + side * 3)));
      vuLevel.current[side] = target > level ? damp(level, target, 30, dt) : damp(level, target, 5, dt);
      for (let j = 0; j < VU_SEGMENTS; j++) {
        const seg = vu.current[side * VU_SEGMENTS + j];
        if (seg) seg.material = vuLevel.current[side] * VU_SEGMENTS > j + 0.5 ? GOOGLE_GLOW[VU_COLOR[j]] : mats.screen;
      }
    });
  });

  return (
    <group>
      {/* booth body: layered dark surfaces + hairline edges instead of shadows */}
      <mesh material={mats.deck} position={[0, TOP_Y / 2, 0]}>
        <boxGeometry args={[3.7, TOP_Y, 1.2]} />
        <Edges color={HAIRLINE} transparent opacity={0.14} />
      </mesh>
      <mesh material={mats.deckTop} position={[0, TOP_Y + 0.01, 0]}>
        <boxGeometry args={[3.76, 0.02, 1.26]} />
      </mesh>

      {/* front panel: four-color stripe + mono label */}
      {GOOGLE_GLOW.map((m, i) => (
        <mesh key={i} material={m} position={[-0.6 + i * 0.4, TOP_Y - 0.18, 0.605]}>
          <boxGeometry args={[0.4, 0.04, 0.01]} />
        </mesh>
      ))}
      {/* LED strip along the floor edge of the booth */}
      {GOOGLE_GLOW.map((m, i) => (
        <mesh key={`floor-${i}`} material={m} position={[-1.3875 + i * 0.925, 0.03, 0.605]}>
          <boxGeometry args={[0.925, 0.02, 0.01]} />
        </mesh>
      ))}
      <Text
        font={`${import.meta.env.BASE_URL}fonts/GoogleSansMono-Regular.ttf`}
        fontSize={0.075}
        letterSpacing={0.06}
        color="#7a7a7a"
        position={[0, TOP_Y - 0.65, 0.61]}
        anchorX="center"
        anchorY="middle"
      >
        PARAM20H
      </Text>

      <Turntable x={-1.15} refs={leftDeck} />
      <Turntable x={1.15} refs={rightDeck} />

      {/* mixer */}
      <group position={[0, TOP_Y, 0.05]}>
        <RoundedBox args={[0.95, 0.08, 0.95]} radius={0.03} position={[0, 0.04, 0]} material={mats.deckTop} />
        {[-0.25, 0, 0.25].map((x, i) => (
          <mesh key={x} ref={(el) => (knobs.current[i] = el)} material={mats.joint} position={[x, 0.12, -0.28]}>
            <cylinderGeometry args={[0.06, 0.07, 0.07, 6]} />
          </mesh>
        ))}
        {/* pads: top row follows the left hand, bottom row chases the beat */}
        {Array.from({ length: 8 }, (_, i) => (
          <mesh
            key={i}
            ref={(el) => (pads.current[i] = el)}
            material={GOOGLE_MATS[i % 4]}
            position={[-0.27 + (i % 4) * 0.18, 0.09, -0.05 + Math.floor(i / 4) * 0.16]}
          >
            <boxGeometry args={[0.13, 0.02, 0.12]} />
          </mesh>
        ))}
        {/* crossfader */}
        <mesh material={mats.screen} position={[0, 0.085, 0.3]}>
          <boxGeometry args={[0.46, 0.01, 0.04]} />
        </mesh>
        <mesh ref={fader} material={mats.accentGlow} position={[0, 0.12, 0.3]}>
          <boxGeometry args={[0.08, 0.06, 0.1]} />
        </mesh>
        {/* VU meters at the mixer's back corners */}
        {[-1, 1].map((s, side) =>
          Array.from({ length: VU_SEGMENTS }, (_, j) => (
            <mesh
              key={`${s}-${j}`}
              ref={(el) => (vu.current[side * VU_SEGMENTS + j] = el)}
              material={mats.screen}
              position={[s * 0.4, 0.1 + j * 0.035, -0.38]}
            >
              <boxGeometry args={[0.07, 0.022, 0.03]} />
            </mesh>
          )),
        )}
      </group>

      {/* speaker stacks */}
      {[-1, 1].map((s, i) => (
        <group key={s} position={[s * 2.75, 0, -0.4]}>
          <mesh material={mats.body} position={[0, 1.15, 0]}>
            <boxGeometry args={[1.0, 2.3, 0.9]} />
            <Edges color={HAIRLINE} transparent opacity={0.14} />
          </mesh>
          {[0.7, 1.65].map((y, j) => (
            <group key={y} ref={(el) => (woofers.current[i * 2 + j] = el)} position={[0, y, 0.46]}>
              <mesh material={mats.bodyDark} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[j === 0 ? 0.36 : 0.26, j === 0 ? 0.36 : 0.26, 0.04, 40]} />
              </mesh>
              <mesh material={mats.accent} position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.04, 24]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
