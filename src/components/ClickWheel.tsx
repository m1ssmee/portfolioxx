import { useRef, useState } from 'react'
import type { Action } from '../usePod'

const STEP = (Math.PI * 2) / 22 // detents per revolution
type Zone = 'menu' | 'next' | 'play' | 'prev'

function zoneOf(a: number): Zone {
  if (a >= -0.75 * Math.PI && a < -0.25 * Math.PI) return 'menu'
  if (a >= -0.25 * Math.PI && a < 0.25 * Math.PI) return 'next'
  if (a >= 0.25 * Math.PI && a < 0.75 * Math.PI) return 'play'
  return 'prev'
}

export function ClickWheel({ act }: { act: (a: Action) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ last: number; acc: number; moved: number; start: number } | null>(null)
  const [pressed, setPressed] = useState<Zone | 'center' | null>(null)
  const [finger, setFinger] = useState<number | null>(null)

  const angle = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2))
  }

  const flash = (z: Zone | 'center') => {
    setPressed(z)
    window.setTimeout(() => setPressed((p) => (p === z ? null : p)), 140)
  }

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.wheel-center')) return
    e.preventDefault()
    ref.current!.setPointerCapture(e.pointerId)
    const a = angle(e)
    drag.current = { last: a, acc: 0, moved: 0, start: a }
    setPressed(zoneOf(a))
  }

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const a = angle(e)
    let diff = a - d.last
    if (diff > Math.PI) diff -= Math.PI * 2
    if (diff < -Math.PI) diff += Math.PI * 2
    d.last = a
    d.acc += diff
    d.moved += Math.abs(diff)
    if (d.moved > 0.12) {
      setPressed(null)
      setFinger(a)
    }
    while (d.acc >= STEP) {
      act('scrollDown')
      d.acc -= STEP
    }
    while (d.acc <= -STEP) {
      act('scrollUp')
      d.acc += STEP
    }
  }

  const onUp = () => {
    const d = drag.current
    drag.current = null
    setFinger(null)
    if (!d) return
    if (d.moved < 0.12) {
      const z = zoneOf(d.start)
      flash(z)
      act(z)
    } else setPressed(null)
  }

  return (
    <div
      ref={ref}
      className="wheel"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="group"
      aria-label="Click wheel: drag around to scroll"
    >
      <div className={`wheel-press ${pressed && pressed !== 'center' ? `on-${pressed}` : ''}`} />
      {finger !== null && (
        <div
          className="wheel-finger"
          style={{ transform: `rotate(${(finger * 180) / Math.PI}deg) translateX(var(--finger-r))` }}
        />
      )}
      <span className="wheel-label wl-menu">MENU</span>
      <span className="wheel-label wl-next" aria-label="Next">
        <svg viewBox="0 0 24 12">
          <path d="M1 1l7 5-7 5zM9 1l7 5-7 5z" />
          <rect x="17" y="1" width="2.4" height="10" />
        </svg>
      </span>
      <span className="wheel-label wl-prev" aria-label="Previous">
        <svg viewBox="0 0 24 12">
          <rect x="4.6" y="1" width="2.4" height="10" />
          <path d="M15 1l-7 5 7 5zM23 1l-7 5 7 5z" />
        </svg>
      </span>
      <span className="wheel-label wl-play" aria-label="Play or pause">
        <svg viewBox="0 0 24 12">
          <path d="M2 1l8 5-8 5z" />
          <rect x="13" y="1" width="2.6" height="10" />
          <rect x="18" y="1" width="2.6" height="10" />
        </svg>
      </span>
      <button
        type="button"
        tabIndex={-1}
        className={`wheel-center ${pressed === 'center' ? 'is-pressed' : ''}`}
        aria-label="Select"
        onClick={() => {
          flash('center')
          act('select')
        }}
      />
    </div>
  )
}
