import * as THREE from 'three';
import { ACCENT_HEX } from '../data/playlist';
import { introProgress, kick, scene } from './state';

function toonGradient(): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array([70, 150, 210, 255]), 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const gradientMap = toonGradient();
const toon = (color: string) => new THREE.MeshToonMaterial({ color, gradientMap });
const flat = (color: string, extra: THREE.MeshBasicMaterialParameters = {}) =>
  new THREE.MeshBasicMaterial({ color, ...extra });
/**
 * Unlit, un-tonemapped material. `updateMaterials` pushes its color above 1.0 so it — and only it —
 * crosses the bloom threshold; toon surfaces stay below it and never bloom.
 */
const glow = (color: string, extra: THREE.MeshBasicMaterialParameters = {}) =>
  new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });

/** Shared materials — one instance each, so accent transitions are a single color lerp. */
export const mats = {
  body: toon('#3d3d3d'),
  bodyDark: toon('#2a2a2a'),
  shell: toon('#ececec'),
  joint: toon('#232323'),
  metal: toon('#9a9a9a'),
  accent: toon(ACCENT_HEX.blue.core),
  eyes: glow(ACCENT_HEX.blue.halftone),
  screen: flat('#141414'),
  deck: toon('#262626'),
  deckTop: toon('#303030'),
  vinyl: toon('#151515'),
  groove: flat('#2b2b2b'),
  label: flat(ACCENT_HEX.blue.pastel),
  blue: flat('#4285f4'),
  red: flat('#ea4335'),
  yellow: flat('#f9ab00'),
  green: flat('#34a853'),
  ring: glow(ACCENT_HEX.blue.halftone, { transparent: true, opacity: 0, depthWrite: false }),
  /** Accent glow for jog rings, fader cap, antenna tip. */
  accentGlow: glow(ACCENT_HEX.blue.halftone),
  /** Booth front LED strip and VU meters: one glow per Google color. */
  ledBlue: glow('#4285f4'),
  ledRed: glow('#ea4335'),
  ledYellow: glow('#f9ab00'),
  ledGreen: glow('#34a853'),
};

export const GOOGLE_MATS = [mats.blue, mats.red, mats.yellow, mats.green];
export const GOOGLE_GLOW = [mats.ledBlue, mats.ledRed, mats.ledYellow, mats.ledGreen];
export const GOOGLE_HEX = ['#4285f4', '#ea4335', '#f9ab00', '#34a853'];

const GOOGLE_BASE = GOOGLE_HEX.map((h) => new THREE.Color(h));
const DIM = new THREE.Color('#5c5c5c');
const target = new THREE.Color();
let eyeIntensity = 1;
let ledIntensity = 0.4;

/** Ease accent-tinted materials toward the current accent (or dim gray when paused). */
export function updateMaterials(dt: number, t: number) {
  const hex = ACCENT_HEX[scene.accent];
  const k = 1 - Math.exp(-5 * dt);
  const dimmed = scene.mode === 'paused';
  const intro = introProgress(t);
  const pulse = kick(scene.beat, 5) * scene.energy;

  mats.accent.color.lerp(target.set(hex.core), k);
  mats.label.color.lerp(target.set(hex.pastel), k);
  mats.ring.color.lerp(target.set(hex.halftone).multiplyScalar(2.2), k);

  // Eyes: glow brighter on the beat, dim gray when paused. Boot flicker is handled by the robot (visibility).
  eyeIntensity += ((dimmed ? 1 : 2.4 + pulse * 1.6) - eyeIntensity) * k;
  mats.eyes.color.lerp(dimmed ? DIM : target.set(hex.halftone).multiplyScalar(eyeIntensity), k * 2);
  mats.accentGlow.color.lerp(
    dimmed ? target.set(hex.halftone).multiplyScalar(0.5) : target.set(hex.halftone).multiplyScalar(1.8 + pulse * 2),
    k * 2,
  );

  // LEDs sleep before Start, power on with the intro, breathe with the beat while playing.
  const ledTarget = scene.startedAt < 0 ? 0.35 : (0.35 + intro * 0.9) * (dimmed ? 0.5 : 1) + pulse * 1.8;
  ledIntensity += (ledTarget - ledIntensity) * k * 2;
  GOOGLE_GLOW.forEach((m, i) => m.color.copy(GOOGLE_BASE[i]).multiplyScalar(ledIntensity));
}
