import { motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { projects, type Project } from '../content'
import { rig } from '../rig'

const SITE_W = 1180 // live sites render at least this wide, then scale to fit

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
          title={`${p.title} — live site`}
          onLoad={() => setLoaded(true)}
          style={{ width: fit.w, height: fit.h, transform: `scale(${fit.scale})` }}
          allow="fullscreen; clipboard-write"
        />
      )}
      {!loaded && (
        <div className="live-loading">
          <span className="spinner" />
          warming up the projector…
        </div>
      )}
    </div>
  )
}

function CaseCard({ p }: { p: Project }) {
  return (
    <div className="case">
      <div className="case-kicker">
        {p.kind} · {p.year}
      </div>
      <h2>{p.fullTitle}</h2>
      <p className="case-lede">{p.oneLiner}</p>
      {p.stats && (
        <div className="case-stats">
          {p.stats.map((s) => (
            <div key={s.label}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <ul className="case-points">
        {p.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      {p.status && <p className="case-status">{p.status}</p>}
      <div className="case-stack">
        {p.stack.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  )
}

export function Projector({ index, onClose }: { index: number; onClose: () => void }) {
  const p = projects[index]
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    rig.panelEl = panel.current
    return () => {
      rig.panelEl = null
    }
  }, [])

  const host = p.live ? new URL(p.live).host : p.repo.replace('https://', '')

  return (
    <motion.div
      ref={panel}
      className="projector"
      initial={{ opacity: 0, scaleY: 0.02, scaleX: 0.9 }}
      animate={{ opacity: 1, scaleY: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleY: 0.02, scaleX: 0.95 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="proj-bar">
        <span className={`proj-dot ${p.live ? 'is-live' : ''}`} />
        <span className="proj-title">{p.title}</span>
        <span className="proj-host">{host}</span>
        <span className="proj-spacer" />
        {p.live && (
          <a href={p.live} target="_blank" rel="noopener">
            Open ↗
          </a>
        )}
        {p.demo && (
          <a href={p.demo} target="_blank" rel="noopener">
            Demo ↗
          </a>
        )}
        <a href={p.repo} target="_blank" rel="noopener">
          GitHub ↗
        </a>
        <button type="button" onClick={onClose} aria-label="Close projector">
          ✕
        </button>
      </div>
      <div className="proj-screen">
        {p.live ? <LiveSite key={p.slug} p={p} /> : <CaseCard p={p} />}
        <div className="proj-fx" />
      </div>
    </motion.div>
  )
}
