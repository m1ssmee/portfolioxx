// The pod's operating system, drawn into a canvas that becomes the screen texture.
// Monochrome: black, white and greys, dot-matrix type for the big things, a red dot for what's selected.
import * as THREE from 'three'
import { cam, FILTERS } from '../camera'
import { profile, projects, toolkit, YEAR } from '../content'
import { BODIES, BOOT_MS, type Frame, type MenuId, type MenuItem, type Pod } from '../usePod'
import { cover } from './art'
import { fontsReady, UI } from './fonts'
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

const DOT = '"Doto Variable", "JetBrains Mono Variable", monospace'
const MONO = '"JetBrains Mono Variable", ui-monospace, monospace'
const W = '#ffffff'
const G1 = 'rgba(255,255,255,0.62)'
const G2 = 'rgba(255,255,255,0.36)'
const G3 = 'rgba(255,255,255,0.13)'
const RED = '#ff3b30'
const PAD = 58

const easeOut = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3)
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
type Ctx = CanvasRenderingContext2D

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

function dot(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** Thin line icons. */
function icon(ctx: Ctx, name: string, x: number, y: number, s: number, color = W) {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(2, s * 0.08)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const u = s / 2
  ctx.beginPath()
  if (name === 'earbuds') {
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(sx * u * 0.42, -u * 0.3, u * 0.3, 0, Math.PI * 2)
      ctx.moveTo(sx * u * 0.42, 0)
      ctx.lineTo(sx * u * 0.42, u * 0.8)
      ctx.stroke()
    }
  } else if (name === 'unplugged') {
    ctx.moveTo(0, -u * 0.8)
    ctx.lineTo(0, u * 0.8)
    ctx.moveTo(-u * 0.6, -u * 0.6)
    ctx.lineTo(u * 0.6, u * 0.6)
    ctx.stroke()
  } else if (name === 'prev' || name === 'next') {
    const d = name === 'next' ? 1 : -1
    for (const o of [0, u * 0.7]) {
      ctx.beginPath()
      ctx.moveTo(d * (o - u * 0.7), -u * 0.5)
      ctx.lineTo(d * o, 0)
      ctx.lineTo(d * (o - u * 0.7), u * 0.5)
      ctx.stroke()
    }
  } else if (name === 'play') {
    ctx.moveTo(-u * 0.3, -u * 0.5)
    ctx.lineTo(u * 0.5, 0)
    ctx.lineTo(-u * 0.3, u * 0.5)
    ctx.closePath()
    ctx.fill()
  } else if (name === 'pause') {
    ctx.fillRect(-u * 0.35, -u * 0.5, u * 0.22, u)
    ctx.fillRect(u * 0.13, -u * 0.5, u * 0.22, u)
  } else if (name === 'arrow') {
    ctx.moveTo(-u * 0.5, 0)
    ctx.lineTo(u * 0.5, 0)
    ctx.moveTo(u * 0.1, -u * 0.4)
    ctx.lineTo(u * 0.5, 0)
    ctx.lineTo(u * 0.1, u * 0.4)
    ctx.stroke()
  } else if (name === 'out') {
    ctx.moveTo(-u * 0.4, u * 0.4)
    ctx.lineTo(u * 0.4, -u * 0.4)
    ctx.moveTo(-u * 0.1, -u * 0.4)
    ctx.lineTo(u * 0.4, -u * 0.4)
    ctx.lineTo(u * 0.4, u * 0.1)
    ctx.stroke()
  }
  ctx.restore()
}

function art(ctx: Ctx, n: number, x: number, y: number, s: number, r: number) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, s, s, r)
  ctx.clip()
  ctx.drawImage(cover(n), x, y, s, s)
  ctx.restore()
}

/** A row of dots: `on` of them lit, the last lit one red. */
function dotRow(ctx: Ctx, x0: number, x1: number, y: number, count: number, on: number, r = 6) {
  for (let i = 0; i < count; i++) {
    const x = x0 + ((x1 - x0) * i) / (count - 1)
    dot(ctx, x, y, r, i < on - 1 ? W : i === on - 1 ? RED : G3)
  }
}

// --------------------------------------------------------------- renderer
type TextLine = { text: string; font: string; color: string; x: number; y: number }
type Chip = { text: string; x: number; y: number; w: number }
type TextLayout = { lines: TextLine[]; height: number; chips?: Chip[] }

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
  accent = RED
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
    const ticking = on && ((v.kind === 'menu' && v.id === 'main') || (v.kind === 'project' && pod.opened !== null))
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
      // the camera runs at a film-ish 20 fps; the blinking clock and the equaliser at 10
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
      this.drawView(pod, this.trans.from, -d * e * CW * 0.18, 1 - e, now, false)
      this.drawView(pod, top, d * (1 - e) * CW * 0.18, e, now, true)
    } else this.drawView(pod, top, 0, 1, now, true)
    this.drawStatus(pod, top)
    if (pod.toast && now - pod.toast.at < 2700) this.drawToast(pod, now)
    ctx.restore()
  }

  private drawView(pod: Pod, f: Frame, dx: number, alpha: number, now: number, isTop: boolean) {
    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(dx, 0)
    const v = f.view
    if (v.kind === 'menu') {
      if (v.id === 'main') this.drawHome(pod, f, now, isTop)
      else if (v.id === 'projects') this.drawProjects(f, isTop)
      else this.drawList(pod, f, v.id, isTop)
    } else if (v.kind === 'project') this.drawNowPlaying(pod, v.index, now)
    else if (v.kind === 'camera') this.drawCamera(now)
    else this.drawText(pod, f, v.kind, isTop)
    ctx.restore()
  }

  private drawStatus(pod: Pod, top: Frame) {
    const ctx = this.ctx
    const y = LENS.y
    const g = ctx.createLinearGradient(0, 0, 0, y * 2.2)
    g.addColorStop(0, 'rgba(0,0,0,0.95)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CW, y * 2.2)
    const d = new Date()
    ctx.fillStyle = W
    ctx.font = `600 27px ${UI}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`, PAD, y)
    // battery: four little bars
    const bx = CW - PAD - 52
    ctx.strokeStyle = G1
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.roundRect(bx, y - 12, 48, 24, 7)
    ctx.stroke()
    ctx.fillStyle = W
    for (let i = 0; i < 4; i++) ctx.fillRect(bx + 6 + i * 9.5, y - 7, 6, 14)
    if (pod.plugged) icon(ctx, 'earbuds', bx - 38, y, 30, G1)
    // the camera's in-use light
    if (top.view.kind === 'camera' && cam.state === 'live') dot(ctx, LENS.x + LENS.r + 20, y, 7, '#34c759')
  }

  private heading(text: string, y = 178, right?: string) {
    const ctx = this.ctx
    ctx.fillStyle = W
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.font = `800 74px ${DOT}`
    ctx.fillText(text, PAD - 4, y)
    if (right) {
      ctx.fillStyle = G2
      ctx.textAlign = 'right'
      ctx.font = `800 40px ${DOT}`
      ctx.fillText(right, CW - PAD, y - 4)
      ctx.textAlign = 'left'
    }
  }

  // ------------------------------------------------------------------ home
  private drawHome(pod: Pod, f: Frame, now: number, isTop: boolean) {
    const ctx = this.ctx
    const base = ctx.globalAlpha
    const d = new Date()
    // the clock, in dots; the colon blinks
    ctx.fillStyle = W
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.font = `800 176px ${DOT}`
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const hw = ctx.measureText(hh).width
    const cw = ctx.measureText(':').width
    ctx.fillText(hh, PAD - 10, 286)
    ctx.globalAlpha = base * (Math.floor(now / 1000) % 2 === 0 ? 1 : 0.25)
    ctx.fillText(':', PAD - 10 + hw, 286)
    ctx.globalAlpha = base
    ctx.fillText(mm, PAD - 10 + hw + cw, 286)
    ctx.fillStyle = G1
    ctx.font = `600 23px ${MONO}`
    const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()
    ctx.fillText(day.replace(',', ''), PAD, 334)
    ctx.textAlign = 'right'
    const name = profile.name.toUpperCase()
    ctx.fillText(name, CW - PAD, 334)
    dot(ctx, CW - PAD - ctx.measureText(name).width - 18, 326, 6, RED)
    ctx.textAlign = 'left'

    const mini = pod.lastPlayed !== null
    this.list(pod.items('main'), f, 384, mini ? 76 : 86, 44, isTop)
    if (mini) this.miniPlayer(pod, now)
  }

  /** A plain vertical list: the selected row is white with a red dot, the rest grey. */
  private list(
    items: MenuItem[],
    f: Frame,
    top: number,
    row: number,
    size: number,
    isTop: boolean,
    extra?: (it: MenuItem, y: number, k: number) => void,
  ) {
    const ctx = this.ctx
    const base = ctx.globalAlpha
    const sel = isTop ? this.hl.y : f.sel
    items.forEach((it, i) => {
      const y = top + i * row + row / 2
      const k = clamp01(1 - Math.abs(i - sel))
      ctx.globalAlpha = base * (0.38 + 0.62 * k)
      ctx.fillStyle = W
      ctx.font = `${k > 0.5 ? 600 : 500} ${size}px ${UI}`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.fillText(it.label, PAD + 34 * k, y)
      if (extra) extra(it, y, k)
      else if (it.arrow && k > 0.5) icon(ctx, 'arrow', CW - PAD - 16, y, 30, W)
      if (k > 0.02) {
        ctx.globalAlpha = base * k
        dot(ctx, PAD + 6, y, 8, RED)
      }
    })
    ctx.globalAlpha = base
  }

  private miniPlayer(pod: Pod, now: number) {
    const ctx = this.ctx
    const n = pod.lastPlayed!
    const y = CH - 126
    ctx.fillStyle = '#111214'
    ctx.beginPath()
    ctx.roundRect(28, y, CW - 56, 104, 36)
    ctx.fill()
    art(ctx, n, 44, y + 14, 76, 18)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = G2
    ctx.font = `600 19px ${MONO}`
    ctx.fillText('NOW PLAYING', 142, y + 44)
    ctx.fillStyle = W
    ctx.font = `600 30px ${UI}`
    ctx.fillText(projects[n].title, 142, y + 80)
    // a little dot equaliser
    for (let i = 0; i < 5; i++) {
      const h = 1 + Math.round(3.5 * Math.abs(Math.sin(now / (300 + i * 60) + i)))
      for (let j = 0; j < 5; j++)
        dot(ctx, CW - 150 + i * 18, y + 76 - j * 14, 4.5, j < h ? (i === 2 && j === h - 1 ? RED : W) : G3)
    }
  }

  // ------------------------------------------------------------- projects
  private drawProjects(f: Frame, isTop: boolean) {
    const ctx = this.ctx
    const base = ctx.globalAlpha
    this.heading('PROJECTS', 178, String(projects.length).padStart(2, '0'))
    const sel = isTop ? this.hl.y : f.sel
    const top = 214
    const row = (CH - top - 30) / projects.length
    projects.forEach((p, i) => {
      const cy = top + i * row + row / 2
      const k = clamp01(1 - Math.abs(i - sel))
      ctx.globalAlpha = base * (0.38 + 0.62 * k)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = W
      ctx.font = `800 40px ${DOT}`
      ctx.fillText(String(i + 1).padStart(2, '0'), PAD, cy + 12)
      ctx.font = `${k > 0.5 ? 650 : 520} 42px ${UI}`
      ctx.fillText(p.title, PAD + 92, cy - 2)
      ctx.fillStyle = G1
      ctx.font = `500 21px ${MONO}`
      const kind = p.kind.toUpperCase()
      ctx.fillText(kind, PAD + 94, cy + 32)
      if (p.live) {
        const lx = PAD + 94 + ctx.measureText(kind).width + 22
        dot(ctx, lx, cy + 25, 5, RED)
        ctx.fillStyle = RED
        ctx.fillText('LIVE', lx + 12, cy + 32)
      }
      if (k > 0.01) {
        ctx.globalAlpha = base * k
        const s = 104
        art(ctx, i, CW - PAD - s, cy - s / 2, s, 22)
      }
    })
    ctx.globalAlpha = base
  }

  private drawList(pod: Pod, f: Frame, id: MenuId, isTop: boolean) {
    const ctx = this.ctx
    this.heading(id === 'contact' ? 'CONTACT' : 'SETTINGS')
    this.list(pod.items(id), f, 220, 96, 42, isTop, (it, y, k) => {
      const right = CW - PAD
      if (it.id === 'clicks') {
        const on = pod.settings.clicks
        ctx.strokeStyle = W
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(right - 84, y - 24, 84, 48, 24)
        ctx.stroke()
        dot(ctx, on ? right - 24 : right - 60, y, 15, on ? RED : G1)
        return
      }
      if (it.id === 'finish') {
        BODIES.forEach((b, j) => {
          const x = right - 18 - (BODIES.length - 1 - j) * 52
          const sw = FINISHES[b].swatch
          const gg = ctx.createLinearGradient(x - 16, y - 16, x + 16, y + 16)
          gg.addColorStop(0, sw[0])
          gg.addColorStop(1, sw[2])
          ctx.fillStyle = gg
          ctx.beginPath()
          ctx.arc(x, y, 16, 0, Math.PI * 2)
          ctx.fill()
          if (b === pod.settings.body) {
            ctx.strokeStyle = W
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(x, y, 23, 0, Math.PI * 2)
            ctx.stroke()
          }
        })
        return
      }
      ctx.textAlign = 'right'
      ctx.fillStyle = G1
      ctx.font = `500 30px ${UI}`
      if (it.value) ctx.fillText(it.value, right - (id === 'contact' ? 46 : 0), y)
      ctx.textAlign = 'left'
      if (id === 'contact' && k > 0.3) icon(ctx, 'out', right - 14, y, 26, W)
      else if (it.arrow && k > 0.5) icon(ctx, 'arrow', right - 16, y, 30, W)
    })
  }

  // ---------------------------------------------------------- now playing
  private drawNowPlaying(pod: Pod, index: number, now: number) {
    const ctx = this.ctx
    const p = projects[index]
    const n = projects.length
    const playing = pod.opened === index
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.fillStyle = G2
    ctx.font = `600 20px ${MONO}`
    ctx.fillText('NOW PLAYING', PAD, 122)
    ctx.textAlign = 'right'
    ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`, CW - PAD, 122)
    ctx.textAlign = 'left'

    const s = 556
    art(ctx, index, (CW - s) / 2, 144, s, 44)

    ctx.fillStyle = W
    ctx.font = `800 62px ${DOT}`
    ctx.fillText(p.title.toUpperCase(), PAD - 2, 782)
    ctx.font = `500 26px ${UI}`
    if (playing) {
      const blink = Math.floor(now / 500) % 2 === 0
      dot(ctx, PAD + 8, 815, 7, blink ? RED : 'rgba(255,59,48,0.35)')
      ctx.fillStyle = RED
      ctx.fillText('Playing on the page', PAD + 26, 824)
    } else {
      ctx.fillStyle = G1
      ctx.fillText(p.kind, PAD, 824)
    }

    if (now - pod.volumeShownAt < 1400) {
      ctx.fillStyle = G1
      ctx.font = `600 20px ${MONO}`
      ctx.fillText('VOL', PAD, 878)
      dotRow(ctx, PAD + 80, CW - PAD, 871, 22, Math.round(pod.volume * 22))
    } else dotRow(ctx, PAD + 6, CW - PAD - 6, 871, 26, Math.round(((index + 1) / n) * 26))

    const cy = 936
    icon(ctx, 'prev', CW / 2 - 170, cy, 40)
    icon(ctx, 'next', CW / 2 + 170, cy, 40)
    ctx.strokeStyle = W
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(CW / 2, cy, 36, 0, Math.PI * 2)
    ctx.stroke()
    icon(ctx, playing ? 'pause' : 'play', CW / 2 + (playing ? 0 : 3), cy, 34)
  }

  // ------------------------------------------------------------ text pages
  private drawText(pod: Pod, f: Frame, kind: 'about' | 'toolkit', isTop: boolean) {
    const ctx = this.ctx
    const L = this.layoutText(kind)
    const top = kind === 'about' ? 500 : 222
    const viewH = CH - top - 30
    const max = Math.max(0, L.height - viewH)
    if (isTop) pod.scrollMax.current = max
    const scroll = Math.min(isTop ? this.sc.y : f.scroll, max)

    if (kind === 'about') {
      const initials = (profile.name.match(/[A-Z]/g) ?? ['K']).join('').slice(0, 2)
      ctx.fillStyle = W
      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'left'
      ctx.font = `900 236px ${DOT}`
      ctx.fillText(initials, PAD - 12, 330)
      dot(ctx, PAD - 12 + ctx.measureText(initials).width + 14, 318, 12, RED)
      ctx.font = `600 40px ${UI}`
      ctx.fillText(profile.name, PAD, 404)
      ctx.fillStyle = G1
      ctx.font = `600 21px ${MONO}`
      ctx.fillText(profile.role.toUpperCase(), PAD, 444)
    } else this.heading('TOOLKIT')

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
      ctx.font = `500 28px ${UI}`
      ctx.textBaseline = 'middle'
      for (const c of L.chips) {
        ctx.strokeStyle = G3
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(c.x, c.y, c.w, 56, 28)
        ctx.stroke()
        ctx.fillStyle = W
        ctx.fillText(c.text, c.x + 24, c.y + 29)
      }
    }
    ctx.restore()

    if (max > 0) {
      const steps = 12
      const k = Math.round((scroll / max) * (steps - 1))
      for (let i = 0; i < steps; i++) dot(ctx, CW - 22, top + 10 + i * 26, 4, i === k ? RED : G3)
    }
  }

  private layoutText(kind: 'about' | 'toolkit'): TextLayout {
    const hit = this.textCache.get(kind)
    if (hit) return hit
    const ctx = this.ctx
    const lines: TextLine[] = []
    let y = 0
    const maxW = CW - PAD * 2 - 20
    if (kind === 'about') {
      const font = `400 30px ${UI}`
      ctx.font = font
      for (const para of profile.about) {
        for (const t of wrap(ctx, para, maxW)) {
          lines.push({ text: t, font, color: G1, x: PAD, y })
          y += 45
        }
        y += 24
      }
      const res = { lines, height: y + 20 }
      this.textCache.set(kind, res)
      return res
    }
    const chips: Chip[] = []
    for (const g of toolkit) {
      lines.push({ text: g.group.toUpperCase(), font: `600 20px ${MONO}`, color: G2, x: PAD, y })
      y += 40
      ctx.font = `500 28px ${UI}`
      let x = PAD
      for (const item of g.items) {
        const w = ctx.measureText(item).width + 48
        if (x + w > CW - PAD) {
          x = PAD
          y += 68
        }
        chips.push({ text: item, x, y, w })
        x += w + 12
      }
      y += 100
    }
    const res = { lines, height: y, chips }
    this.textCache.set(kind, res)
    return res
  }

  // ---------------------------------------------------------------- camera
  private drawCamera(now: number) {
    const ctx = this.ctx
    cam.frame(now, this.roomA, this.roomB)
    const h = CH - 262
    const w = Math.round(h * cam.aspect)
    const x = Math.round((CW - w) / 2)
    const y = 112
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 30)
    ctx.clip()
    ctx.imageSmoothingEnabled = false
    if (cam.low) ctx.drawImage(cam.low.c, x, y, w, h)
    ctx.imageSmoothingEnabled = true
    const f = FILTERS[cam.filter]
    // the digicam date stamp
    if (f !== 'Mono') {
      const d = new Date()
      ctx.fillStyle = f === 'Night' ? '#8dff8a' : '#ff9d2e'
      ctx.font = `800 34px ${DOT}`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(
        `'${YEAR} ${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}`,
        x + w - 22,
        y + h - 22,
      )
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
      ctx.roundRect(PAD - 10, CH - 128, 64, 100, 12)
      ctx.clip()
      ctx.drawImage(cam.photos[0], PAD - 10, CH - 128, 64, 100)
      ctx.restore()
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = W
    ctx.font = `800 46px ${DOT}`
    ctx.fillText(f.toUpperCase(), CW / 2, CH - 74)
    FILTERS.forEach((_, i) => dot(ctx, CW / 2 + (i - 1) * 22, CH - 50, 5, i === cam.filter ? RED : G3))
    ctx.fillStyle = G2
    ctx.font = `600 18px ${MONO}`
    const note =
      cam.state === 'blocked'
        ? 'CAMERA BLOCKED · TEST FEED'
        : cam.state === 'none'
          ? 'NO CAMERA · TEST FEED'
          : cam.state === 'starting'
            ? 'STARTING…'
            : '● SHOOT  ·  SCROLL FOR FILTERS'
    ctx.fillText(note, CW / 2, CH - 20)
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
    ctx.fillStyle = '#16171a'
    ctx.beginPath()
    ctx.roundRect(x, y, w, 76, 38)
    ctx.fill()
    ctx.strokeStyle = G3
    ctx.lineWidth = 2
    ctx.stroke()
    const plugged = pod.toast!.icon === 'earbuds'
    icon(ctx, plugged ? 'earbuds' : 'unplugged', x + 46, y + 38, 30, plugged ? W : RED)
    ctx.fillStyle = W
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(text, x + 82, y + 39)
    ctx.restore()
  }

  private drawBoot(pod: Pod, now: number) {
    const ctx = this.ctx
    const t = now - pod.bootAt
    ctx.save()
    ctx.globalAlpha = easeOut(t / 600)
    ctx.fillStyle = W
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `900 150px ${DOT}`
    const word = profile.short
    ctx.fillText(word, CW / 2 - 14, CH * 0.5)
    dot(ctx, CW / 2 + ctx.measureText(word).width / 2 + 4, CH * 0.5 - 14, 13, RED)
    const k = clamp01((t - 200) / (BOOT_MS - 400))
    dotRow(ctx, CW / 2 - 150, CW / 2 + 150, CH * 0.5 + 70, 13, Math.ceil(k * 13), 5)
    ctx.fillStyle = G2
    ctx.font = `600 19px ${MONO}`
    ctx.fillText(`PORTFOLIO ’${YEAR}`, CW / 2, CH * 0.5 + 130)
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
