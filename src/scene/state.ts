import type { Accent } from '../data/playlist';

export type RobotMode = 'idle' | 'playing' | 'paused' | 'buffering';
export type Quality = 'high' | 'low';

/**
 * Mutable per-frame scene state. React writes it on render, useFrame callbacks read it,
 * so playback changes never re-render the 3D tree.
 */
export const scene = {
  mode: 'idle' as RobotMode,
  loading: true,
  error: false,
  accent: 'blue' as Accent,
  trackChangedAt: 0,
  reducedMotion: false,
  /** Lowered by the PerformanceMonitor; 'low' drops bloom and particles. */
  quality: 'high' as Quality,
  /** Set by React when the user presses Start; the Conductor stamps `startedAt` from the scene clock. */
  started: false,
  /** Scene clock time (seconds) when the user pressed Start, or -1 before. Drives the intro. */
  startedAt: -1,
  /** Current track progress 0..1. */
  progress: 0,
  /** Continuous beat counter; only advances while music plays. */
  beat: 0,
  /** 0 → 1, eases in while playing so motion intensity ramps instead of snapping. */
  energy: 0,
  /** Crossfader position -1..1, driven by the robot's left hand. */
  fader: 0,
  /** Pad index currently tapped by the left hand, or -1. */
  pad: -1,
};

export const BPM = 118;
/** Length of the Start intro (camera dolly + robot boot), in seconds. */
export const INTRO_DURATION = 2.4;

/** 0 before Start, ramping to 1 over the intro. Reduced motion jumps straight to 1. */
export function introProgress(t: number): number {
  if (scene.startedAt < 0) return 0;
  if (scene.reducedMotion) return 1;
  return Math.min(1, (t - scene.startedAt) / INTRO_DURATION);
}

/** Decaying pulse (1 on the beat, falling to ~0 before the next one). */
export function kick(beat: number, sharpness = 5): number {
  return Math.exp(-(beat % 1) * sharpness);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function easeOutBack(x: number, overshoot = 1.6): number {
  const t = Math.min(1, Math.max(0, x)) - 1;
  return 1 + (overshoot + 1) * t * t * t + overshoot * t * t;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** Damped spring for secondary motion (overshoots, then settles). Mutates `s`. */
export function spring(s: { x: number; v: number }, target: number, stiffness: number, damping: number, dt: number) {
  s.v += ((target - s.x) * stiffness - s.v * damping) * dt;
  s.x += s.v * dt;
  return s.x;
}
