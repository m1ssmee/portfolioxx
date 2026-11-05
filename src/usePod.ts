import { useCallback, useEffect, useRef, useState } from 'react'
import { contact, projects } from './content'
import { rig } from './rig'
import { buzz, click } from './sound'

export type MenuId = 'main' | 'projects' | 'contact' | 'settings'
export type View =
  | { kind: 'menu'; id: MenuId }
  | { kind: 'about' }
  | { kind: 'toolkit' }
  | { kind: 'project'; index: number }

export type Frame = { view: View; sel: number; scroll: number; key: number }

export const BODIES = ['cream', 'graphite', 'ember', 'lunar'] as const
export type Body = (typeof BODIES)[number]
export const BODY_LABEL: Record<Body, string> = {
  cream: 'Cream',
  graphite: 'Graphite',
  ember: 'Ember',
  lunar: 'Lunar',
}

export type Settings = { clicks: boolean; body: Body }

export type MenuItem = {
  label: string
  value?: string
  arrow?: boolean
  run: () => void
}

export type Action = 'scrollUp' | 'scrollDown' | 'select' | 'menu' | 'next' | 'prev' | 'play'

let keySeq = 0
const frame = (view: View, sel = 0): Frame => ({ view, sel, scroll: 0, key: ++keySeq })

function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem('pod-settings') || '{}')
    return {
      clicks: s.clicks !== false,
      body: BODIES.includes(s.body) ? s.body : 'cream',
    }
  } catch {
    return { clicks: true, body: 'cream' }
  }
}

export function usePod() {
  const [power, setPower] = useState<'off' | 'booting' | 'on'>('off')
  const [stack, setStack] = useState<Frame[]>([frame({ kind: 'menu', id: 'main' })])
  const [dir, setDir] = useState<1 | -1>(1)
  const [projecting, setProjecting] = useState<number | null>(null)
  const [lastPlayed, setLastPlayed] = useState<number | null>(null)
  const [volume, setVolume] = useState(0.6)
  const [volumeShownAt, setVolumeShownAt] = useState(0)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [plain, setPlain] = useState(() => location.hash === '#plain')

  // text screens report how far they can scroll
  const scrollMax = useRef(0)

  // keep a ref copy so event handlers always see fresh state
  const state = useRef({ stack, projecting, settings, volume, power, lastPlayed })
  state.current = { stack, projecting, settings, volume, power, lastPlayed }

  useEffect(() => {
    localStorage.setItem('pod-settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const onHash = () => setPlain(location.hash === '#plain')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const sound = useCallback((kind: 'tick' | 'press') => {
    const { settings, volume } = state.current
    if (settings.clicks) click(kind, kind === 'tick' ? volume : Math.max(0.3, volume))
    buzz(kind === 'tick' ? 4 : 10)
  }, [])

  const push = useCallback((view: View, sel = 0) => {
    setDir(1)
    setStack((s) => [...s, frame(view, sel)])
  }, [])

  const pop = useCallback(() => {
    setDir(-1)
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  }, [])

  const openProject = useCallback(
    (index: number) => {
      setLastPlayed(index)
      push({ kind: 'project', index })
    },
    [push],
  )

  const boot = useCallback(() => {
    setProjecting(null)
    setDir(1)
    setStack([frame({ kind: 'menu', id: 'main' })])
    setPower('booting')
  }, [])

  const items = useCallback(
    (id: MenuId): MenuItem[] => {
      switch (id) {
        case 'main':
          return [
            { label: 'Projects', arrow: true, run: () => push({ kind: 'menu', id: 'projects' }) },
            { label: 'About', arrow: true, run: () => push({ kind: 'about' }) },
            { label: 'Toolkit', arrow: true, run: () => push({ kind: 'toolkit' }) },
            { label: 'Contact', arrow: true, run: () => push({ kind: 'menu', id: 'contact' }) },
            {
              label: 'Shuffle Projects',
              run: () => {
                const cur = state.current.lastPlayed
                let i = Math.floor(Math.random() * projects.length)
                if (i === cur) i = (i + 1) % projects.length
                openProject(i)
              },
            },
            { label: 'Settings', arrow: true, run: () => push({ kind: 'menu', id: 'settings' }) },
            ...(state.current.lastPlayed !== null
              ? [{ label: 'Now Playing', arrow: true, run: () => openProject(state.current.lastPlayed!) }]
              : []),
          ]
        case 'projects':
          return projects.map((p, i) => ({ label: p.title, arrow: true, run: () => openProject(i) }))
        case 'contact':
          return [
            ...contact.map((c) => ({
              label: c.label,
              value: c.value,
              run: () => window.open(c.href, '_blank', 'noopener'),
            })),
            { label: 'Plain view', arrow: true, run: () => (location.hash = 'plain') },
          ]
        case 'settings': {
          const s = state.current.settings
          return [
            {
              label: 'Clicker',
              value: s.clicks ? 'On' : 'Off',
              run: () => setSettings((x) => ({ ...x, clicks: !x.clicks })),
            },
            {
              label: 'Body',
              value: BODY_LABEL[s.body],
              run: () =>
                setSettings((x) => ({ ...x, body: BODIES[(BODIES.indexOf(x.body) + 1) % BODIES.length] })),
            },
            { label: 'Restart', run: boot },
            { label: 'Plain view', arrow: true, run: () => (location.hash = 'plain') },
          ]
        }
      }
    },
    [push, openProject, boot],
  )

  const act = useCallback(
    (a: Action) => {
      const { stack, projecting, power } = state.current
      if (power === 'off') return
      if (power === 'booting') {
        // any input skips the boot animation
        setPower('on')
        return
      }
      const top = stack[stack.length - 1]
      const v = top.view
      const setTop = (patch: Partial<Frame>) =>
        setStack((s) => [...s.slice(0, -1), { ...s[s.length - 1], ...patch }])

      if (a === 'scrollUp' || a === 'scrollDown') {
        const d = a === 'scrollDown' ? 1 : -1
        rig.kick(d)
        if (v.kind === 'menu') {
          const n = items(v.id).length
          const sel = Math.max(0, Math.min(n - 1, top.sel + d))
          if (sel !== top.sel) {
            setTop({ sel })
            sound('tick')
          }
        } else if (v.kind === 'about' || v.kind === 'toolkit') {
          const scroll = Math.max(0, Math.min(scrollMax.current, top.scroll + d * 28))
          if (scroll !== top.scroll) {
            setTop({ scroll })
            sound('tick')
          }
        } else if (v.kind === 'project') {
          setVolume((x) => Math.max(0, Math.min(1, Math.round((x + d * 0.05) * 100) / 100)))
          setVolumeShownAt(performance.now())
          sound('tick')
        }
        return
      }

      sound('press')
      rig.bump()

      if (a === 'menu') {
        if (projecting !== null) setProjecting(null)
        else pop()
        return
      }

      if (a === 'select' || a === 'play') {
        if (v.kind === 'menu') {
          if (a === 'play') {
            const lp = state.current.lastPlayed
            if (lp !== null) openProject(lp)
            else push({ kind: 'menu', id: 'projects' })
            return
          }
          items(v.id)[top.sel]?.run()
        } else if (v.kind === 'project') {
          setProjecting((p) => (p === v.index ? null : v.index))
        }
        return
      }

      if (a === 'next' || a === 'prev') {
        const d = a === 'next' ? 1 : -1
        if (v.kind === 'project') {
          const n = projects.length
          const index = (v.index + d + n) % n
          setDir(d as 1 | -1)
          setLastPlayed(index)
          setStack((s) => [...s.slice(0, -1), frame({ kind: 'project', index })])
          if (projecting !== null) setProjecting(index)
        } else if (a === 'next' && v.kind === 'menu') {
          items(v.id)[top.sel]?.run()
        } else if (a === 'prev') {
          pop()
        }
      }
    },
    [items, pop, push, openProject, sound],
  )

  return {
    power,
    setPower,
    boot,
    stack,
    dir,
    projecting,
    setProjecting,
    lastPlayed,
    volume,
    volumeShownAt,
    settings,
    items,
    act,
    scrollMax,
    plain,
  }
}

export type Pod = ReturnType<typeof usePod>
