import { AnimatePresence } from 'motion/react'
import { useEffect, useRef } from 'react'
import { ClickWheel } from './components/ClickWheel'
import { Earphones } from './components/Earphones'
import { PlainView } from './components/PlainView'
import { Projector } from './components/Projector'
import { Screen } from './components/Screen'
import { profile, projects, YEAR } from './content'
import { rig } from './rig'
import { usePod, type Action } from './usePod'

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

export default function App() {
  const pod = usePod()
  const { act, plain, setPower } = pod
  const frameRef = useRef<HTMLDivElement>(null)
  const deviceRef = useRef<HTMLDivElement>(null)
  const beamRef = useRef<SVGPolygonElement>(null)

  // power on shortly after load
  useEffect(() => {
    if (plain) return
    const t = window.setTimeout(() => setPower((p) => (p === 'off' ? 'booting' : p)), 350)
    return () => window.clearTimeout(t)
  }, [plain, setPower])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => (rig.reducedMotion = mq.matches)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])

  // register DOM nodes with the animation loop
  useEffect(() => {
    rig.frameEl = frameRef.current
    rig.deviceEl = deviceRef.current
    rig.beamEl = beamRef.current
    return () => {
      rig.frameEl = rig.deviceEl = null
      rig.beamEl = null
    }
  }, [plain])

  // keyboard
  useEffect(() => {
    if (plain) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const a = KEYS[e.key]
      if (!a) return
      e.preventDefault()
      act(a)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act, plain])

  // mouse wheel / trackpad spins the click wheel
  useEffect(() => {
    if (plain) return
    let acc = 0
    const STEP = 48
    const onWheel = (e: WheelEvent) => {
      if ((e.target as Element).closest?.('.projector')) return
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

  // touch: swipe anywhere outside the wheel to scroll
  useEffect(() => {
    if (plain) return
    let last: number | null = null
    let acc = 0
    const STEP = 34
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      const t = e.target as Element
      if (t.closest('.wheel, .projector, a, button')) return
      last = e.clientY
      acc = 0
    }
    const move = (e: PointerEvent) => {
      if (last === null || e.pointerType !== 'touch') return
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

  if (plain) return <PlainView />

  const projecting = pod.projecting !== null
  return (
    <div className={`stage body-${pod.settings.body} ${projecting ? 'is-projecting' : ''}`}>
      <div className="backdrop" aria-hidden="true">
        <span className="giant">{profile.short}</span>
      </div>

      <div className="frame" ref={frameRef}>
        <div className="pod" ref={deviceRef}>
          <Screen pod={pod} />
          <ClickWheel act={act} />
        </div>
      </div>

      <svg className={`beam ${projecting ? 'on' : ''}`} aria-hidden="true">
        <defs>
          <linearGradient id="beam-g" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff3df" stopOpacity="0.32" />
            <stop offset="1" stopColor="#fff3df" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon ref={beamRef} fill="url(#beam-g)" />
      </svg>

      <AnimatePresence>
        {pod.projecting !== null && (
          <Projector key="projector" index={pod.projecting} onClose={() => act('menu')} />
        )}
      </AnimatePresence>

      <Earphones />

      <div className="corner tl">
        <strong>{profile.name}</strong>
        <span>{profile.role}</span>
      </div>
      <div className="corner tr">
        <span>Portfolio ’{YEAR}</span>
        <span>{projects.length} projects</span>
      </div>
      <div className="corner bl hints">
        <span>
          <kbd>scroll</kbd> or <kbd>↑</kbd>
          <kbd>↓</kbd> spin
        </span>
        <span>
          <kbd>enter</kbd> select · <kbd>esc</kbd> menu
        </span>
        <span>grab the earbuds</span>
      </div>
      <div className="corner br">
        <a href={`https://github.com/${profile.handle}`} target="_blank" rel="noopener">
          github/{profile.handle} ↗
        </a>
        <a href="#plain">plain view</a>
      </div>
    </div>
  )
}
