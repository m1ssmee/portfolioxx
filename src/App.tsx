import { AnimatePresence } from 'motion/react'
import { lazy, Suspense, useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Caption } from './components/Caption'
import { PlainView } from './components/PlainView'
import { ProjectPanel } from './components/ProjectPanel'
import { profile, projects, YEAR } from './content'
import { rig } from './rig'
import { ambienceFor } from './three/ambience'
import { fontsReady } from './three/fonts'
import { focusIndex, usePod, type Action, type Pod } from './usePod'

const Scene = lazy(() => import('./three/Scene'))

const KEYS: Record<string, Action> = {
  ArrowUp: 'scrollUp',
  ArrowDown: 'scrollDown',
  Enter: 'select',
  ' ': 'select',
  Escape: 'menu',
  Backspace: 'menu',
  ArrowRight: 'next',
  ArrowLeft: 'prev',
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** One line for screen readers describing what the pod shows. */
function describe(pod: Pod) {
  if (pod.power !== 'on') return ''
  const top = pod.stack[pod.stack.length - 1]
  const v = top.view
  if (pod.opened !== null) return `Playing ${projects[pod.opened].title}. Escape to close.`
  if (v.kind === 'menu') {
    const it = pod.items(v.id)[top.sel]
    return it ? `${it.label}${it.value ? `, ${it.value}` : ''}` : ''
  }
  if (v.kind === 'project') return `Now playing ${projects[v.index].title}. Enter to open.`
  return v.kind === 'about' ? 'About' : 'Toolkit'
}

export default function App() {
  const pod = usePod()
  const { act, plain, setPower, togglePower } = pod
  const [webgl] = useState(hasWebGL)
  const [fonts, setFonts] = useState(false)
  const [ready, setReady] = useState(false)
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const markReady = useCallback(() => setReady(true), [])

  useEffect(() => {
    fontsReady.then(() => setFonts(true))
  }, [])

  useEffect(() => {
    const r = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])

  // power on once the scene has drawn
  useEffect(() => {
    if (!ready || plain) return
    const t = window.setTimeout(() => setPower('booting'), 300)
    return () => window.clearTimeout(t)
  }, [ready, plain, setPower])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => (rig.reducedMotion = mq.matches)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])

  // pointer position drives the parallax
  useEffect(() => {
    const m = (e: PointerEvent) => {
      rig.pointer.x = e.clientX / window.innerWidth
      rig.pointer.y = e.clientY / window.innerHeight
      rig.pointer.cx = e.clientX
      rig.pointer.cy = e.clientY
    }
    window.addEventListener('pointermove', m, { passive: true })
    return () => window.removeEventListener('pointermove', m)
  }, [])

  // keyboard
  useEffect(() => {
    if (plain) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.target as HTMLElement)?.closest?.('a, button')) return
      if (e.key === 'p' || e.key === 'P') {
        // the side button
        e.preventDefault()
        togglePower()
        return
      }
      const a = KEYS[e.key]
      if (!a) return
      e.preventDefault()
      act(a)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act, plain, togglePower])

  // mouse wheel / trackpad spins the click wheel
  useEffect(() => {
    if (plain) return
    let acc = 0
    const STEP = 48
    const onWheel = (e: WheelEvent) => {
      if ((e.target as Element).closest?.('.panel')) return
      e.preventDefault()
      acc += e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY
      let n = 0
      while (acc >= STEP && n < 3) {
        act('scrollDown')
        acc -= STEP
        n++
      }
      while (acc <= -STEP && n < 3) {
        act('scrollUp')
        acc += STEP
        n++
      }
      if (n === 3) acc = 0
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [act, plain])

  // touch: swipe anywhere that isn't the wheel or an earbud to scroll
  useEffect(() => {
    if (plain) return
    let last: number | null = null
    let acc = 0
    const STEP = 34
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || rig.busy) return
      if ((e.target as Element).closest('.panel, a, button')) return
      last = e.clientY
      acc = 0
    }
    const move = (e: PointerEvent) => {
      if (last === null || e.pointerType !== 'touch' || rig.busy) return
      acc += last - e.clientY
      last = e.clientY
      while (acc >= STEP) {
        act('scrollDown')
        acc -= STEP
      }
      while (acc <= -STEP) {
        act('scrollUp')
        acc += STEP
      }
    }
    const up = () => (last = null)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [act, plain])

  if (plain || !webgl) return <PlainView notice={!plain ? 'This browser can’t show the 3D version, so here is the plain one.' : undefined} />

  const focus = focusIndex(pod)
  const amb = ambienceFor(focus)
  const split = focus !== null && vp.w / vp.h > 1.15
  const n = projects.length
  const style = { '--ink': amb.ink, '--room': amb.base, '--accent': amb.accent } as CSSProperties

  return (
    <div
      className={`stage${amb.dark ? ' is-dark' : ''}${split ? ' is-split' : ''}${pod.opened !== null ? ' is-open' : ''}`}
      style={style}
    >
      {fonts && (
        <Suspense fallback={null}>
          <Scene pod={pod} onReady={markReady} />
        </Suspense>
      )}
      <div className={`loading${ready ? ' done' : ''}`} aria-hidden={ready}>
        <span className="loading-dot" />
        tuning in…
      </div>

      <AnimatePresence>
        {split && pod.opened === null && focus !== null && ready && <Caption key="caption" index={focus} />}
      </AnimatePresence>

      <AnimatePresence>
        {pod.opened !== null && (
          <ProjectPanel
            key="panel"
            index={pod.opened}
            onClose={() => pod.setOpened(null)}
            onPrev={() => pod.focusProject((pod.opened! - 1 + n) % n)}
            onNext={() => pod.focusProject((pod.opened! + 1) % n)}
          />
        )}
      </AnimatePresence>

      <header className="corner tl">
        <strong>{profile.name}</strong>
        <span>{profile.role}</span>
      </header>
      <div className="corner tr">
        <span>Portfolio ’{YEAR}</span>
        <span>{n} projects</span>
      </div>
      <div className="corner bl hints">
        <span>
          <kbd>scroll</kbd> or <kbd>↑</kbd>
          <kbd>↓</kbd> to spin · <kbd>enter</kbd> select · <kbd>esc</kbd> back
        </span>
        <span>
          <kbd>p</kbd> power · drag the earbuds · pull the plug
        </span>
      </div>
      <nav className="corner br">
        <a href={`https://github.com/${profile.handle}`} target="_blank" rel="noopener">
          github/{profile.handle} ↗
        </a>
        <a href="#plain">plain view</a>
      </nav>
      <p className="sr-only" aria-live="polite">
        {describe(pod)}
      </p>
    </div>
  )
}
