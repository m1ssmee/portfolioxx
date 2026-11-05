import { useCallback, useEffect, useRef, useState } from 'react'
import { cam } from './camera'
import { contact, projects } from './content'
import { rig } from './rig'
import { buzz, click, plugSound, shutterSound } from './sound'

export type MenuId = 'main' | 'projects' | 'contact' | 'settings'
export type View =
  | { kind: 'menu'; id: MenuId }
  | { kind: 'about' }
  | { kind: 'toolkit' }
  | { kind: 'camera' }
  | { kind: 'project'; index: number }

export type Frame = { view: View; sel: number; scroll: number; key: number }

export const BODIES = ['clear', 'smoke', 'frost', 'ice'] as const
export type Body = (typeof BODIES)[number]
export const BODY_LABEL: Record<Body, string> = {
  clear: 'Clear',
  smoke: 'Smoke',
  frost: 'Frost',
  ice: 'Ice',
}

export type Settings = { clicks: boolean; body: Body }

export type MenuItem = {
  id: string
  label: string
  value?: string
  arrow?: boolean
  run: () => void
}

export type Toast = { text: string; icon: 'earbuds' | 'off'; at: number }

export type Action = 'scrollUp' | 'scrollDown' | 'select' | 'menu' | 'next' | 'prev' | 'play'

let keySeq = 0
const frame = (view: View, sel = 0): Frame => ({ view, sel, scroll: 0, key: ++keySeq })

/** How far one wheel detent scrolls a text page, in screen-texture pixels. */
export const SCROLL_STEP = 70
/** Length of the power-on animation. */
export const BOOT_MS = 1900

// window.open is blocked in some embeds (sandboxed previews); a real link click is not.
function openExternal(href: string) {
  const a = document.createElement('a')
  a.href = href
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem('pod-settings-v3') || '{}')
    return {
      clicks: s.clicks !== false,
      body: BODIES.includes(s.body) ? s.body : 'clear',
    }
  } catch {
    return { clicks: true, body: 'clear' }
  }
}

export function usePod() {
  const [power, setPowerState] = useState<'off' | 'booting' | 'on'>('off')
  const [bootAt, setBootAt] = useState(0)
  const [stack, setStack] = useState<Frame[]>([frame({ kind: 'menu', id: 'main' })])
  const [dir, setDir] = useState<1 | -1>(1)
  /** project whose panel is open (the album being "played") */
  const [opened, setOpened] = useState<number | null>(null)
  const [lastPlayed, setLastPlayed] = useState<number | null>(null)
  const [volume, setVolume] = useState(0.6)
  const [volumeShownAt, setVolumeShownAt] = useState(0)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [plugged, setPluggedState] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const [plain, setPlain] = useState(() => location.hash === '#plain')

  // text screens report how far they can scroll
  const scrollMax = useRef(0)

  // keep a ref copy so event handlers always see fresh state
  const state = useRef({ stack, opened, settings, volume, power, lastPlayed, plugged })
  state.current = { stack, opened, settings, volume, power, lastPlayed, plugged }

  useEffect(() => {
    try {
      localStorage.setItem('pod-settings-v3', JSON.stringify(settings))
    } catch {
      /* storage can be unavailable; settings just won't persist */
    }
  }, [settings])

  useEffect(() => {
    const onHash = () => setPlain(location.hash === '#plain')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setPower = useCallback((p: 'off' | 'booting' | 'on') => {
    if (p === 'booting') setBootAt(performance.now())
    setPowerState(p)
  }, [])

  // the boot sequence finishes by itself; any input skips it (see act)
  useEffect(() => {
    if (power !== 'booting') return
    const t = window.setTimeout(() => setPowerState('on'), rig.reducedMotion ? 700 : BOOT_MS)
    return () => window.clearTimeout(t)
  }, [power, bootAt])

  const sound = useCallback((kind: 'tick' | 'press') => {
    const { settings, volume } = state.current
    if (settings.clicks) click(kind, kind === 'tick' ? volume : Math.max(0.3, volume))
    buzz(kind === 'tick' ? 4 : 10)
  }, [])

  /** Called by the 3D scene when the earphones are pulled out or clicked back in. */
  const setPlugged = useCallback((v: boolean) => {
    if (state.current.plugged === v) return
    setPluggedState(v)
    setToast({
      text: v ? 'Earphones connected' : 'Earphones disconnected',
      icon: v ? 'earbuds' : 'off',
      at: performance.now(),
    })
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
    setOpened(null)
    setDir(1)
    setStack([frame({ kind: 'menu', id: 'main' })])
    setPower('booting')
  }, [setPower])

  const items = useCallback(
    (id: MenuId): MenuItem[] => {
      switch (id) {
        case 'main':
          return [
            { id: 'projects', label: 'Projects', arrow: true, run: () => push({ kind: 'menu', id: 'projects' }) },
            { id: 'about', label: 'About', arrow: true, run: () => push({ kind: 'about' }) },
            { id: 'toolkit', label: 'Toolkit', arrow: true, run: () => push({ kind: 'toolkit' }) },
            { id: 'camera', label: 'Camera', arrow: true, run: () => push({ kind: 'camera' }) },
            { id: 'contact', label: 'Contact', arrow: true, run: () => push({ kind: 'menu', id: 'contact' }) },
            { id: 'settings', label: 'Settings', arrow: true, run: () => push({ kind: 'menu', id: 'settings' }) },
          ]
        case 'projects':
          return projects.map((p, i) => ({ id: p.slug, label: p.title, arrow: true, run: () => openProject(i) }))
        case 'contact':
          return [
            ...contact.map((c) => ({
              id: c.label.toLowerCase(),
              label: c.label,
              value: c.value,
              run: () => openExternal(c.href),
            })),
            { id: 'plain', label: 'Plain view', arrow: true, run: () => (location.hash = 'plain') },
          ]
        case 'settings': {
          const s = state.current.settings
          return [
            {
              id: 'clicks',
              label: 'Click sound',
              value: s.clicks ? 'On' : 'Off',
              run: () => setSettings((x) => ({ ...x, clicks: !x.clicks })),
            },
            {
              id: 'finish',
              label: 'Finish',
              value: BODY_LABEL[s.body],
              run: () =>
                setSettings((x) => ({ ...x, body: BODIES[(BODIES.indexOf(x.body) + 1) % BODIES.length] })),
            },
            { id: 'restart', label: 'Restart', run: boot },
            { id: 'plain', label: 'Plain view', arrow: true, run: () => (location.hash = 'plain') },
          ]
        }
      }
    },
    [push, openProject, boot],
  )

  /** The side button: sleep when on, wake when off. */
  const togglePower = useCallback(() => {
    rig.powerAt = performance.now()
    const { power, settings } = state.current
    if (settings.clicks) plugSound('in', 0.5)
    buzz(12)
    if (power === 'off') boot()
    else {
      setOpened(null)
      setPowerState('off')
    }
  }, [boot])

  // the camera runs only while its screen is showing
  const topKind = stack[stack.length - 1].view.kind
  useEffect(() => {
    if (topKind === 'camera' && power === 'on') void cam.start()
    else cam.stop()
  }, [topKind, power])
  useEffect(() => () => cam.stop(), [])

  /** Jump straight to a project (from a click on its album cover). Opens it if it is already in front. */
  const focusProject = useCallback(
    (i: number) => {
      const { stack, opened } = state.current
      const top = stack[stack.length - 1]
      const v = top.view
      sound('press')
      if (opened !== null) {
        setOpened(i)
        setLastPlayed(i)
        return
      }
      if (v.kind === 'menu' && v.id === 'projects') {
        if (top.sel === i) {
          // clicking the album in front plays it
          openProject(i)
          setOpened(i)
        } else setStack((s) => [...s.slice(0, -1), { ...s[s.length - 1], sel: i }])
        return
      }
      if (v.kind === 'project') {
        if (v.index === i) {
          setOpened(i)
          return
        }
        setDir(i > v.index ? 1 : -1)
        setLastPlayed(i)
        setStack((s) => [...s.slice(0, -1), frame({ kind: 'project', index: i })])
        return
      }
      openProject(i)
    },
    [openProject, sound],
  )

  const act = useCallback(
    (a: Action) => {
      const { stack, opened, power } = state.current
      if (power === 'off') {
        // pressing the wheel wakes it up, like any device
        if (a !== 'scrollUp' && a !== 'scrollDown') togglePower()
        return
      }
      if (power === 'booting') {
        // any input skips the boot animation
        setPowerState('on')
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
          const scroll = Math.max(0, Math.min(scrollMax.current, top.scroll + d * SCROLL_STEP))
          if (scroll !== top.scroll) {
            setTop({ scroll })
            sound('tick')
          }
        } else if (v.kind === 'project') {
          setVolume((x) => Math.max(0, Math.min(1, Math.round((x + d * 0.05) * 100) / 100)))
          setVolumeShownAt(performance.now())
          sound('tick')
        } else if (v.kind === 'camera') {
          cam.next(d)
          setTop({ sel: cam.filter })
          sound('tick')
        }
        return
      }

      if (v.kind === 'camera' && (a === 'select' || a === 'play')) {
        cam.shoot(performance.now())
        if (state.current.settings.clicks) shutterSound()
        buzz(20)
        setTop({ scroll: top.scroll + 1 }) // re-render so the screen shows the new photo
        return
      }

      sound('press')
      rig.bump()

      if (a === 'menu') {
        if (opened !== null) setOpened(null)
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
          setOpened((p) => (p === v.index ? null : v.index))
        }
        return
      }

      if (a === 'next' || a === 'prev') {
        const d = a === 'next' ? 1 : -1
        const n = projects.length
        if (v.kind === 'camera') {
          cam.next(d)
          setTop({ sel: cam.filter })
        } else if (v.kind === 'project') {
          const index = (v.index + d + n) % n
          setDir(d as 1 | -1)
          setLastPlayed(index)
          setStack((s) => [...s.slice(0, -1), frame({ kind: 'project', index })])
          if (opened !== null) setOpened(index)
        } else if (v.kind === 'menu' && v.id === 'projects') {
          // skip through the albums without leaving the list
          setTop({ sel: (top.sel + d + n) % n })
        } else if (a === 'next' && v.kind === 'menu') {
          items(v.id)[top.sel]?.run()
        } else if (a === 'prev') {
          pop()
        }
      }
    },
    [items, pop, push, openProject, sound, togglePower],
  )

  return {
    power,
    bootAt,
    setPower,
    togglePower,
    boot,
    stack,
    dir,
    opened,
    setOpened,
    lastPlayed,
    volume,
    volumeShownAt,
    settings,
    plugged,
    setPlugged,
    toast,
    items,
    act,
    focusProject,
    scrollMax,
    plain,
  }
}

export type Pod = ReturnType<typeof usePod>

/** The project the room is "about" right now (selected album, playing, or open), if any. */
export function focusIndex(pod: Pick<Pod, 'stack' | 'opened'>): number | null {
  if (pod.opened !== null) return pod.opened
  const top = pod.stack[pod.stack.length - 1]
  if (top.view.kind === 'project') return top.view.index
  if (top.view.kind === 'menu' && top.view.id === 'projects') return top.sel
  return null
}
