import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import type { PlayerApi } from '../hooks/usePlayer';
import { ArrowRight, PauseIcon, PlayIcon, VolumeIcon } from './Icons';

export function Controls({ player }: { player: PlayerApi }) {
  const playing = player.status === 'playing' || player.status === 'buffering';
  const nudge = useAnimationControls();

  const onNext = () => {
    player.next();
    nudge.start({ x: [0, 6, 0], transition: { duration: 0.35, ease: 'easeOut' } });
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <motion.button
        type="button"
        className="btn-primary beat-pulse min-w-[2.75rem] px-4 py-2.5 sm:px-5"
        onClick={player.toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        whileTap={{ scale: 0.92 }}
      >
        <span className="relative grid h-4 w-4 place-items-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={playing ? 'pause' : 'play'}
              className="grid place-items-center"
              initial={{ opacity: 0, scale: 0.4, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4, rotate: 90 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="hidden sm:inline">{playing ? 'Pause' : 'Play'}</span>
      </motion.button>
      <motion.button type="button" className="btn-secondary px-4 py-2.5" onClick={onNext} aria-label="Next track" whileTap={{ scale: 0.94 }}>
        <span className="hidden sm:inline">Next</span>
        <motion.span className="grid place-items-center" animate={nudge}>
          <ArrowRight />
        </motion.span>
      </motion.button>

      <div className="ml-auto flex min-w-0 items-center gap-1">
        <button
          type="button"
          className="btn-secondary shrink-0 border-transparent bg-transparent"
          onClick={player.toggleMute}
          aria-label={player.muted ? 'Unmute' : 'Mute'}
          aria-pressed={player.muted}
        >
          <VolumeIcon muted={player.muted || player.volume === 0} />
        </button>
        <input
          type="range"
          className="volume w-20 sm:w-28"
          min={0}
          max={100}
          value={player.muted ? 0 : player.volume}
          onChange={(e) => player.setVolume(Number(e.target.value))}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
