import { motion, type Variants } from 'framer-motion';
import type { PlayerApi } from '../hooks/usePlayer';
import { ArrowRight } from './Icons';

const EASE = [0.2, 0.8, 0.2, 1] as const;

const card: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, delay: 0.3, staggerChildren: 0.08, delayChildren: 0.45 } },
  exit: { opacity: 0, y: 32, scale: 0.97, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export function StartOverlay({ player }: { player: PlayerApi }) {
  const loading = player.status === 'loading';
  const failed = player.status === 'error';

  return (
    <motion.section
      className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      variants={card}
      initial="hidden"
      animate="show"
      exit="exit"
      aria-labelledby="start-title"
    >
      <div
        className="w-full max-w-[32rem] rounded-[1.5rem] border p-5 sm:p-6"
        style={{ background: 'rgba(37, 37, 37, 0.88)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(12px)' }}
      >
        <motion.p variants={item} className="eyebrow" style={{ color: 'var(--accent-halftone)' }}>
          {'// press play'}
        </motion.p>
        <motion.h1
          variants={item}
          id="start-title"
          className="mt-3 font-display font-bold"
          style={{ fontSize: 'clamp(1.5rem, 2.8vw, 2.15rem)', lineHeight: 1.2 }}
        >
          Robot DJ is warming up
        </motion.h1>
        <motion.p
          variants={item}
          className="mt-2 hidden max-w-[60ch] text-muted min-[400px]:block"
          style={{ fontSize: 'clamp(0.98rem, 1.4vw, 1.1rem)', lineHeight: 1.6, textWrap: 'pretty' }}
        >
          A shuffled, audio-only set from param20h. Hit start and let the bot take the decks.
        </motion.p>

        <motion.div variants={item} className="mt-4 border-t border-dashed pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          {failed ? (
            <p className="font-mono text-sm" style={{ color: 'var(--halftone-red)' }}>
              {`// ${player.error}`}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                type="button"
                className={`btn-primary px-6 py-3 text-base ${loading ? '' : 'start-ring'}`}
                onClick={player.start}
                disabled={loading}
                autoFocus
                whileTap={{ scale: 0.95 }}
              >
                {loading ? 'Loading playlist…' : 'Start the set'}
                {!loading && <ArrowRight />}
              </motion.button>
              {!loading && (
                <motion.span
                  className="pill"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {`${player.queueLength} TRACKS · SHUFFLED`}
                </motion.span>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}
