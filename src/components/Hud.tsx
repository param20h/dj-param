import { AnimatePresence, motion } from 'framer-motion';
import { ACCENTS, ACCENT_HEX, LOGO_FOR } from '../data/playlist';
import type { PlayerApi } from '../hooks/usePlayer';
import { NowPlaying } from './NowPlaying';
import { Controls } from './Controls';

export function TopBar({ player }: { player: PlayerApi }) {
  return (
    <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
      <div className="relative h-6 w-[10.5rem] sm:h-8 sm:w-[14rem]">
        <AnimatePresence initial={false}>
          <motion.img
            key={player.accent}
            src={LOGO_FOR[player.accent]}
            alt="param20h"
            className="absolute inset-0 h-full w-auto"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.4 }}
          />
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex items-center rounded-full border"
          style={{ borderColor: 'var(--border-subtle)', background: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(12px)' }}
          role="group"
          aria-label="Accent color"
        >
          {ACCENTS.map((a) => {
            const active = player.pinnedAccent === a;
            const current = player.accent === a;
            return (
              <button
                key={a}
                type="button"
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-full"
                onClick={() => player.setPinnedAccent(active ? null : a)}
                aria-label={active ? `Unpin ${a} accent` : `Pin ${a} accent`}
                aria-pressed={active}
                title={active ? 'Pinned — click to auto-rotate' : `Pin ${a}`}
              >
                <motion.span
                  className={`block rounded-full ${current ? 'beat-pulse' : ''}`}
                  style={{ background: ACCENT_HEX[a].core, boxShadow: active ? '0 0 0 2px #f4f7fb, 0 0 0 3px #17243b' : 'none' }}
                  animate={{ width: current ? 16 : 10, height: current ? 16 : 10 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

export function Dock({ player }: { player: PlayerApi }) {
  return (
    <motion.section
      className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      // Enter once the camera intro has landed.
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: 1.4 }}
      aria-label="Player"
    >
      <div
        className="beat-border w-full max-w-[40rem] rounded-[1.25rem] border p-4 sm:p-5"
        style={{ background: 'rgba(255, 255, 255, 0.78)', backdropFilter: 'blur(12px)' }}
      >
        <NowPlaying player={player} />
        {player.error && (
          <p className="mt-2 font-mono text-xs" style={{ color: 'var(--halftone-red)' }}>
            {`// ${player.error}`}
          </p>
        )}
        <div className="mt-4 border-t border-dashed pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <Controls player={player} />
        </div>
      </div>
    </motion.section>
  );
}
