import { AnimatePresence, motion } from 'motion/react'
import { projects } from '../content'

/** Liner notes for the album in front: what it is, and how to play it. */
export function Caption({ index }: { index: number }) {
  const p = projects[index]
  return (
    <div className="caption">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={p.slug}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span className="kicker">
            {String(index + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')} · {p.kind}
          </span>
          <h2>{p.title}</h2>
          <p>{p.oneLiner}</p>
          <div className="tags">
            {p.stack.slice(0, 5).map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <p className="cta">
            Click the cover to {p.live ? 'play it live' : 'open the notes'} · <kbd>⏮</kbd> <kbd>⏭</kbd> to flip
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
