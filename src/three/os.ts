// The pod's operating system, drawn into a canvas that becomes the screen texture.
// A colourful music-player look: each screen is washed in the colours of the cover in focus,
// rows sit on a frosted highlight that glides between them, and the menu has little app tiles.
import * as THREE from 'three'
import { cam, FILTERS } from '../camera'
import { profile, projects, toolkit, YEAR } from '../content'
import { BODIES, BOOT_MS, type Frame, type MenuId, type MenuItem, type Pod } from '../usePod'
import { cover } from './art'
import { DISPLAY, fontsReady, UI } from './fonts'
import { POD } from './model'
import { FINISHES } from './palette'

export const CW = 900
export const CH = Math.round((CW * POD.active.h) / POD.active.w) // square pixels on the glass
const PX = CW / POD.active.w
/** The punch-hole camera, in screen pixels. The UI keeps clear of it. */
export const LENS = {
  x: CW / 2,
  y: (POD.display.y + POD.active.h / 2 - POD.lens.y) * PX,
  r: POD.lens.r * PX,
}

const MONO = '"JetBrains Mono Variable", ui-monospace, monospace'
const W = '#ffffff'
const G1 = 'rgba(255,255,255,0.66)'
const G2 = 'rgba(255,255,255,0.42)'
const G3 = 'rgba(255,255,255,0.16)'
const INK = '#0c0d11' // the screen's base colour
const GREEN = '#30d158'
const PAD = 54

const easeOut = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3)
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
type Ctx = CanvasRenderingContext2D

function rgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6)
  const n = parseInt(full, 16) || 0
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function wrap(ctx: Ctx, text: string, maxW: number) {
  const words = text.split(/\s+/)
  const out: string[] = []
  let line = ''
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (!line || ctx.measureText(t).width <= maxW) line = t
    else {
      out.push(line)
      line = w
    }
  }
  if (line) out.push(line)
  return out
}

function pill(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

/** Small glyphs: the menu tiles, the transport controls and the status bar. */
function glyph(ctx: Ctx, name: string, x: number, y: number, s: number, color = W) {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(2.5, s * 0.1)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const u = s / 2
  ctx.beginPath()
  switch (name) {
    case 'projects': // a record
      ctx.arc(0, 0, u * 0.86, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, u * 0.3, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'about': // a person
      ctx.arc(0, -u * 0.34, u * 0.36, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(0, u * 0.72, u * 0.72, u * 0.5, 0, Math.PI, 0)
      ctx.fill()
      break
    case 'toolkit': // four tiles
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.beginPath()
        ctx.roundRect(dx * u * 0.44 - u * 0.33, dy * u * 0.44 - u * 0.33, u * 0.66, u * 0.66, u * 0.18)
        ctx.fill()
      }
      break
    case 'camera':
      ctx.roundRect(-u * 0.9, -u * 0.52, u * 1.8, u * 1.22, u * 0.26)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, u * 0.08, u * 0.33, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.roundRect(-u * 0.34, -u * 0.78, u * 0.68, u * 0.3, u * 0.1)
      ctx.fill()
      break
    case 'contact': // a speech bubble
      ctx.roundRect(-u * 0.86, -u * 0.7, u * 1.72, u * 1.16, u * 0.4)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-u * 0.36, u * 0.3)
      ctx.lineTo(-u * 0.6, u * 0.86)
      ctx.lineTo(u * 0.08, u * 0.4)
      ctx.closePath()
      ctx.fill()
      break
    case 'settings': // a gear
      for (let i = 0; i < 8; i++) {
        ctx.save()
        ctx.rotate((i * Math.PI) / 4)
        ctx.beginPath()
        ctx.roundRect(-u * 0.15, -u * 0.92, u * 0.3, u * 0.42, u * 0.07)
        ctx.fill()
        ctx.restore()
      }
      ctx.beginPath()
      ctx.lineWidth = u * 0.3
      ctx.arc(0, 0, u * 0.5, 0, Math.PI * 2)
      ctx.stroke()
      break
    case 'chevron':
      ctx.moveTo(-u * 0.22, -u * 0.48)
      ctx.lineTo(u * 0.26, 0)
      ctx.lineTo(-u * 0.22, u * 0.48)
      ctx.stroke()
      break
    case 'out': // opens elsewhere
      ctx.moveTo(-u * 0.4, u * 0.4)
      ctx.lineTo(u * 0.4, -u * 0.4)
      ctx.moveTo(-u * 0.1, -u * 0.42)
      ctx.lineTo(u * 0.42, -u * 0.42)
      ctx.lineTo(u * 0.42, u * 0.1)
      ctx.stroke()
      break
    case 'play':
      ctx.moveTo(-u * 0.34, -u * 0.56)
      ctx.lineTo(u * 0.58, 0)
      ctx.lineTo(-u * 0.34, u * 0.56)
      ctx.closePath()
      ctx.fill()
      break
    case 'pause':
      ctx.roundRect(-u * 0.44, -u * 0.56, u * 0.3, u * 1.12, u * 0.08)
      ctx.roundRect(u * 0.14, -u * 0.56, u * 0.3, u * 1.12, u * 0.08)
      ctx.fill()
      break
    case 'prev':
    case 'next': {
      const d = name === 'next' ? 1 : -1
      for (const o of [-u * 0.8, 0]) {
        ctx.beginPath()
        ctx.moveTo(d * o, -u * 0.5)
        ctx.lineTo(d * (o + u * 0.8), 0)
        ctx.lineTo(d * o, u * 0.5)
        ctx.closePath()
        ctx.fill()
      }
      break
    }
    case 'speaker':
      ctx.moveTo(-u * 0.75, -u * 0.26)
      ctx.lineTo(-u * 0.38, -u * 0.26)
      ctx.lineTo(u * 0.08, -u * 0.66)
      ctx.lineTo(u * 0.08, u * 0.66)
      ctx.lineTo(-u * 0.38, u * 0.26)
      ctx.lineTo(-u * 0.75, u * 0.26)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.arc(u * 0.16, 0, u * 0.5, -0.75, 0.75)
      ctx.stroke()
      break
    case 'earbuds':
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(sx * u * 0.42, -u * 0.3, u * 0.3, 0, Math.PI * 2)
        ctx.moveTo(sx * u * 0.42, 0)
        ctx.lineTo(sx * u * 0.42, u * 0.8)
        ctx.stroke()
      }
      break
    case 'unplugged':
      ctx.moveTo(0, -u * 0.8)
      ctx.lineTo(0, u * 0.8)
      ctx.moveTo(-u * 0.6, -u * 0.6)
      ctx.lineTo(u * 0.6, u * 0.6)
      ctx.stroke()
      break
  }
  ctx.restore()
}

/** App tiles for the main menu. */
const TILES: Record<string, [string, string]> = {
  projects: ['#ff8a4c', '#ff375f'],
  about: ['#7b61ff', '#c55cf6'],
  toolkit: ['#2dd4bf', '#0a84ff'],
  camera: ['#ffd60a', '#ff9f0a'],
  contact: ['#34c759', '#00b3a4'],
  settings: ['#a1a1aa', '#5c5c63'],
}

function tile(ctx: Ctx, id: string, x: number, y: number, s: number) {
  const [a, b] = TILES[id] ?? TILES.settings
  const g = ctx.createLinearGradient(x, y, x + s, y + s)
  g.addColorStop(0, a)
  g.addColorStop(1, b)
  ctx.beginPath()
  ctx.roundRect(x, y, s, s, s * 0.3)
  ctx.fillStyle = g
  ctx.fill()
  glyph(ctx, id, x + s / 2, y + s / 2, s * 0.52, W)
}

function art(ctx: Ctx, n: number, x: number, y: number, s: number, r: number, shadow = 0) {
  if (shadow) {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = shadow
    ctx.shadowOffsetY = shadow * 0.35
    ctx.beginPath()
    ctx.roundRect(x, y, s, s, r)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.restore()
  }
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, s, s, r)
  ctx.clip()
  ctx.drawImage(cover(n), x, y, s, s)
  ctx.restore()
}

/** A tiny copy of a cover; stretched over the whole screen it becomes a soft wash of its colours. */
const washes = new Map<number, HTMLCanvasElement>()
function wash(n: number) {
  let c = washes.get(n)
  if (!c) {
    const mid = document.createElement('canvas')
    mid.width = mid.height = 48
    mid.getContext('2d')!.drawImage(cover(n), 0, 0, 48, 48)
    c = document.createElement('canvas')
    c.width = c.height = 8
    const x = c.getContext('2d')!
    x.imageSmoothingQuality = 'high'
    x.drawImage(mid, 0, 0, 8, 8)
    washes.set(n, c)
  }
  return c
}

function mmss(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// --------------------------------------------------------------- renderer
type TextLine = { text: string; font: string; color: string; x: number; y: number }
type Chip = { text: string; x: number; y: number; w: number; tint: string }
type TextLayout = { lines: TextLine[]; height: number; chips?: Chip[] }
type Row = {
  label: string
  sub?: string
  lead?: number // width of what's drawn before the label
  drawLead?: (x: number, cy: number) => void
  drawTrail?: (right: number, cy: number, k: number) => void
}

const GROUP_TINTS = ['#ff8a4c', '#7b61ff', '#2dd4bf', '#ffd60a', '#34c759', '#ff375f']

export class PodOS {
  canvas = document.createElement('canvas')
  ctx: Ctx
  texture: THREE.CanvasTexture
  private ready = false
  private sig = ''
  private lastFrame: Frame | null = null
  private trans: { from: Frame; dir: number; start: number } | null = null
  private hl = { key: -1, y: 0 }
  private sc = { key: -1, y: 0 }
  private lastDraw = 0
  private textCache = new Map<string, TextLayout>()
  private playing: { index: number; since: number } | null = null
  accent = '#ff4a3d'
  roomA = '#b7c8e8'
  roomB = '#ecc9cf'

  constructor() {
    this.canvas.width = CW
    this.canvas.height = CH
    this.ctx = this.canvas.getContext('2d')!
    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.anisotropy = 8
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, CW, CH)
    fontsReady.then(() => {
      this.ready = true
      this.sig = ''
    })
  }

  /** Redraws when something changed or an animation is running. Returns true if it drew. */
  update(pod: Pod, now: number, accent: string): boolean {
    if (!this.ready) return false
    const top = pod.stack[pod.stack.length - 1]
    if (this.lastFrame && this.lastFrame.key !== top.key) this.trans = { from: this.lastFrame, dir: pod.dir, start: now }
    this.lastFrame = top
    if (this.trans && now - this.trans.start > 340) this.trans = null
    // the "track" clock for whatever is playing on the page
    if (pod.opened === null) this.playing = null
    else if (!this.playing || this.playing.index !== pod.opened) this.playing = { index: pod.opened, since: now }

    let moving = !!this.trans
    if (this.hl.key !== top.key) this.hl = { key: top.key, y: top.sel }
    else if (Math.abs(top.sel - this.hl.y) > 0.002) {
      this.hl.y += (top.sel - this.hl.y) * 0.28
      moving = true
    } else this.hl.y = top.sel
    if (this.sc.key !== top.key) this.sc = { key: top.key, y: top.scroll }
    else if (Math.abs(top.scroll - this.sc.y) > 0.5) {
      this.sc.y += (top.scroll - this.sc.y) * 0.28
      moving = true
    } else this.sc.y = top.scroll

    const v = top.view
    const on = pod.power === 'on'
    const toastOn = !!pod.toast && now - pod.toast.at < 2700
    const volOn = now - pod.volumeShownAt < 1400
    const booting = pod.power === 'booting'
    const camera = on && v.kind === 'camera'
    const flash = now - cam.flashAt < 400
    // the mini player's equaliser and the progress bar of what's playing move on their own
    const ticking = on && ((v.kind === 'menu' && v.id === 'main' && pod.lastPlayed !== null) || (v.kind === 'project' && pod.opened !== null))
    const sig = [
      pod.power,
      top.key,
      top.sel,
      top.scroll,
      pod.opened,
      pod.lastPlayed,
      pod.volume,
      pod.settings.body,
      pod.settings.clicks,
      pod.plugged,
      pod.toast?.at,
      new Date().getMinutes(),
      accent,
      !!this.trans,
      toastOn,
      volOn,
      booting,
      moving,
      cam.state,
      flash,
    ].join('|')

    const continuous = moving || toastOn || volOn || booting || flash
    if (!continuous && sig === this.sig) {
      // the camera runs at a film-ish 20 fps; the equaliser and progress bar at 10
      const every = camera ? 50 : ticking ? 100 : Infinity
      if (now - this.lastDraw < every) return false
    }
    this.sig = sig
    this.accent = accent
    this.lastDraw = now
    this.draw(pod, now, top)
    this.texture.needsUpdate = true
    return true
  }

  // ---------------------------------------------------------------- draw
  private draw(pod: Pod, now: number, top: Frame) {
    const ctx = this.ctx
    ctx.save()
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, CW, CH)
    if (pod.power === 'off') {
      ctx.restore()
      return
    }
    if (pod.power === 'booting') {
      this.drawBoot(pod, now)
      ctx.restore()
      return
    }
    if (this.trans) {
      const e = easeOut((now - this.trans.start) / 320)
      const d = this.trans.dir
      this.drawView(pod, this.trans.from, -d * e * CW * 0.16, 1 - e, now, false)
      this.drawView(pod, top, d * (1 - e) * CW * 0.16, e, now, true)
    } else this.drawView(pod, top, 0, 1, now, true)
    this.drawStatus(pod, top)
    if (pod.toast && now - pod.toast.at < 2700) this.drawToast(pod, now)
    ctx.restore()
  }

  private drawView(pod: Pod, f: Frame, dx: number, alpha: number, now: number, isTop: boolean) {
    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha = alpha
    // backgrounds don't slide, they cross-fade; the content slides over them
    const v = f.view
    const sel = isTop ? this.hl.y : f.sel
    if (v.kind === 'menu' && v.id === 'projects') this.bgCover(sel)
    else if (v.kind === 'project') this.bgCover(v.index)
    else if (v.kind === 'camera') {
      ctx.fillStyle = '#050506'
      ctx.fillRect(0, 0, CW, CH)
    } else this.bgHome(v.kind === 'menu' && v.id === 'main' ? 1 : 0.6)
    ctx.translate(dx, 0)
    if (v.kind === 'menu') {
      if (v.id === 'main') this.drawHome(pod, f, now, isTop)
      else if (v.id === 'projects') this.drawProjects(f, isTop)
      else this.drawList(pod, f, v.id, isTop)
    } else if (v.kind === 'project') this.drawNowPlaying(pod, v.index, now)
    else if (v.kind === 'camera') this.drawCamera(now)
    else this.drawText(pod, f, v.kind, isTop)
    ctx.restore()
  }

  // ----------------------------------------------------------- backgrounds
  /** Deep ink with two soft glows in the colours of the room the pod stands in. */
  private bgHome(strength: number) {
    const ctx = this.ctx
    const base = ctx.globalAlpha
    ctx.fillStyle = INK
    ctx.fillRect(0, 0, CW, CH)
    const glow = (x: number, y: number, r: number, color: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, rgba(color, a * strength))
      g.addColorStop(1, rgba(color, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, CW, CH)
    }
    glow(CW * 0.0, CH * 0.0, CW * 1.1, this.roomA, 0.42)
    glow(CW * 1.05, CH * 1.0, CW * 1.0, this.roomB, 0.3)
    glow(CW * 0.95, CH * 0.12, CW * 0.45, this.accent, 0.1)
    ctx.globalAlpha = base
  }

  /** The cover in focus, blurred into a wash of colour; fractional `at` blends two neighbours. */
  private bgCover(at: number) {
    const ctx = this.ctx
    const base = ctx.globalAlpha
    const n = projects.length
    const a = Math.max(0, Math.min(n - 1, Math.floor(at)))
    const b = Math.min(n - 1, a + 1)
    const t = clamp01(at - a)
    ctx.fillStyle = INK
    ctx.fillRect(0, 0, CW, CH)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const draw = (i: number, k: number) => {
      ctx.globalAlpha = base * k
      ctx.drawImage(wash(i), -CW * 0.25, -CH * 0.25, CW * 1.5, CH * 1.5)
    }
    draw(a, 1)
    if (t > 0.001 && b !== a) draw(b, t)
    ctx.globalAlpha = base
    // keep the type readable: darken, more towards the bottom
    ctx.fillStyle = 'rgba(8,9,12,0.4)'
    ctx.fillRect(0, 0, CW, CH)
    const g = ctx.createLinearGradient(0, CH * 0.4, 0, CH)
    g.addColorStop(0, 'rgba(8,9,12,0)')
    g.addColorStop(1, 'rgba(8,9,12,0.62)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CW, CH)
  }

  // ------------------------------------------------------------ chrome
  private drawStatus(pod: Pod, top: Frame) {
    const ctx = this.ctx
    const y = LENS.y
    const g = ctx.createLinearGradient(0, 0, 0, y * 2.1)
    g.addColorStop(0, 'rgba(0,0,0,0.5)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CW, y * 2.1)
    const d = new Date()
    ctx.fillStyle = W
    ctx.font = `600 27px ${UI}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`, PAD + 6, y)
    // battery
    const bx = CW - PAD - 56
    ctx.strokeStyle = G1
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.roundRect(bx, y - 12, 46, 24, 7)
    ctx.stroke()
    ctx.fillStyle = W
    ctx.beginPath()
    ctx.roundRect(bx + 4, y - 8, 30, 16, 4)
    ctx.fill()
    ctx.fillStyle = G1
    ctx.fillRect(bx + 48, y - 5, 4, 10)
    if (pod.plugged) glyph(ctx, 'earbuds', bx - 36, y, 30, W)
    // the camera's in-use light
    if (top.view.kind === 'camera' && cam.state === 'live') {
      ctx.fillStyle = GREEN
      ctx.beginPath()
      ctx.arc(LENS.x + LENS.r + 20, y, 7, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private title(text: string, y = 172, badge?: string) {
    const ctx = this.ctx
    ctx.fillStyle = W
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.font = `750 66px ${DISPLAY}`
    ctx.fillText(text, PAD - 2, y)
    if (badge) {
      const w = ctx.measureText(text).width
      ctx.font = `650 24px ${UI}`
      const bw = ctx.measureText(badge).width + 30
      pill(this.ctx, PAD + w + 16, y - 40, bw, 38, 19, G3)
      ctx.fillStyle = W
      ctx.textAlign = 'center'
      ctx.fillText(badge, PAD + w + 16 + bw / 2, y - 12)
      ctx.textAlign = 'left'
    }
  }

  /** A list on a frosted highlight that glides to the selected row. */
  private rows(rows: Row[], f: Frame, top: number, h: number, isTop: boolean) {
    const ctx = this.ctx
    const base = ctx.globalAlpha
    const sel = isTop ? this.hl.y : f.sel
    // the highlight
    const hy = top + sel * h
    pill(ctx, 26, hy + 6, CW - 52, h - 12, Math.min(30, (h - 12) / 2.4), 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.1)')
    rows.forEach((r, i) => {
      const cy = top + i * h + h / 2
      const k = clamp01(1 - Math.abs(i - sel))
      ctx.globalAlpha = base * (0.72 + 0.28 * k)
      let x = PAD
      if (r.drawLead) {
        r.drawLead(x, cy)
        x += (r.lead ?? 0) + 24
      }
      ctx.fillStyle = W
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.font = `${k > 0.5 ? 650 : 560} ${r.sub ? 34 : 35}px ${UI}`
      ctx.fillText(r.label, x, r.sub ? cy - 17 : cy + 1)
      if (r.sub) {
        ctx.fillStyle = G1
        ctx.font = `500 23px ${UI}`
        ctx.fillText(r.sub, x, cy + 22)
      }
      if (r.drawTrail) r.drawTrail(CW - PAD, cy, k)
    })
    ctx.globalAlpha = base
  }

  // ------------------------------------------------------------------ home
  private drawHome(pod: Pod, f: Frame, now: number, isTop: boolean) {
    const ctx = this.ctx
    const hour = new Date().getHours()
    const hello = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.fillStyle = G1
    ctx.font = `500 27px ${UI}`
    ctx.fillText(hello, PAD, 150)
    ctx.fillStyle = W
    ctx.font = `800 76px ${DISPLAY}`
    ctx.fillText(profile.name, PAD - 3, 228)

    const mini = pod.lastPlayed !== null
    const items = pod.items('main')
    this.rows(
      items.map((it) => ({
        label: it.label,
        lead: 56,
        drawLead: (x, cy) => tile(ctx, it.id, x, cy - 28, 56),
        drawTrail: (right, cy) => glyph(ctx, 'chevron', right - 10, cy, 28, G2),
      })),
      f,
      264,
      mini ? 80 : 88,
      isTop,
    )
    if (mini) this.miniPlayer(pod, now)
  }

  private miniPlayer(pod: Pod, now: number) {
    const ctx = this.ctx
    const n = pod.lastPlayed!
    const y = CH - 132
    pill(ctx, 26, y, CW - 52, 104, 32, 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.08)')
    art(ctx, n, 42, y + 14, 76, 18)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = G1
    ctx.font = `500 21px ${UI}`
    ctx.fillText(pod.opened === n ? 'Playing' : 'Last played', 138, y + 44)
    ctx.fillStyle = W
    ctx.font = `650 30px ${UI}`
    ctx.fillText(projects[n].title, 138, y + 80)
    // a little equaliser in the room's accent
    ctx.fillStyle = this.accent
    for (let i = 0; i < 4; i++) {
      const h = 14 + 30 * Math.abs(Math.sin(now / (260 + i * 70) + i * 1.7))
      ctx.beginPath()
      ctx.roundRect(CW - 128 + i * 18, y + 52 + 22 - h / 2, 10, h, 5)
      ctx.fill()
    }
  }

  // ------------------------------------------------------------- projects
  private drawProjects(f: Frame, isTop: boolean) {
    const ctx = this.ctx
    this.title('Projects', 172, String(projects.length))
    this.rows(
      projects.map((p, i) => ({
        label: p.title,
        sub: p.kind,
        lead: 112,
        drawLead: (x, cy) => art(ctx, i, x, cy - 56, 112, 24, 18),
        drawTrail: (right, cy) => {
          const live = !!p.live
          ctx.font = `650 21px ${UI}`
          const text = live ? 'Live' : 'Code'
          const w = ctx.measureText(text).width + (live ? 50 : 30)
          pill(ctx, right - w, cy - 19, w, 38, 19, live ? 'rgba(48,209,88,0.2)' : G3)
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'left'
          if (live) {
            ctx.fillStyle = GREEN
            ctx.beginPath()
            ctx.arc(right - w + 20, cy, 6, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.fillStyle = live ? GREEN : G1
          ctx.fillText(text, right - w + (live ? 34 : 15), cy + 1)
        },
      })),
      f,
      206,
      Math.min(176, (CH - 206 - 34) / projects.length),
      isTop,
    )
  }

  private drawList(pod: Pod, f: Frame, id: MenuId, isTop: boolean) {
    const ctx = this.ctx
    this.title(id === 'contact' ? 'Contact' : 'Settings')
    const items: MenuItem[] = pod.items(id)
    this.rows(
      items.map((it) => ({
        label: it.label,
        drawTrail: (right, cy, k) => {
          if (it.id === 'clicks') {
            const on = pod.settings.clicks
            pill(ctx, right - 80, cy - 24, 80, 48, 24, on ? GREEN : 'rgba(255,255,255,0.22)')
            ctx.fillStyle = W
            ctx.beginPath()
            ctx.arc(on ? right - 24 : right - 56, cy, 19, 0, Math.PI * 2)
            ctx.fill()
            return
          }
          if (it.id === 'finish') {
            BODIES.forEach((b, j) => {
              const x = right - 18 - (BODIES.length - 1 - j) * 50
              const sw = FINISHES[b].swatch
              const gg = ctx.createLinearGradient(x - 16, cy - 16, x + 16, cy + 16)
              gg.addColorStop(0, sw[0])
              gg.addColorStop(1, sw[2])
              ctx.fillStyle = gg
              ctx.beginPath()
              ctx.arc(x, cy, 16, 0, Math.PI * 2)
              ctx.fill()
              if (b === pod.settings.body) {
                ctx.strokeStyle = W
                ctx.lineWidth = 3
                ctx.beginPath()
                ctx.arc(x, cy, 23, 0, Math.PI * 2)
                ctx.stroke()
              }
            })
            return
          }
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = G1
          ctx.font = `500 29px ${UI}`
          const out = id === 'contact' && it.id !== 'plain'
          if (it.value) ctx.fillText(it.value, right - (out || it.arrow ? 44 : 0), cy + 1)
          ctx.textAlign = 'left'
          if (out) glyph(ctx, 'out', right - 12, cy, 26, k > 0.5 ? W : G2)
          else if (it.arrow) glyph(ctx, 'chevron', right - 10, cy, 28, G2)
        },
      })),
      f,
      206,
      96,
      isTop,
    )
  }

  // ---------------------------------------------------------- now playing
  private drawNowPlaying(pod: Pod, index: number, now: number) {
    const ctx = this.ctx
    const p = projects[index]
    const n = projects.length
    const playing = pod.opened === index
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'center'
    ctx.fillStyle = G1
    ctx.font = `600 22px ${UI}`
    ctx.fillText(`Project ${index + 1} of ${n}`, CW / 2, 122)

    const s = 500
    art(ctx, index, (CW - s) / 2, 146, s, 34, 60)

    ctx.textAlign = 'left'
    ctx.fillStyle = W
    ctx.font = `750 56px ${DISPLAY}`
    ctx.fillText(p.title, PAD, 732)
    ctx.fillStyle = G1
    ctx.font = `500 26px ${UI}`
    ctx.fillText(p.kind, PAD, 774)

    const y = 826
    if (now - pod.volumeShownAt < 1400) {
      // volume replaces the progress bar for a moment
      glyph(ctx, 'speaker', PAD + 14, y, 30, G1)
      const x0 = PAD + 50
      const x1 = CW - PAD
      pill(ctx, x0, y - 4, x1 - x0, 8, 4, G3)
      pill(ctx, x0, y - 4, Math.max(8, (x1 - x0) * pod.volume), 8, 4, W)
    } else {
      // a pretend track: it runs while the project is open on the page
      const length = 150 + index * 22
      const t = playing && this.playing ? ((now - this.playing.since) / 1000) % length : 0
      const x0 = PAD
      const x1 = CW - PAD
      const px = x0 + (x1 - x0) * (t / length)
      pill(ctx, x0, y - 4, x1 - x0, 8, 4, G3)
      pill(ctx, x0, y - 4, Math.max(8, px - x0), 8, 4, W)
      ctx.fillStyle = W
      ctx.beginPath()
      ctx.arc(px, y, 11, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = G2
      ctx.font = `600 20px ${UI}`
      ctx.fillText(mmss(t), x0, y + 42)
      ctx.textAlign = 'right'
      ctx.fillText(`-${mmss(length - t)}`, x1, y + 42)
      ctx.textAlign = 'left'
    }

    const cy = 922
    glyph(ctx, 'prev', CW / 2 - 176, cy, 44, W)
    glyph(ctx, 'next', CW / 2 + 176, cy, 44, W)
    ctx.fillStyle = W
    ctx.beginPath()
    ctx.arc(CW / 2, cy, 50, 0, Math.PI * 2)
    ctx.fill()
    glyph(ctx, playing ? 'pause' : 'play', CW / 2 + (playing ? 0 : 4), cy, 42, INK)
  }

  // ------------------------------------------------------------ text pages
  private drawText(pod: Pod, f: Frame, kind: 'about' | 'toolkit', isTop: boolean) {
    const ctx = this.ctx
    const L = this.layoutText(kind)
    const top = kind === 'about' ? 330 : 214
    const viewH = CH - top - 34
    const max = Math.max(0, L.height - viewH)
    if (isTop) pod.scrollMax.current = max
    const scroll = Math.min(isTop ? this.sc.y : f.scroll, max)

    if (kind === 'about') {
      // an avatar in the room's colours, then the name
      const cx = PAD + 78
      const cy = 206
      const g = ctx.createLinearGradient(cx - 78, cy - 78, cx + 78, cy + 78)
      g.addColorStop(0, this.accent)
      g.addColorStop(1, this.roomA)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, cy, 78, 0, Math.PI * 2)
      ctx.fill()
      const initials = (profile.name.match(/[A-Z]/g) ?? ['K']).join('').slice(0, 2)
      ctx.fillStyle = W
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `800 66px ${DISPLAY}`
      ctx.fillText(initials, cx, cy + 4)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.font = `750 54px ${DISPLAY}`
      ctx.fillText(profile.name, cx + 104, cy - 6)
      ctx.fillStyle = G1
      ctx.font = `500 26px ${UI}`
      ctx.fillText(profile.role, cx + 106, cy + 38)
    } else this.title('Toolkit')

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, top - 12, CW, CH - top + 12)
    ctx.clip()
    ctx.translate(0, top - scroll)
    for (const l of L.lines) {
      ctx.font = l.font
      ctx.fillStyle = l.color
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      ctx.fillText(l.text, l.x, l.y)
    }
    if (L.chips) {
      ctx.font = `550 27px ${UI}`
      ctx.textBaseline = 'middle'
      for (const c of L.chips) {
        pill(ctx, c.x, c.y, c.w, 54, 27, rgba(c.tint, 0.18))
        ctx.fillStyle = W
        ctx.fillText(c.text, c.x + 24, c.y + 28)
      }
    }
    ctx.restore()

    if (max > 0) {
      // a slim scroll bar
      const x = CW - 26
      const trackH = viewH - 20
      const thumb = Math.max(60, (trackH * viewH) / (viewH + max))
      pill(ctx, x, top, 6, trackH, 3, G3)
      pill(ctx, x, top + (trackH - thumb) * (scroll / max), 6, thumb, 3, W)
    }
  }

  private layoutText(kind: 'about' | 'toolkit'): TextLayout {
    const hit = this.textCache.get(kind)
    if (hit) return hit
    const ctx = this.ctx
    const lines: TextLine[] = []
    let y = 0
    const maxW = CW - PAD * 2 - 24
    if (kind === 'about') {
      const font = `400 30px ${UI}`
      ctx.font = font
      for (const para of profile.about) {
        for (const t of wrap(ctx, para, maxW)) {
          lines.push({ text: t, font, color: 'rgba(255,255,255,0.8)', x: PAD, y })
          y += 46
        }
        y += 26
      }
      const res = { lines, height: y + 20 }
      this.textCache.set(kind, res)
      return res
    }
    const chips: Chip[] = []
    toolkit.forEach((g, gi) => {
      const tint = GROUP_TINTS[gi % GROUP_TINTS.length]
      lines.push({ text: g.group, font: `650 24px ${UI}`, color: G1, x: PAD, y })
      y += 44
      ctx.font = `550 27px ${UI}`
      let x = PAD
      for (const item of g.items) {
        const w = ctx.measureText(item).width + 48
        if (x + w > CW - PAD) {
          x = PAD
          y += 66
        }
        chips.push({ text: item, x, y, w, tint })
        x += w + 12
      }
      y += 96
    })
    const res = { lines, height: y, chips }
    this.textCache.set(kind, res)
    return res
  }

  // ---------------------------------------------------------------- camera
  private drawCamera(now: number) {
    const ctx = this.ctx
    cam.frame(now, this.roomA, this.roomB)
    const h = CH - 272
    const w = Math.round(h * cam.aspect)
    const x = Math.round((CW - w) / 2)
    const y = 112
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 34)
    ctx.clip()
    ctx.imageSmoothingEnabled = false
    if (cam.low) ctx.drawImage(cam.low.c, x, y, w, h)
    ctx.imageSmoothingEnabled = true
    const f = FILTERS[cam.filter]
    // the digicam date stamp
    if (f !== 'Mono') {
      const d = new Date()
      ctx.fillStyle = f === 'Night' ? '#8dff8a' : '#ff9d2e'
      ctx.font = `700 30px ${MONO}`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`'${YEAR} ${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}`, x + w - 22, y + h - 22)
      ctx.textAlign = 'left'
    }
    const fl = 1 - (now - cam.flashAt) / 380
    if (fl > 0) {
      ctx.fillStyle = `rgba(255,255,255,${fl})`
      ctx.fillRect(x, y, w, h)
    }
    ctx.restore()

    if (cam.photos[0]) {
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(PAD - 6, CH - 132, 64, 100, 14)
      ctx.clip()
      ctx.drawImage(cam.photos[0], PAD - 6, CH - 132, 64, 100)
      ctx.restore()
    }
    // the filter picker
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `650 26px ${UI}`
    const gap = 16
    const widths = FILTERS.map((name) => ctx.measureText(name).width + 40)
    let fx = CW / 2 - (widths.reduce((a, b) => a + b, 0) + gap * (FILTERS.length - 1)) / 2
    FILTERS.forEach((name, i) => {
      const on = i === cam.filter
      pill(ctx, fx, CH - 136, widths[i], 50, 25, on ? W : 'rgba(255,255,255,0.12)')
      ctx.fillStyle = on ? INK : G1
      ctx.fillText(name, fx + widths[i] / 2, CH - 102)
      fx += widths[i] + gap
    })
    ctx.fillStyle = G2
    ctx.font = `600 19px ${UI}`
    const note =
      cam.state === 'blocked'
        ? 'Camera blocked · showing a test feed'
        : cam.state === 'none'
          ? 'No camera found · showing a test feed'
          : cam.state === 'starting'
            ? 'Starting…'
            : 'Centre button to shoot · scroll for filters'
    ctx.fillText(note, CW / 2, CH - 44)
    ctx.textAlign = 'left'
  }

  // ------------------------------------------------------------- overlays
  private drawToast(pod: Pod, now: number) {
    const ctx = this.ctx
    const t = now - pod.toast!.at
    const inE = easeOut(t / 260)
    const outE = clamp01((t - 2300) / 380)
    const text = pod.toast!.text
    ctx.save()
    ctx.globalAlpha = inE * (1 - outE)
    ctx.font = `600 28px ${UI}`
    const w = ctx.measureText(text).width + 116
    const x = (CW - w) / 2
    const y = LENS.y + LENS.r + 18 - (1 - inE) * 30
    pill(ctx, x, y, w, 76, 38, 'rgba(30,31,36,0.96)', 'rgba(255,255,255,0.1)')
    const plugged = pod.toast!.icon === 'earbuds'
    glyph(ctx, plugged ? 'earbuds' : 'unplugged', x + 46, y + 38, 30, plugged ? W : '#ff6961')
    ctx.fillStyle = W
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(text, x + 82, y + 39)
    ctx.restore()
  }

  private drawBoot(pod: Pod, now: number) {
    const ctx = this.ctx
    const t = now - pod.bootAt
    const k = clamp01((t - 200) / (BOOT_MS - 400))
    ctx.save()
    ctx.globalAlpha = easeOut(t / 600)
    this.bgHome(0.35 + 0.65 * k)
    ctx.fillStyle = W
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `800 140px ${DISPLAY}`
    const word = profile.short
    ctx.fillText(word, CW / 2 - 12, CH * 0.5)
    ctx.fillStyle = this.accent
    ctx.beginPath()
    ctx.arc(CW / 2 + ctx.measureText(word).width / 2 + 6, CH * 0.5 - 12, 13, 0, Math.PI * 2)
    ctx.fill()
    pill(ctx, CW / 2 - 140, CH * 0.5 + 62, 280, 8, 4, G3)
    pill(ctx, CW / 2 - 140, CH * 0.5 + 62, Math.max(8, 280 * k), 8, 4, W)
    ctx.fillStyle = G2
    ctx.font = `600 21px ${UI}`
    ctx.fillText(`Portfolio ’${YEAR}`, CW / 2, CH * 0.5 + 124)
    ctx.restore()
  }
}

// ---------------------------------------------------------------- material
/** The lit display: the OS texture with rounded corners and a hole for the camera. */
export function screenMaterial(map: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uPower: { value: 0 },
      uAspect: { value: POD.active.w / POD.active.h },
      uRadius: { value: POD.active.r / POD.active.h },
      uLens: { value: new THREE.Vector3(0.5, 1 - LENS.y / CH, (LENS.r + 6) / CH) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float uPower;
      uniform float uAspect;
      uniform float uRadius;
      uniform vec3 uLens;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        vec2 b = vec2(uAspect, 1.0) * 0.5 - uRadius;
        vec2 q = abs(p) - b;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
        float mask = 1.0 - smoothstep(-0.0015, 0.0015, d);
        // the punch-hole for the camera
        vec2 lp = (vUv - uLens.xy) * vec2(uAspect, 1.0);
        mask *= smoothstep(uLens.z - 0.002, uLens.z + 0.002, length(lp));
        vec3 col = texture2D(map, vUv).rgb * uPower;
        gl_FragColor = vec4(col * mask, 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
}
