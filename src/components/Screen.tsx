import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { contact, profile, projects, toolkit, YEAR, type Project } from '../content'
import { rig } from '../rig'
import { BODY_LABEL, type Frame, type MenuId, type Pod } from '../usePod'

const TITLES: Record<MenuId, string> = {
  main: profile.name,
  projects: 'Projects',
  contact: 'Contact',
  settings: 'Settings',
}

function titleOf(f: Frame) {
  const v = f.view
  if (v.kind === 'menu') return TITLES[v.id]
  if (v.kind === 'about') return 'About'
  if (v.kind === 'toolkit') return 'Toolkit'
  return 'Now Playing'
}

// "BodyMap" -> "BM", "Codebase Tavern" -> "CT", "Santosh P." -> "SP"
const initials = (s: string) => (s.match(/[A-Z]/g) ?? [s[0]]).join('').slice(0, 2)

export function Cover({ p, n }: { p: Project; n: number }) {
  return (
    <div className="cover" style={{ '--c1': p.cover[0], '--c2': p.cover[1] } as React.CSSProperties}>
      <span className="cover-rings" />
      <span className="cover-num">{String(n + 1).padStart(2, '0')}</span>
      <span className="cover-mark">{initials(p.title)}</span>
    </div>
  )
}

function Badge({ p }: { p: Project }) {
  return p.live ? <span className="badge is-live">● LIVE</span> : <span className="badge">REPO</span>
}

// ------------------------------------------------------------------ menus
function Glyph({ g, cap }: { g: string; cap: string }) {
  return (
    <div className="glyph">
      <span className="glyph-big">{g}</span>
      <span className="glyph-cap">{cap}</span>
    </div>
  )
}

function Preview({ pod, id, sel }: { pod: Pod; id: MenuId; sel: number }) {
  const label = pod.items(id)[sel]?.label
  if (id === 'projects') {
    const p = projects[sel]
    return (
      <div className="pv-project">
        <Cover p={p} n={sel} />
        <div className="pv-meta">
          <span>{p.kind}</span>
          <span>
            {p.year} · <Badge p={p} />
          </span>
        </div>
      </div>
    )
  }
  if (id === 'main') {
    switch (label) {
      case 'Projects':
        return <Glyph g={String(projects.length).padStart(2, '0')} cap="projects" />
      case 'About':
        return <Glyph g={initials(profile.name)} cap={profile.role} />
      case 'Toolkit':
        return <Glyph g="</>" cap={`${toolkit.length} stacks`} />
      case 'Contact':
        return <Glyph g="@" cap={profile.handle} />
      case 'Shuffle Projects':
        return <Glyph g="⤮" cap="surprise me" />
      case 'Settings':
        return <Glyph g="⚙" cap={BODY_LABEL[pod.settings.body].toLowerCase()} />
      case 'Now Playing':
        return pod.lastPlayed !== null ? <Cover p={projects[pod.lastPlayed]} n={pod.lastPlayed} /> : null
    }
  }
  if (id === 'contact') {
    const c = contact[sel]
    return c ? <Glyph g="↗" cap={c.value} /> : <Glyph g="≡" cap="no frills" />
  }
  if (id === 'settings') {
    const it = pod.items(id)[sel]
    if (it?.label === 'Body')
      return (
        <div className="glyph">
          <span className="swatch" />
          <span className="glyph-cap">{it.value?.toLowerCase()}</span>
        </div>
      )
    if (it?.label === 'Clicker') return <Glyph g={it.value ?? ''} cap="wheel clicks" />
    if (it?.label === 'Restart') return <Glyph g="↻" cap="boot again" />
    return <Glyph g="≡" cap="no frills" />
  }
  return null
}

const VISIBLE = 7
function MenuView({ pod, f, id }: { pod: Pod; f: Frame; id: MenuId }) {
  const items = pod.items(id)
  const start = Math.max(0, f.sel - VISIBLE + 1)
  return (
    <div className="menu">
      <ul className="menu-list">
        {items.slice(start, start + VISIBLE).map((it, k) => {
          const i = start + k
          return (
            <li key={it.label} className={i === f.sel ? 'on' : ''}>
              <span className="mi-label">{it.label}</span>
              {it.value && <span className="mi-value">{it.value}</span>}
              {it.arrow && <span className="mi-arrow">›</span>}
            </li>
          )
        })}
      </ul>
      <div className="menu-preview">
        <Preview pod={pod} id={id} sel={f.sel} />
      </div>
    </div>
  )
}

// ------------------------------------------------------------ now playing
function ProjectView({ pod, index }: { pod: Pod; index: number }) {
  const p = projects[index]
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    if (!pod.volumeShownAt) return
    setNow(performance.now())
    const t = window.setTimeout(() => setNow(performance.now()), 1300)
    return () => window.clearTimeout(t)
  }, [pod.volumeShownAt])
  const showVol = now - pod.volumeShownAt < 1200
  return (
    <div className="np">
      <div className="np-count">
        {index + 1} of {projects.length}
      </div>
      <div className="np-top">
        <Cover p={p} n={index} />
        <div className="np-info">
          <strong>{p.title}</strong>
          <span>{p.kind}</span>
          <span>
            {p.year} · <Badge p={p} />
          </span>
        </div>
      </div>
      <p className="np-line">{p.oneLiner}</p>
      <div className="np-foot">
        {showVol ? (
          <div className="np-vol">
            <span>🔈</span>
            <div className="bar">
              <i style={{ width: `${pod.volume * 100}%` }} />
            </div>
            <span>🔊</span>
          </div>
        ) : (
          <div className="np-hint">
            <span className="key">●</span> {p.live ? 'project live site' : 'project case study'}
            <span className="sep" />
            <span className="key">⏭</span> next
          </div>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ text pages
function TextView({ pod, f, children }: { pod: Pod; f: Frame; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState({ size: 1, max: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return
      const max = Math.max(0, inner.current.scrollHeight - outer.current.clientHeight)
      pod.scrollMax.current = max
      setRatio({ size: outer.current.clientHeight / inner.current.scrollHeight, max })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(outer.current!)
    return () => ro.disconnect()
  }, [pod.scrollMax])
  const scroll = Math.min(f.scroll, ratio.max)
  return (
    <div className="text" ref={outer}>
      <div className="text-inner" ref={inner} style={{ transform: `translateY(${-scroll}px)` }}>
        {children}
      </div>
      {ratio.max > 0 && (
        <div className="scrollbar">
          <i
            style={{
              height: `${ratio.size * 100}%`,
              top: `${(scroll / ratio.max) * (1 - ratio.size) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  )
}

function About() {
  return (
    <>
      <h3>{profile.name}</h3>
      <p className="dim">{profile.role}</p>
      {profile.about.map((t) => (
        <p key={t}>{t}</p>
      ))}
      <p className="dim">Scroll for more · MENU to go back</p>
    </>
  )
}

function Toolkit() {
  return (
    <>
      {toolkit.map((g) => (
        <div key={g.group} className="tk">
          <h4>{g.group}</h4>
          <p>{g.items.join(' · ')}</p>
        </div>
      ))}
    </>
  )
}

// ---------------------------------------------------------------- views
function View({ pod, f }: { pod: Pod; f: Frame }) {
  const v = f.view
  if (v.kind === 'menu') return <MenuView pod={pod} f={f} id={v.id} />
  if (v.kind === 'project') return <ProjectView pod={pod} index={v.index} />
  return (
    <TextView pod={pod} f={f}>
      {v.kind === 'about' ? <About /> : <Toolkit />}
    </TextView>
  )
}

const slide = {
  enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%' }),
  center: { x: '0%' },
  exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%' }),
}

function Projecting({ index }: { index: number }) {
  const p = projects[index]
  return (
    <motion.div
      className="projecting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="lamp">
        <span />
        <span />
        <span />
      </div>
      <strong>{p.title}</strong>
      <span className="dim">projecting{p.live ? ' live' : ''} →</span>
      <div className="np-hint">
        <span className="key">⏮</span>
        <span className="key">⏭</span> switch
        <span className="sep" />
        <span className="key">MENU</span> stop
      </div>
    </motion.div>
  )
}

// ------------------------------------------------------------------ boot
const BOOT_LINES = [
  `mounting ${projects.length} projects`,
  'plugging in earphones',
  'warming up the projector',
]

function Boot({ onDone }: { onDone: () => void }) {
  const [t, setT] = useState(0)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    const fast = rig.reducedMotion
    const start = performance.now()
    let raf = 0
    const tick = () => {
      const e = performance.now() - start
      setT(e)
      if (e > (fast ? 900 : 2700)) done.current()
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const progress = Math.min(1, Math.max(0, (t - 700) / 1600))
  return (
    <div className="boot">
      <div className="boot-flash" />
      {t > 450 && (
        <div className="boot-inner">
          <div className="boot-logo">
            {profile.short}
            <span>.</span>
          </div>
          <div className="boot-sub">portfolio os · ’{YEAR}</div>
          <div className="boot-bar">
            <i style={{ width: `${progress * 100}%` }} />
          </div>
          <ul className="boot-log">
            {BOOT_LINES.map((l, i) =>
              t > 800 + i * 480 ? (
                <li key={l}>
                  {l}… <span>{t > 1100 + i * 480 ? 'ok' : ''}</span>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- screen
export function Screen({ pod }: { pod: Pod }) {
  const lcd = useRef<HTMLDivElement>(null)
  useEffect(() => {
    rig.screenEl = lcd.current
    return () => {
      rig.screenEl = null
    }
  }, [])
  const top = pod.stack[pod.stack.length - 1]
  const playing = pod.projecting !== null || top.view.kind === 'project'
  return (
    <div className="bezel">
      <div className={`lcd power-${pod.power}`} ref={lcd}>
        {pod.power !== 'off' && (
          <>
            <header className="lcd-head">
              <span className="lh-left">{playing ? '▶' : ''}</span>
              <span className="lh-title">{pod.projecting !== null ? 'Projecting' : titleOf(top)}</span>
              <span className="battery">
                <i />
              </span>
            </header>
            <div className="lcd-body">
              <AnimatePresence initial={false} custom={pod.dir}>
                <motion.div
                  key={top.key}
                  className="view"
                  custom={pod.dir}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.24, ease: [0.3, 0.7, 0.2, 1] }}
                >
                  <View pod={pod} f={top} />
                </motion.div>
              </AnimatePresence>
              <AnimatePresence>
                {pod.projecting !== null && <Projecting key="proj" index={pod.projecting} />}
              </AnimatePresence>
            </div>
          </>
        )}
        {pod.power === 'booting' && <Boot onDone={() => pod.setPower('on')} />}
        <div className="lcd-fx" />
      </div>
    </div>
  )
}
