import { motion } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import { projects, type Project } from '../content'
import { coverUrl } from '../three/art'

const SITE_W = 1200 // live sites render at least this wide, then scale to fit

function LiveSite({ p }: { p: Project }) {
  const box = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ scale: 1, w: 0, h: 0 })
  const [loaded, setLoaded] = useState(false)

  useLayoutEffect(() => {
    const el = box.current!
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      const scale = w < SITE_W && window.innerWidth > 900 ? w / SITE_W : 1
      setFit({ scale, w: w / scale, h: h / scale })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="live" ref={box}>
      {fit.w > 0 && (
        <iframe
          key={p.slug}
          src={p.live}
          title={`${p.title}: live site`}
          onLoad={() => setLoaded(true)}
          style={{ width: fit.w, height: fit.h, transform: `scale(${fit.scale})` }}
          allow="fullscreen; clipboard-write"
        />
      )}
      {!loaded && (
        <div className="live-loading">
          <span className="spinner" />
          Loading the live site…
        </div>
      )}
    </div>
  )
}

function Notes({ p }: { p: Project }) {
  return (
    <div className="notes">
      <p className="notes-lede">{p.oneLiner}</p>
      {p.stats && (
        <div className="notes-stats">
          {p.stats.map((s) => (
            <div key={s.label}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <ul className="notes-points">
        {p.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      {p.status && <p className="notes-status">{p.status}</p>}
      <div className="tags">
        {p.stack.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  )
}

type Props = { index: number; onClose: () => void; onPrev: () => void; onNext: () => void }

/** The "playing" album: the project's live site (or its notes) on the page next to the pod. */
export function ProjectPanel({ index, onClose, onPrev, onNext }: Props) {
  const p = projects[index]
  return (
    <motion.section
      className="panel"
      aria-label={p.title}
      initial={{ opacity: 0, x: 60, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <header className="panel-head">
        <img className="panel-cover" src={coverUrl(index)} alt="" />
        <div className="panel-title">
          <span className="kicker">
            {p.kind} · {p.year}
          </span>
          <h2>{p.fullTitle}</h2>
        </div>
        <nav className="panel-actions">
          {p.live && (
            <a className="btn primary" href={p.live} target="_blank" rel="noopener">
              Open site ↗
            </a>
          )}
          {p.demo && (
            <a className="btn" href={p.demo} target="_blank" rel="noopener">
              Demo ↗
            </a>
          )}
          <a className="btn" href={p.repo} target="_blank" rel="noopener">
            GitHub ↗
          </a>
          <span className="sep" />
          <button className="icon" type="button" onClick={onPrev} aria-label="Previous project">
            ‹
          </button>
          <button className="icon" type="button" onClick={onNext} aria-label="Next project">
            ›
          </button>
          <button className="icon" type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </nav>
      </header>
      <div className="panel-body">{p.live ? <LiveSite key={p.slug} p={p} /> : <Notes p={p} />}</div>
    </motion.section>
  )
}
