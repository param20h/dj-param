import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlayerApi } from '../hooks/usePlayer';

const STATUS_LABEL: Record<string, string> = {
  playing: '// now spinning',
  paused: '// paused',
  buffering: '// cueing up…',
  ready: '// cueing up…',
  loading: '// cueing up…',
  error: '// signal lost',
};

const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function NowPlaying({ player }: { player: PlayerApi }) {
  const { track, index, queueLength, status, getCurrentTime, getDuration } = player;
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeRef = useRef<HTMLSpanElement>(null);
  const spinning = status === 'playing';

  // Elapsed / total text, written straight to the DOM (progress visuals read the --progress CSS var).
  useEffect(() => {
    let last = '';
    const id = window.setInterval(() => {
      const label = `${formatTime(getCurrentTime())} / ${formatTime(getDuration())}`;
      if (label !== last && timeRef.current) timeRef.current.textContent = last = label;
    }, 250);
    return () => window.clearInterval(id);
  }, [getCurrentTime, getDuration]);

  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* Thumbnail as a spinning record, wrapped in an accent progress ring */}
      <div className="relative h-16 w-16 shrink-0">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r={RING_R} fill="none" stroke="var(--border-subtle)" strokeWidth="2" />
          <circle
            cx="32"
            cy="32"
            r={RING_R}
            fill="none"
            stroke="var(--accent-halftone)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            style={{ strokeDashoffset: `calc(${RING_C} * (1 - var(--progress, 0)))`, transition: 'stroke 0.5s' }}
          />
        </svg>
        <div className={`vinyl absolute inset-[6px] ${spinning ? 'is-spinning' : ''}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={track?.id ?? 'none'}
              src={track?.thumb}
              alt=""
              className="absolute inset-0 h-full w-full rounded-full object-cover"
              initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            />
          </AnimatePresence>
          <span className="vinyl-hole" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="eyebrow flex items-center gap-2" style={{ color: 'var(--accent-halftone)' }}>
          {spinning && <span className="eq-bars" aria-hidden="true"><i /><i /><i /></span>}
          {/* Keyed enter-only: status can flip buffering→playing within a frame, which a wait-mode exit can't keep up with. */}
          <motion.span key={status} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
            {STATUS_LABEL[status]}
          </motion.span>
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${track?.id}-${track?.title}`}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="mt-1 truncate font-display text-[1.05rem] font-bold leading-snug [text-wrap:nowrap] sm:text-[1.15rem]" title={track?.title}>
              {track?.title ?? '—'}
            </h2>
            <p className="truncate text-[0.85rem] text-muted">{track?.author || ' '}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-2 flex items-center gap-2">
          <div className="progress-track flex-1">
            <div className="progress-fill" />
          </div>
          <span ref={timeRef} className="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted">
            0:00 / 0:00
          </span>
        </div>
      </div>

      {queueLength > 0 && <span className="pill shrink-0 self-start">{`${pad(index + 1)} / ${pad(queueLength)}`}</span>}
    </div>
  );
}
