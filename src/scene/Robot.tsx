import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { GOOGLE_MATS, mats } from './materials';
import { damp, easeOutBack, INTRO_DURATION, introProgress, kick, scene, smoothstep, spring } from './state';

/* ------------------------------------------------------------------ */
/* Arm poses                                                           */
/* ------------------------------------------------------------------ */

/** Joint angles for one arm. `z` angles are mirrored per side (+ = away from the body). */
interface ArmPose {
  sx: number; // shoulder pitch (negative = forward)
  sy: number;
  sz: number; // shoulder abduction
  ex: number; // elbow pitch
  ez: number; // elbow side bend
  wx: number;
  wz: number;
}

const POSE_KEYS = ['sx', 'sy', 'sz', 'ex', 'ez', 'wx', 'wz'] as const;

const REST: ArmPose = { sx: -0.12, sy: 0, sz: 0.14, ex: -0.35, ez: 0, wx: 0, wz: 0 };
const ON_DECK: ArmPose = { sx: -0.18, sy: 0, sz: 0.24, ex: -1.4, ez: 0, wx: 0.15, wz: 0 };
/** Powered-down: arms hanging limp during the boot sequence. */
const HANG: ArmPose = { sx: 0.05, sy: 0, sz: 0.04, ex: -0.05, ez: 0, wx: 0.2, wz: 0 };

type GestureKind = 'wave' | 'pump' | 'roof' | 'listen' | 'drop' | 'point' | 'shrug' | 'tap';

interface Gesture {
  kind: GestureKind;
  start: number;
  duration: number;
}

const DURATION: Record<GestureKind, number> = {
  wave: 2.4,
  pump: 2.6,
  roof: 3.2,
  listen: 2.2,
  drop: 4.2,
  point: 2.0,
  shrug: 1.6,
  tap: 2.8,
};

/** Gestures that make the visor smile. */
const HAPPY_GESTURES: GestureKind[] = ['wave', 'pump', 'roof', 'drop', 'point'];

function gesturePose(kind: GestureKind, t: number, beat: number): ArmPose {
  switch (kind) {
    case 'wave': {
      // Upper arm out to the side, forearm up, hand swinging.
      const swing = Math.sin(t * 11);
      return { sx: -0.3, sy: 0, sz: 1.3, ex: 0, ez: 1.45 + swing * 0.38, wx: 0, wz: swing * 0.35 };
    }
    case 'pump': {
      // Alternates flexed (forearm up) and fully extended (arm straight up).
      const p = Math.abs(Math.sin(t * Math.PI * 1.6));
      return { sx: -0.25, sy: 0, sz: 1.35 + p * 1.45, ex: 0, ez: 1.45 * (1 - p), wx: 0, wz: 0 };
    }
    case 'roof': {
      // Both palms up, pushing on the beat.
      const push = kick(beat, 4);
      return { sx: -0.15, sy: 0, sz: 1.2 + push * 0.45, ex: 0, ez: 1.6 - push * 0.55, wx: -1.2, wz: 0 };
    }
    case 'listen':
      // Hand pressed against the headphone cup.
      return { sx: -0.1, sy: 0, sz: 1.55, ex: 0, ez: 2.35, wx: 0, wz: 0.6 };
    case 'drop': {
      // Both arms thrown up in a V, bouncing on every beat.
      const b = kick(beat, 5);
      return { sx: -0.2, sy: 0, sz: 2.55 - b * 0.25, ex: 0, ez: 0.25 + b * 0.35, wx: 0, wz: Math.sin(t * 9) * 0.3 };
    }
    case 'point': {
      // Arm straight out toward the camera, with a little "you!" jab.
      const jab = Math.max(0, Math.sin(t * 7)) * 0.12;
      return { sx: -1.45 - jab, sy: 0, sz: 0.28, ex: -0.1, ez: 0, wx: -0.2, wz: 0 };
    }
    case 'shrug':
      // Forearms out, palms up.
      return { sx: -0.25, sy: 0, sz: 0.45, ex: -1.2, ez: 0.85, wx: -1.1, wz: 0 };
    case 'tap': {
      // Fingers drumming on the deck while waiting.
      const tap = Math.max(0, Math.sin(t * 14)) * 0.14;
      return { ...ON_DECK, sz: 0.3, ex: ON_DECK.ex + tap, ez: -0.2 };
    }
  }
}

function blendInto(out: ArmPose, from: ArmPose, to: ArmPose, w: number) {
  for (const k of POSE_KEYS) out[k] = from[k] + (to[k] - from[k]) * w;
}

/* ------------------------------------------------------------------ */
/* Visor expressions                                                   */
/* ------------------------------------------------------------------ */

type Expression = 'normal' | 'happy' | 'heart' | 'cross';
const EXPRESSIONS: Expression[] = ['normal', 'happy', 'heart', 'cross'];

function makeHeartGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.3, -0.5, -0.1, -0.5, 0.18);
  s.bezierCurveTo(-0.5, 0.45, -0.18, 0.55, 0, 0.3);
  s.bezierCurveTo(0.18, 0.55, 0.5, 0.45, 0.5, 0.18);
  s.bezierCurveTo(0.5, -0.1, 0.15, -0.3, 0, -0.5);
  const geo = new THREE.ShapeGeometry(s, 12);
  geo.scale(0.17, 0.17, 1);
  return geo;
}

const HEART_GEO = makeHeartGeometry();

type ExpressionRefs = Record<Expression, React.RefObject<THREE.Group>>;

/** One eye with every expression variant mounted; the active one is scaled in, the rest scaled out. */
function Eye({ x, refs }: { x: number; refs: ExpressionRefs }) {
  return (
    <group position={[x, 0, 0]}>
      <group ref={refs.normal}>
        <RoundedBox args={[0.2, 0.13, 0.02]} radius={0.05} material={mats.eyes} />
      </group>
      <group ref={refs.happy} scale={0}>
        <mesh material={mats.eyes} position={[0, -0.035, 0]}>
          <torusGeometry args={[0.07, 0.022, 8, 24, Math.PI]} />
        </mesh>
      </group>
      <group ref={refs.heart} scale={0}>
        <mesh geometry={HEART_GEO} material={mats.eyes} />
      </group>
      <group ref={refs.cross} scale={0}>
        <mesh material={mats.eyes} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.16, 0.035, 0.02]} />
        </mesh>
        <mesh material={mats.eyes} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.16, 0.035, 0.02]} />
        </mesh>
      </group>
    </group>
  );
}

function useExpressionRefs(): ExpressionRefs {
  return { normal: useRef(null), happy: useRef(null), heart: useRef(null), cross: useRef(null) };
}

/* ------------------------------------------------------------------ */
/* Rig                                                                 */
/* ------------------------------------------------------------------ */

interface ArmRefs {
  shoulder: React.RefObject<THREE.Group>;
  elbow: React.RefObject<THREE.Group>;
  wrist: React.RefObject<THREE.Group>;
}

function Arm({ side, refs }: { side: 1 | -1; refs: ArmRefs }) {
  return (
    <group ref={refs.shoulder} position={[side * 0.8, 0.9, 0]}>
      <mesh material={mats.accent}>
        <sphereGeometry args={[0.2, 24, 24]} />
      </mesh>
      <mesh material={mats.body} position={[0, -0.3, 0]}>
        <capsuleGeometry args={[0.11, 0.42, 8, 16]} />
      </mesh>
      <group ref={refs.elbow} position={[0, -0.6, 0]}>
        <mesh material={mats.joint}>
          <sphereGeometry args={[0.13, 20, 20]} />
        </mesh>
        <mesh material={mats.shell} position={[0, -0.27, 0]}>
          <capsuleGeometry args={[0.105, 0.36, 8, 16]} />
        </mesh>
        <group ref={refs.wrist} position={[0, -0.55, 0]}>
          <RoundedBox args={[0.26, 0.2, 0.14]} radius={0.06} position={[0, -0.09, 0]} material={mats.bodyDark} />
          {[-0.08, 0, 0.08].map((x) => (
            <mesh key={x} material={mats.accent} position={[x, -0.24, 0]}>
              <capsuleGeometry args={[0.034, 0.09, 4, 8]} />
            </mesh>
          ))}
          <mesh material={mats.accent} position={[side * -0.15, -0.12, 0.02]} rotation={[0, 0, side * -0.7]}>
            <capsuleGeometry args={[0.034, 0.07, 4, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function useArmRefs(): ArmRefs {
  return {
    shoulder: useRef<THREE.Group>(null),
    elbow: useRef<THREE.Group>(null),
    wrist: useRef<THREE.Group>(null),
  };
}

function applyArm(refs: ArmRefs, pose: ArmPose, side: 1 | -1) {
  const s = refs.shoulder.current;
  const e = refs.elbow.current;
  const w = refs.wrist.current;
  if (!s || !e || !w) return;
  s.rotation.set(pose.sx, pose.sy * side, pose.sz * side);
  e.rotation.set(pose.ex, 0, pose.ez * side);
  w.rotation.set(pose.wx, 0, pose.wz * side);
}

/* ------------------------------------------------------------------ */
/* Robot                                                               */
/* ------------------------------------------------------------------ */

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function Robot() {
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const antenna = useRef<THREE.Group>(null);
  const antennaTip = useRef<THREE.Mesh>(null);
  const cups = useRef<(THREE.Group | null)[]>([]);
  const eq = useRef<(THREE.Mesh | null)[]>([]);
  const leftEye = useExpressionRefs();
  const rightEye = useExpressionRefs();

  const right = useArmRefs(); // screen right, +x — works the right platter
  const left = useArmRefs(); // screen left, -x — crossfader / pads

  const pose = useRef({
    right: { ...REST },
    left: { ...REST },
    scratchRight: { ...REST },
    scratchLeft: { ...REST },
    targetRight: { ...REST },
    targetLeft: { ...REST },
    headX: 0,
    headY: 0,
    headZ: 0,
    torsoX: 0,
    bob: 0,
  });

  // Secondary-motion springs: they chase the primary motion and lag/overshoot behind it.
  const springs = useRef({
    antX: { x: 0, v: 0 },
    antZ: { x: 0, v: 0 },
    cup: { x: 0, v: 0 },
  });

  const gestures = useRef<{ right: Gesture | null; left: Gesture | null }>({ right: null, left: null });
  const nextGestureAt = useRef(2.5);
  const lastTrackChange = useRef(0);
  const pendingListenAt = useRef(-1);
  const headSpinStart = useRef(-10);
  const blinkAt = useRef(3);
  const lastDropBar = useRef(0);
  const bufferingSince = useRef(-1);
  const wasError = useRef(false);
  const look = useRef({ x: 0, y: 0, z: 0, nextAt: 1 });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const { mode, beat, energy, reducedMotion } = scene;
    const p = pose.current;
    const g = gestures.current;
    const playing = mode === 'playing';
    const intro = introProgress(t);
    const booting = scene.startedAt >= 0 && intro < 1;

    /* ---- boot sequence: power down → flicker → straighten (easeOutBack overshoot) ---- */
    let slump = 0;
    if (booting) {
      slump = intro < 0.45 ? smoothstep(0, 0.15, intro) : 1 - easeOutBack((intro - 0.45) / 0.35);
    }

    /* ---- gesture scheduling ---- */
    if (scene.trackChangedAt !== lastTrackChange.current) {
      lastTrackChange.current = scene.trackChangedAt;
      if (scene.trackChangedAt > 0 && !reducedMotion) {
        // The first track starts mid-boot: hold the listen + head spin until the robot is upright.
        pendingListenAt.current = booting ? scene.startedAt + INTRO_DURATION : t;
      }
    }
    if (pendingListenAt.current >= 0 && t >= pendingListenAt.current) {
      pendingListenAt.current = -1;
      g.left = { kind: 'listen', start: t, duration: DURATION.listen };
      headSpinStart.current = t;
      nextGestureAt.current = Math.max(nextGestureAt.current, t + 4);
    }
    for (const side of ['left', 'right'] as const) {
      const gest = g[side];
      if (gest && t - gest.start > gest.duration) g[side] = null;
    }
    if (booting) {
      g.left = g.right = null;
    }

    // The drop: every 32 beats, sometimes, both arms go up.
    const bar = Math.floor(beat / 32);
    if (playing && !reducedMotion && bar !== lastDropBar.current) {
      lastDropBar.current = bar;
      if (Math.random() < 0.55 && !g.left && !g.right) {
        const drop = { kind: 'drop' as const, start: t, duration: DURATION.drop };
        g.left = drop;
        g.right = drop;
        nextGestureAt.current = t + rand(8, 12);
      }
    }

    // Shrug when buffering drags on or when playback errors out.
    bufferingSince.current = mode === 'buffering' ? (bufferingSince.current < 0 ? t : bufferingSince.current) : -1;
    const erroredNow = scene.error && !wasError.current;
    wasError.current = scene.error;
    if (!reducedMotion && !booting && !g.left && !g.right && (erroredNow || (bufferingSince.current >= 0 && t - bufferingSince.current > 1.5))) {
      const shrug = { kind: 'shrug' as const, start: t, duration: DURATION.shrug };
      g.left = shrug;
      g.right = shrug;
      bufferingSince.current = t + 4; // don't shrug again immediately
    }

    if (!reducedMotion && !booting && t > nextGestureAt.current && !g.left && !g.right) {
      const arm = Math.random() < 0.5 ? 'left' : 'right';
      const r = Math.random();
      if (playing) {
        const kind: GestureKind = r < 0.3 ? 'wave' : r < 0.6 ? 'pump' : r < 0.8 ? 'roof' : 'point';
        const gest = { kind, start: t, duration: DURATION[kind] };
        if (kind === 'roof') {
          g.left = gest;
          g.right = gest;
        } else if (kind === 'point') g.right = gest;
        else g[arm] = gest;
        nextGestureAt.current = t + rand(8, 14);
      } else if (mode === 'idle') {
        g[arm] = r < 0.45 ? { kind: 'wave', start: t, duration: DURATION.wave } : { kind: 'tap', start: t, duration: DURATION.tap };
        nextGestureAt.current = t + rand(5, 9);
      } else if (mode === 'paused') {
        g[arm] = r < 0.3 ? { kind: 'wave', start: t, duration: 1.6 } : { kind: 'tap', start: t, duration: DURATION.tap };
        nextGestureAt.current = t + rand(9, 15);
      } else {
        nextGestureAt.current = t + 2;
      }
    }

    /* ---- base arm poses ---- */
    const bt = beat;
    if (playing || mode === 'buffering') {
      const e = playing ? energy : energy * 0.3;
      // Right hand: scratch the platter (elbow side-to-side + wrist flick on the beat).
      const scratch = Math.sin(bt * Math.PI * 2) * 0.22 * e;
      Object.assign(p.scratchRight, ON_DECK, {
        sz: ON_DECK.sz + 0.35,
        ez: -0.25 + scratch,
        ex: ON_DECK.ex + kick(bt, 6) * 0.12 * e,
        wz: scratch * 0.8,
      });
      // Left hand: 4 bars on the crossfader, 4 bars tapping pads.
      const onPads = Math.floor(bt / 16) % 2 === 1;
      if (onPads) {
        const pad = Math.floor(bt * 2) % 4;
        scene.pad = pad;
        Object.assign(p.scratchLeft, ON_DECK, {
          sz: 0.05 + pad * 0.05,
          ez: -0.05 - pad * 0.06,
          ex: ON_DECK.ex - 0.05 + kick(bt * 2, 9) * 0.18 * e,
        });
      } else {
        scene.pad = -1;
        scene.fader = Math.sin(bt * Math.PI * 0.5) * e;
        Object.assign(p.scratchLeft, ON_DECK, {
          sz: 0.02,
          ez: -0.55 - scene.fader * 0.2,
          ex: ON_DECK.ex + 0.08,
        });
      }
    } else {
      scene.pad = -1;
      const breathe = Math.sin(t * 1.6) * 0.04;
      const sag = mode === 'paused' ? 0.1 : 0;
      Object.assign(p.scratchRight, REST, { sz: REST.sz + breathe - sag, ex: REST.ex - breathe });
      Object.assign(p.scratchLeft, REST, { sz: REST.sz + breathe - sag, ex: REST.ex - breathe });
    }
    if (slump > 0) {
      blendInto(p.scratchRight, p.scratchRight, HANG, Math.min(1, slump));
      blendInto(p.scratchLeft, p.scratchLeft, HANG, Math.min(1, slump));
    }

    /* ---- layer gestures over the base ---- */
    for (const side of ['left', 'right'] as const) {
      const base = side === 'left' ? p.scratchLeft : p.scratchRight;
      const target = side === 'left' ? p.targetLeft : p.targetRight;
      const gest = g[side];
      if (gest) {
        const lt = t - gest.start;
        const w = smoothstep(0, 0.35, lt) * (1 - smoothstep(gest.duration - 0.4, gest.duration, lt));
        blendInto(target, base, gesturePose(gest.kind, lt, bt), w);
      } else Object.assign(target, base);

      const current = side === 'left' ? p.left : p.right;
      for (const k of POSE_KEYS) current[k] = damp(current[k], target[k], 14, dt);
    }
    applyArm(right, p.right, 1);
    applyArm(left, p.left, -1);

    /* ---- head & torso ---- */
    const pointer = state.pointer;
    const motion = reducedMotion ? 0 : 1;
    let headX = 0;
    let headY = 0;
    let headZ = 0;
    let torsoX = 0;
    let bob = Math.sin(t * 1.6) * 0.015;

    // Idle curiosity: glance at random spots and tilt the head now and then.
    const lk = look.current;
    if (t > lk.nextAt) {
      lk.x = rand(-0.12, 0.2);
      lk.y = rand(-0.55, 0.55);
      lk.z = Math.random() < 0.35 ? rand(-0.2, 0.2) : 0;
      lk.nextAt = t + rand(1.8, 4);
    }

    if (playing) {
      const k = kick(bt, 4);
      const dropping = g.left?.kind === 'drop';
      headX = (0.05 + k * (dropping ? 0.32 : 0.16)) * energy * motion;
      headY = Math.sin(bt * Math.PI * 0.25) * 0.12 * energy * motion;
      headZ = Math.sin(bt * Math.PI) * 0.06 * energy * motion;
      torsoX = 0.06 + k * (dropping ? 0.1 : 0.04) * energy * motion;
      bob = -k * (dropping ? 0.09 : 0.05) * energy * motion;
    } else if (mode === 'paused') {
      headX = 0.32;
      torsoX = 0.12;
      headY = pointer.x * 0.15 + lk.y * 0.3 * motion;
    } else if (mode === 'buffering') {
      headZ = 0.22;
      headY = pointer.x * 0.2;
    } else {
      headY = pointer.x * 0.3 + lk.y * 0.5 * motion;
      headX = -pointer.y * 0.12 + lk.x * motion;
      headZ = lk.z * motion;
    }
    if (g.left?.kind === 'listen') headZ += -0.2;
    if (g.right?.kind === 'point') headX -= 0.1;
    if (g.left?.kind === 'shrug') headZ += Math.sin((t - g.left.start) * 3) * 0.18;

    headX += slump * 0.6;
    torsoX += slump * 0.22;
    bob -= slump * 0.08;

    p.headX = damp(p.headX, headX, 9, dt);
    p.headY = damp(p.headY, headY, 6, dt);
    p.headZ = damp(p.headZ, headZ, 6, dt);
    p.torsoX = damp(p.torsoX, torsoX, 6, dt);
    p.bob = damp(p.bob, bob, 16, dt);

    const spin = smoothstep(0, 0.9, t - headSpinStart.current);
    const spinAngle = spin < 1 ? spin * Math.PI * 2 : 0;

    if (head.current) head.current.rotation.set(p.headX, p.headY + spinAngle, p.headZ);
    if (torso.current) {
      torso.current.rotation.set(p.torsoX, p.headY * 0.25, playing ? Math.sin(bt * Math.PI) * 0.03 * energy * motion : 0);
    }
    if (root.current) root.current.position.y = p.bob;

    /* ---- secondary motion ---- */
    const sp = springs.current;
    // The antenna lags behind the head, so every nod and spin makes it whip and settle.
    spring(sp.antX, p.headX, 120, 7, dt);
    spring(sp.antZ, p.headZ + (spin < 1 ? Math.sin(spin * Math.PI) * 0.6 : 0), 120, 7, dt);
    if (antenna.current) {
      antenna.current.rotation.x = (sp.antX.x - p.headX) * 2.2 * motion;
      antenna.current.rotation.z = (sp.antZ.x - p.headZ) * 2.2 * motion;
    }
    spring(sp.cup, p.bob, 160, 9, dt);
    cups.current.forEach((cup) => {
      if (cup) cup.position.y = 0.42 + (sp.cup.x - p.bob) * 1.5 * motion;
    });

    /* ---- face ---- */
    const expression: Expression = scene.error
      ? 'cross'
      : scene.startedAt >= 0 && t - scene.startedAt > INTRO_DURATION && t - scene.startedAt < INTRO_DURATION + 1.4 && !reducedMotion
        ? 'heart'
        : (g.left && HAPPY_GESTURES.includes(g.left.kind)) || (g.right && HAPPY_GESTURES.includes(g.right.kind))
          ? 'happy'
          : 'normal';
    for (const eye of [leftEye, rightEye]) {
      for (const ex of EXPRESSIONS) {
        const grp = eye[ex].current;
        if (!grp) continue;
        const s = damp(grp.scale.x, ex === expression ? 1 : 0, 18, dt);
        grp.scale.setScalar(s);
        grp.visible = s > 0.01;
      }
    }

    if (eyes.current) {
      // Boot: dark while powered down, then a stuttering flicker before they hold.
      const off = booting && intro < 0.2;
      const flicker = booting && intro >= 0.2 && intro < 0.45 && Math.sin(t * 60) * Math.sin(t * 23) > 0.1;
      eyes.current.visible = !off && !flicker;

      if (t > blinkAt.current + 0.14) blinkAt.current = t + rand(2.5, 6);
      const blinking = t > blinkAt.current && expression === 'normal';
      const sleepy = mode === 'paused' && expression === 'normal' ? 0.45 : 1;
      const squint = playing && expression === 'normal' ? 1 - kick(bt, 6) * 0.25 * energy : 1;
      eyes.current.scale.y = damp(eyes.current.scale.y, blinking ? 0.1 : sleepy * squint, 30, dt);
    }
    if (scan.current) {
      const scanning = (mode === 'buffering' || scene.loading) && !scene.error;
      scan.current.visible = scanning;
      if (scanning) scan.current.position.x = Math.sin(t * 4) * 0.34;
    }
    if (antennaTip.current) {
      const pulse = playing ? 1 + kick(bt, 5) * 0.5 * energy : 1;
      antennaTip.current.scale.setScalar(pulse);
    }

    /* ---- chest EQ (pseudo-visualiser; raw audio is out of scope) ---- */
    eq.current.forEach((bar, i) => {
      if (!bar) return;
      const level = playing
        ? 0.2 + energy * (0.45 * kick(bt + i * 0.25, 3) + 0.35 * Math.abs(Math.sin(t * (3.1 + i * 1.7) + i)))
        : 0.12;
      bar.scale.y = damp(bar.scale.y, level, 18, dt);
      bar.position.y = -0.14 + (0.3 * bar.scale.y) / 2;
    });
  });

  return (
    <group ref={root} position={[0, 0, -0.55]}>
      {/* waist column, mostly hidden by the booth */}
      <mesh material={mats.bodyDark} position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.32, 0.4, 1.0, 24]} />
      </mesh>

      <group ref={torso} position={[0, 1.2, 0]}>
        <RoundedBox args={[1.3, 1.12, 0.78]} radius={0.2} smoothness={4} position={[0, 0.55, 0]} material={mats.body} />
        {/* chest plate + EQ screen in the four Google colors */}
        <RoundedBox args={[0.86, 0.58, 0.06]} radius={0.05} position={[0, 0.62, 0.38]} material={mats.shell} />
        <RoundedBox args={[0.7, 0.42, 0.04]} radius={0.04} position={[0, 0.62, 0.42]} material={mats.screen} />
        <group position={[0, 0.62, 0.45]}>
          {GOOGLE_MATS.map((m, i) => (
            <mesh key={i} ref={(el) => (eq.current[i] = el)} material={m} position={[-0.225 + i * 0.15, -0.1, 0]}>
              <boxGeometry args={[0.1, 0.3, 0.02]} />
            </mesh>
          ))}
        </group>
        <mesh material={mats.joint} position={[0, 1.17, 0]}>
          <cylinderGeometry args={[0.13, 0.16, 0.16, 20]} />
        </mesh>

        <group ref={head} position={[0, 1.22, 0]}>
          <RoundedBox args={[1.08, 0.82, 0.86]} radius={0.24} smoothness={4} position={[0, 0.42, 0]} material={mats.shell} />
          {/* visor */}
          <RoundedBox args={[0.88, 0.44, 0.08]} radius={0.12} position={[0, 0.44, 0.41]} material={mats.screen} />
          <group ref={eyes} position={[0, 0.46, 0.46]}>
            <Eye x={-0.19} refs={leftEye} />
            <Eye x={0.19} refs={rightEye} />
          </group>
          <mesh ref={scan} material={mats.eyes} position={[0, 0.44, 0.47]} visible={false}>
            <boxGeometry args={[0.05, 0.34, 0.01]} />
          </mesh>
          {/* antenna: pivots at its base so it whips behind head motion */}
          <group ref={antenna} position={[0, 0.82, 0]}>
            <mesh material={mats.joint} position={[0, 0.13, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.26, 10]} />
            </mesh>
            <mesh ref={antennaTip} material={mats.accentGlow} position={[0, 0.28, 0]}>
              <sphereGeometry args={[0.075, 20, 20]} />
            </mesh>
          </group>
          {/* headphones */}
          <mesh material={mats.bodyDark} position={[0, 0.42, -0.12]}>
            <torusGeometry args={[0.62, 0.05, 12, 48, Math.PI]} />
          </mesh>
          {[-1, 1].map((s, i) => (
            <group key={s} ref={(el) => (cups.current[i] = el)} position={[s * 0.6, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
              <mesh material={mats.accent}>
                <cylinderGeometry args={[0.22, 0.22, 0.16, 28]} />
              </mesh>
              <mesh material={mats.bodyDark} position={[0, s * -0.09, 0]}>
                <cylinderGeometry args={[0.16, 0.16, 0.04, 28]} />
              </mesh>
            </group>
          ))}
        </group>

        <Arm side={1} refs={right} />
        <Arm side={-1} refs={left} />
      </group>
    </group>
  );
}
