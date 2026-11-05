// The pod's operating system, drawn into a canvas that becomes the screen texture.
import * as THREE from 'three'
import { profile, projects, toolkit, YEAR } from '../content'
import { BODIES, BOOT_MS, type Frame, type MenuId, type MenuItem, type Pod } from '../usePod'
import { cover } from './art'
import { DISPLAY, fontsReady, UI } from './fonts'
import { POD } from './model'
import { FINISHES } from './palette'

export const CW = 900
export const CH = Math.round((CW * POD.active.h) / POD.active.w) // keeps pixels square on the glass

const C = {
  bg: '#0b0c0f',
  text: '#f4f5f7',
  body: 'rgba(244,245,247,0.86)',
  dim: 'rgba(236,240,245,0.55)',
  faint: 'rgba(236,240,245,0.28)',
  line: 'rgba(255,255,255,0.08)',
  ok: '#5fe3a1',
}
const PAD = 46
const ROW = 96
const PROJ_ROW = 128

const easeOut = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3)
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

type Ctx = CanvasRenderingContext2D

// ------------------------------------------------------------------ icons
const TILE: Record<string, [string, string, string]> = {
  projects: ['#ff9150', '#ff4f80', 'albums'],
  about: ['#5d8dff', '#9a6bff', 'person'],
  toolkit: ['#2fd5a5', '#1697c9', 'code'],
  contact: ['#ffc53d', '#ff8a2b', 'mail'],
  shuffle: ['#ff5fa2', '#9d5bff', 'shuffle'],
  settings: ['#8f97a5', '#58616f', 'gear'],
  github: ['#4a5160', '#23272f', 'branch'],
  plain: ['#7d8797', '#4b5363', 'list'],
  clicks: ['#ffb23d', '#ff7a2b', 'sound'],
  finish: ['#cdb79c', '#8e7860', 'palette'],
  restart: ['#4cc9f0', '#4361ee', 'restart'],
}

function glyph(ctx: Ctx, name: string, x: number, y: number, s: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = '#fff'
  ctx.fillStyle = '#fff'
  ctx.lineWidth = s * 0.09
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const u = s / 2
  ctx.beginPath()
  switch (name) {
    case 'albums':
      ctx.roundRect(-u * 0.55, -u * 0.75, u * 1.25, u * 1.25, u * 0.22)
      ctx.stroke()
      ctx.beginPath()
      ctx.roundRect(-u * 0.8, -u * 0.45, u * 1.25, u * 1.25, u * 0.22)
      ctx.globalAlpha = 0.95
      ctx.fill()
      break
    case 'person':
      ctx.arc(0, -u * 0.32, u * 0.36, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(0, u * 0.62, u * 0.72, u * 0.46, 0, Math.PI, 0)
      ctx.fill()
      break
    case 'code':
      ctx.moveTo(-u * 0.35, -u * 0.5)
      ctx.lineTo(-u * 0.8, 0)
      ctx.lineTo(-u * 0.35, u * 0.5)
      ctx.moveTo(u * 0.35, -u * 0.5)
      ctx.lineTo(u * 0.8, 0)
      ctx.lineTo(u * 0.35, u * 0.5)
      ctx.moveTo(u * 0.12, -u * 0.62)
      ctx.lineTo(-u * 0.12, u * 0.62)
      ctx.stroke()
      break
    case 'mail':
      ctx.roundRect(-u * 0.8, -u * 0.55, u * 1.6, u * 1.1, u * 0.18)
      ctx.moveTo(-u * 0.72, -u * 0.42)
      ctx.lineTo(0, u * 0.12)
      ctx.lineTo(u * 0.72, -u * 0.42)
      ctx.stroke()
      break
    case 'shuffle':
      ctx.moveTo(-u * 0.8, -u * 0.45)
      ctx.bezierCurveTo(-u * 0.1, -u * 0.45, 0, u * 0.45, u * 0.7, u * 0.45)
      ctx.moveTo(-u * 0.8, u * 0.45)
      ctx.bezierCurveTo(-u * 0.1, u * 0.45, 0, -u * 0.45, u * 0.7, -u * 0.45)
      ctx.moveTo(u * 0.45, -u * 0.7)
      ctx.lineTo(u * 0.75, -u * 0.45)
      ctx.lineTo(u * 0.45, -u * 0.2)
      ctx.moveTo(u * 0.45, u * 0.2)
      ctx.lineTo(u * 0.75, u * 0.45)
      ctx.lineTo(u * 0.45, u * 0.7)
      ctx.stroke()
      break
    case 'gear':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        ctx.moveTo(Math.cos(a) * u * 0.55, Math.sin(a) * u * 0.55)
        ctx.lineTo(Math.cos(a) * u * 0.82, Math.sin(a) * u * 0.82)
      }
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, u * 0.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, u * 0.16, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'branch':
      ctx.arc(-u * 0.38, -u * 0.55, u * 0.17, 0, Math.PI * 2)
      ctx.moveTo(-u * 0.38 + u * 0.17, u * 0.55)
      ctx.arc(-u * 0.38, u * 0.55, u * 0.17, 0, Math.PI * 2)
      ctx.moveTo(u * 0.38 + u * 0.17, -u * 0.3)
      ctx.arc(u * 0.38, -u * 0.3, u * 0.17, 0, Math.PI * 2)
      ctx.moveTo(-u * 0.38, -u * 0.38)
      ctx.lineTo(-u * 0.38, u * 0.38)
      ctx.moveTo(u * 0.38, -u * 0.12)
      ctx.quadraticCurveTo(u * 0.38, u * 0.3, -u * 0.3, u * 0.42)
      ctx.stroke()
      break
    case 'list':
      for (const yy of [-0.45, 0, 0.45]) {
        ctx.moveTo(-u * 0.7, u * yy)
        ctx.lineTo(u * 0.7, u * yy)
      }
      ctx.stroke()
      break
    case 'sound':
      ctx.moveTo(-u * 0.8, -u * 0.25)
      ctx.lineTo(-u * 0.45, -u * 0.25)
      ctx.lineTo(-u * 0.05, -u * 0.62)
      ctx.lineTo(-u * 0.05, u * 0.62)
      ctx.lineTo(-u * 0.45, u * 0.25)
      ctx.lineTo(-u * 0.8, u * 0.25)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.arc(-u * 0.05, 0, u * 0.45, -0.7, 0.7)
      ctx.moveTo(-u * 0.05 + Math.cos(-0.75) * u * 0.78, Math.sin(-0.75) * u * 0.78)
      ctx.arc(-u * 0.05, 0, u * 0.78, -0.75, 0.75)
      ctx.stroke()
      break
    case 'palette':
      ctx.arc(0, 0, u * 0.75, 0, Math.PI * 2)
      ctx.stroke()
      for (const [a, r] of [
        [-2.3, 0.18],
        [-0.9, 0.18],
        [0.5, 0.18],
      ]) {
        ctx.beginPath()
        ctx.arc(Math.cos(a) * u * 0.38, Math.sin(a) * u * 0.38, u * r, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 'restart':
      ctx.arc(0, 0, u * 0.62, -Math.PI * 0.35, Math.PI * 1.45)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(u * 0.62 * Math.cos(-Math.PI * 0.35) + u * 0.32, u * 0.62 * Math.sin(-Math.PI * 0.35) - u * 0.02)
      ctx.lineTo(u * 0.62 * Math.cos(-Math.PI * 0.35), u * 0.62 * Math.sin(-Math.PI * 0.35))
      ctx.lineTo(u * 0.62 * Math.cos(-Math.PI * 0.35) + u * 0.06, u * 0.62 * Math.sin(-Math.PI * 0.35) - u * 0.34)
      ctx.stroke()
      break
    case 'earbuds':
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(sx * u * 0.42, -u * 0.25, u * 0.3, u * 0.34, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.roundRect(sx * u * 0.42 - u * 0.09, -u * 0.1, u * 0.18, u * 0.85, u * 0.09)
        ctx.fill()
      }
      break
    case 'unplugged':
      ctx.roundRect(-u * 0.3, -u * 0.8, u * 0.6, u * 0.75, u * 0.12)
      ctx.moveTo(-u * 0.12, -u * 0.05)
      ctx.lineTo(-u * 0.12, u * 0.25)
      ctx.moveTo(u * 0.12, -u * 0.05)
      ctx.lineTo(u * 0.12, u * 0.25)
      ctx.moveTo(0, u * 0.25)
      ctx.lineTo(0, u * 0.8)
      ctx.stroke()
      break
  }
  ctx.restore()
}

function tile(ctx: Ctx, id: string, x: number, y: number, s: number) {
  const [a, b, g] = TILE[id] ?? TILE.plain
  const grad = ctx.createLinearGradient(x, y, x + s, y + s)
  grad.addColorStop(0, a)
  grad.addColorStop(1, b)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(x, y, s, s, s * 0.28)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.beginPath()
  ctx.roundRect(x, y, s, s * 0.5, [s * 0.28, s * 0.28, 0, 0])
  ctx.fill()
  glyph(ctx, g, x + s / 2, y + s / 2, s * 0.56)
}

function chevron(ctx: Ctx, x: number, y: number, s: number, color = C.faint) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = s * 0.18
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x - s * 0.22, y - s * 0.42)
  ctx.lineTo(x + s * 0.22, y)
  ctx.lineTo(x - s * 0.22, y + s * 0.42)
  ctx.stroke()
  ctx.restore()
}

function art(ctx: Ctx, n: number, x: number, y: number, s: number, r: number) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, s, s, r)
  ctx.clip()
  ctx.drawImage(cover(n), x, y, s, s)
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(x + 1, y + 1, s - 2, s - 2, r)
  ctx.stroke()
  ctx.restore()
}

function pill(ctx: Ctx, text: string, x: number, y: number, live: boolean, alignRight = false) {
  ctx.save()
  ctx.font = `600 22px ${UI}`
  const w = ctx.measureText(text).width + (live ? 52 : 34)
  const px = alignRight ? x - w : x
  ctx.fillStyle = live ? 'rgba(95,227,161,0.14)' : 'rgba(255,255,255,0.08)'
  ctx.beginPath()
  ctx.roundRect(px, y - 20, w, 40, 20)
  ctx.fill()
  ctx.fillStyle = live ? C.ok : C.dim
  if (live) {
    ctx.beginPath()
    ctx.arc(px + 20, y, 6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.textBaseline = 'middle'
  ctx.fillText(text, px + (live ? 34 : 17), y + 1)
  ctx.restore()
  return w
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

function eqBars(ctx: Ctx, x: number, y: number, h: number, now: number, color: string, playing: boolean) {
  ctx.save()
  ctx.fillStyle = color
  for (let i = 0; i < 4; i++) {
    const k = playing ? 0.3 + 0.7 * Math.abs(Math.sin(now / (260 + i * 70) + i * 1.7)) : 0.3
    const bh = h * k
    ctx.beginPath()
    ctx.roundRect(x + i * h * 0.3, y + (h - bh) / 2, h * 0.18, bh, h * 0.09)
    ctx.fill()
  }
  ctx.restore()
}

// --------------------------------------------------------------- renderer
type TextLine = { text: string; font: string; color: string; x: number; y: number }

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
  private textCache = new Map<string, { lines: TextLine[]; height: number; chips?: ChipLayout }>()
  accent = '#ff7a45'

  constructor() {
    this.canvas.width = CW
    this.canvas.height = CH
    this.ctx = this.canvas.getContext('2d')!
    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.anisotropy = 8
    this.ctx.fillStyle = C.bg
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
    // selection pill
    if (this.hl.key !== top.key) this.hl = { key: top.key, y: top.sel }
    else if (Math.abs(top.sel - this.hl.y) > 0.002) {
      this.hl.y += (top.sel - this.hl.y) * 0.3
      moving = true
    } else this.hl.y = top.sel
    // text scroll
    if (this.sc.key !== top.key) this.sc = { key: top.key, y: top.scroll }
    else if (Math.abs(top.scroll - this.sc.y) > 0.5) {
      this.sc.y += (top.scroll - this.sc.y) * 0.28
      moving = true
    } else this.sc.y = top.scroll

    const toastOn = pod.toast && now - pod.toast.at < 2700
    const volOn = now - pod.volumeShownAt < 1400
    const booting = pod.power === 'booting'
    const v = top.view
    const playingAnim =
      pod.power === 'on' &&
      ((v.kind === 'menu' && v.id === 'main' && pod.lastPlayed !== null) || (v.kind === 'project' && pod.opened !== null))
    const minute = new Date().getMinutes()
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
      minute,
      accent,
      // flags, so the frame after an animation ends is drawn too
      !!this.trans,
      toastOn,
      volOn,
      booting,
      moving,
    ].join('|')

    const continuous = moving || toastOn || volOn || booting
    if (!continuous && sig === this.sig) {
      // only the little equaliser is animating: 30 fps is plenty
      if (!playingAnim || now - this.lastDraw < 33) return false
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
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, CW, CH)
    if (pod.power === 'off') {
      ctx.restore()
      return
    }
    // ambient tint from the room's accent
    const g = ctx.createRadialGradient(CW * 0.5, -CH * 0.1, 0, CW * 0.5, -CH * 0.1, CH * 0.9)
    g.addColorStop(0, hexA(this.accent, 0.2))
    g.addColorStop(1, hexA(this.accent, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CW, CH)

    if (pod.power === 'booting') {
      this.drawBoot(pod, now)
      ctx.restore()
      return
    }

    if (this.trans) {
      const e = easeOut((now - this.trans.start) / 320)
      const d = this.trans.dir
      this.drawView(pod, this.trans.from, -d * e * CW * 0.22, 1 - e, now, false)
      this.drawView(pod, top, d * (1 - e) * CW * 0.22, e, now, true)
    } else this.drawView(pod, top, 0, 1, now, true)

    this.drawStatus(pod)
    if (pod.toast && now - pod.toast.at < 2700) this.drawToast(pod, now)
    ctx.restore()
  }

  private drawView(pod: Pod, f: Frame, dx: number, alpha: number, now: number, isTop: boolean) {
    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(dx, 0)
    const v = f.view
    if (v.kind === 'menu') this.drawMenu(pod, f, v.id, now, isTop)
    else if (v.kind === 'project') this.drawNowPlaying(pod, v.index, now)
    else this.drawText(pod, f, v.kind, isTop)
    ctx.restore()
  }

  private drawStatus(pod: Pod) {
    const ctx = this.ctx
    // keep the status bar readable over scrolled content
    const g = ctx.createLinearGradient(0, 0, 0, 92)
    g.addColorStop(0, 'rgba(11,12,15,0.95)')
    g.addColorStop(1, 'rgba(11,12,15,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CW, 92)
    ctx.fillStyle = C.text
    ctx.font = `600 29px ${UI}`
    ctx.textBaseline = 'middle'
    const d = new Date()
    ctx.fillText(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`, PAD, 42)
    // battery
    const bx = CW - PAD - 50
    ctx.strokeStyle = 'rgba(244,245,247,0.7)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.roundRect(bx, 31, 46, 23, 7)
    ctx.stroke()
    ctx.fillStyle = C.text
    ctx.beginPath()
    ctx.roundRect(bx + 4, 35, 30, 15, 4)
    ctx.fill()
    ctx.fillStyle = 'rgba(244,245,247,0.7)'
    ctx.beginPath()
    ctx.roundRect(bx + 48, 38, 4, 9, 2)
    ctx.fill()
    if (pod.plugged) {
      ctx.globalAlpha = 0.9
      glyph(ctx, 'earbuds', bx - 34, 44, 34)
      ctx.globalAlpha = 1
    }
  }

  private title(text: string, y = 150, sub?: string) {
    const ctx = this.ctx
    ctx.fillStyle = C.text
    ctx.textBaseline = 'alphabetic'
    ctx.font = `720 60px ${DISPLAY}`
    ctx.fillText(text, PAD, y)
    if (sub) {
      ctx.fillStyle = C.dim
      ctx.font = `500 26px ${UI}`
      ctx.fillText(sub, PAD + 2, y + 40)
    }
  }

  // ---------------------------------------------------------------- menus
  private drawMenu(pod: Pod, f: Frame, id: MenuId, now: number, isTop: boolean) {
    const ctx = this.ctx
    const items = pod.items(id)
    const titles: Record<MenuId, string> = { main: profile.name, projects: 'Projects', contact: 'Contact', settings: 'Settings' }
    const isMain = id === 'main'
    this.title(titles[id], isMain ? 140 : 150, isMain ? profile.role : undefined)
    const rowH = id === 'projects' ? PROJ_ROW : ROW
    const listTop = isMain ? 206 : 190
    const mini = isMain && pod.lastPlayed !== null
    const bottom = CH - (mini ? 150 : 24)
    const visible = Math.max(1, Math.floor((bottom - listTop) / rowH))
    const sel = isTop ? this.hl.y : f.sel
    const first = Math.max(0, Math.min(items.length - visible, Math.round(f.sel) - visible + 1))

    // selection pill
    const py = listTop + (sel - first) * rowH
    const pg = ctx.createLinearGradient(0, py, 0, py + rowH)
    pg.addColorStop(0, 'rgba(255,255,255,0.13)')
    pg.addColorStop(1, 'rgba(255,255,255,0.07)')
    ctx.fillStyle = pg
    ctx.beginPath()
    ctx.roundRect(22, py + 5, CW - 44, rowH - 10, 30)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 2
    ctx.stroke()

    for (let i = first; i < Math.min(items.length, first + visible); i++) {
      const y = listTop + (i - first) * rowH
      const cy = y + rowH / 2
      const it = items[i]
      const on = i === f.sel
      if (id === 'projects') this.projectRow(i, y, cy, on)
      else this.menuRow(pod, it, cy, on)
    }

    if (mini) this.miniPlayer(pod, now)
  }

  private menuRow(pod: Pod, it: MenuItem, cy: number, on: boolean) {
    const ctx = this.ctx
    tile(ctx, it.id, PAD, cy - 30, 60)
    ctx.textBaseline = 'middle'
    ctx.fillStyle = C.text
    ctx.font = `${on ? 600 : 500} 36px ${UI}`
    ctx.fillText(it.label, PAD + 86, cy + 1)
    const right = CW - PAD - 6
    if (it.id === 'clicks') {
      // a toggle switch
      const onv = pod.settings.clicks
      const w = 84
      const h = 48
      ctx.fillStyle = onv ? this.accent : 'rgba(255,255,255,0.18)'
      ctx.beginPath()
      ctx.roundRect(right - w, cy - h / 2, w, h, h / 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(onv ? right - h / 2 : right - w + h / 2, cy, h / 2 - 5, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    if (it.id === 'finish') {
      // swatches for each finish
      BODIES.forEach((b, k) => {
        const x = right - 22 - (BODIES.length - 1 - k) * 56
        const sw = FINISHES[b].swatch
        const gg = ctx.createLinearGradient(x - 18, cy - 18, x + 18, cy + 18)
        gg.addColorStop(0, sw[0])
        gg.addColorStop(1, sw[2])
        ctx.fillStyle = gg
        ctx.beginPath()
        ctx.arc(x, cy, 18, 0, Math.PI * 2)
        ctx.fill()
        if (b === pod.settings.body) {
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(x, cy, 25, 0, Math.PI * 2)
          ctx.stroke()
        }
      })
      return
    }
    let x = right
    if (it.arrow) {
      chevron(ctx, x - 6, cy, 26, on ? C.dim : C.faint)
      x -= 34
    }
    if (it.value) {
      ctx.textAlign = 'right'
      ctx.fillStyle = C.dim
      ctx.font = `500 30px ${UI}`
      ctx.fillText(it.value, x, cy + 1)
      ctx.textAlign = 'left'
    }
  }

  private projectRow(i: number, y: number, cy: number, on: boolean) {
    const ctx = this.ctx
    const p = projects[i]
    art(ctx, i, PAD - 6, y + 14, PROJ_ROW - 28, 18)
    const tx = PAD + PROJ_ROW - 6
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = C.text
    ctx.font = `${on ? 650 : 560} 35px ${UI}`
    ctx.fillText(p.title, tx, cy - 4)
    ctx.fillStyle = C.dim
    ctx.font = `500 25px ${UI}`
    ctx.fillText(p.kind, tx, cy + 32)
    pill(ctx, p.live ? 'Live' : 'Repo', CW - PAD - 6, cy - 2, !!p.live, true)
  }

  private miniPlayer(pod: Pod, now: number) {
    const ctx = this.ctx
    const n = pod.lastPlayed!
    const y = CH - 134
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.roundRect(22, y, CW - 44, 110, 32)
    ctx.fill()
    art(ctx, n, 40, y + 15, 80, 16)
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = C.dim
    ctx.font = `600 21px ${UI}`
    ctx.fillText('NOW PLAYING', 142, y + 46)
    ctx.fillStyle = C.text
    ctx.font = `600 31px ${UI}`
    ctx.fillText(projects[n].title, 142, y + 84)
    eqBars(ctx, CW - 100, y + 33, 44, now, this.accent, true)
  }

  // ---------------------------------------------------------- now playing
  private drawNowPlaying(pod: Pod, index: number, now: number) {
    const ctx = this.ctx
    const p = projects[index]
    const n = projects.length
    const playing = pod.opened === index
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = C.dim
    ctx.font = `600 23px ${UI}`
    ctx.fillText(`NOW PLAYING  ·  ${index + 1} OF ${n}`, CW / 2, 104)
    ctx.textAlign = 'left'

    const s = 548
    const ax = (CW - s) / 2
    const ay = 136
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 60
    ctx.shadowOffsetY = 24
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.roundRect(ax, ay, s, s, 30)
    ctx.fill()
    ctx.restore()
    art(ctx, index, ax, ay, s, 30)

    const tx = PAD + 8
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = C.text
    ctx.font = `720 50px ${DISPLAY}`
    ctx.fillText(p.title, tx, 750)
    ctx.font = `500 27px ${UI}`
    if (playing) {
      ctx.fillStyle = this.accent
      ctx.fillText('Playing on the page →', tx, 792)
      eqBars(ctx, CW - PAD - 60, 718, 40, now, this.accent, true)
    } else {
      ctx.fillStyle = C.dim
      ctx.fillText(p.kind, tx, 792)
      pill(ctx, p.live ? 'Live' : 'Repo', CW - PAD - 8, 736, !!p.live, true)
    }

    const volOn = now - pod.volumeShownAt < 1400
    const x0 = tx
    const x1 = CW - PAD - 8
    if (volOn) {
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.beginPath()
      ctx.roundRect(x0 + 44, 838, x1 - x0 - 88, 12, 6)
      ctx.fill()
      ctx.fillStyle = C.text
      ctx.beginPath()
      ctx.roundRect(x0 + 44, 838, (x1 - x0 - 88) * pod.volume, 12, 6)
      ctx.fill()
      ctx.globalAlpha = 0.6
      glyph(ctx, 'sound', x0 + 12, 844, 30)
      ctx.globalAlpha = 1
      glyph(ctx, 'sound', x1 - 12, 844, 38)
    } else {
      const k = (index + 1) / n
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.beginPath()
      ctx.roundRect(x0, 838, x1 - x0, 10, 5)
      ctx.fill()
      ctx.fillStyle = this.accent
      ctx.beginPath()
      ctx.roundRect(x0, 838, (x1 - x0) * k, 10, 5)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(x0 + (x1 - x0) * k, 843, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = C.dim
      ctx.font = `500 21px ${UI}`
      ctx.fillText(String(index + 1).padStart(2, '0'), x0, 880)
      ctx.textAlign = 'right'
      ctx.fillText(String(n).padStart(2, '0'), x1, 880)
      ctx.textAlign = 'left'
    }

    // transport controls
    const cy = 924
    ctx.fillStyle = C.text
    const tri = (x: number, y: number, s: number, dir: 1 | -1) => {
      ctx.beginPath()
      ctx.moveTo(x - (dir * s) / 2, y - s / 2)
      ctx.lineTo(x + (dir * s) / 2, y)
      ctx.lineTo(x - (dir * s) / 2, y + s / 2)
      ctx.closePath()
      ctx.fill()
    }
    for (const dir of [-1, 1] as const) {
      const x = CW / 2 + dir * 190
      tri(x - dir * 2, cy, 28, dir)
      tri(x + dir * 24, cy, 28, dir)
      ctx.beginPath()
      ctx.roundRect(x + dir * 40 - 3, cy - 14, 6, 28, 3)
      ctx.fill()
    }
    if (playing) {
      ctx.beginPath()
      ctx.roundRect(CW / 2 - 18, cy - 24, 12, 48, 4)
      ctx.roundRect(CW / 2 + 6, cy - 24, 12, 48, 4)
      ctx.fill()
    } else tri(CW / 2 + 4, cy, 46, 1)
  }

  // ------------------------------------------------------------ text pages
  private drawText(pod: Pod, f: Frame, kind: 'about' | 'toolkit', isTop: boolean) {
    const ctx = this.ctx
    const L = this.layoutText(kind)
    const top = kind === 'about' ? 300 : 200
    const viewH = CH - top - 30
    const max = Math.max(0, L.height - viewH)
    if (isTop) pod.scrollMax.current = max
    const scroll = Math.min(isTop ? this.sc.y : f.scroll, max)

    if (kind === 'about') {
      const s = 150
      const g = ctx.createLinearGradient(PAD, 104, PAD + s, 104 + s)
      g.addColorStop(0, this.accent)
      g.addColorStop(1, '#5d6bff')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(PAD + s / 2, 104 + s / 2, s / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `780 62px ${DISPLAY}`
      ctx.fillText((profile.name.match(/[A-Z]/g) ?? ['K']).join('').slice(0, 2), PAD + s / 2, 104 + s / 2 + 3)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = C.text
      ctx.font = `720 54px ${DISPLAY}`
      ctx.fillText(profile.name, PAD + s + 30, 172)
      ctx.fillStyle = C.dim
      ctx.font = `500 26px ${UI}`
      ctx.fillText(profile.role, PAD + s + 32, 212)
    } else this.title('Toolkit')

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, top - 10, CW, CH - top + 10)
    ctx.clip()
    ctx.translate(0, top - scroll)
    for (const l of L.lines) {
      ctx.font = l.font
      ctx.fillStyle = l.color
      ctx.textBaseline = 'top'
      ctx.fillText(l.text, l.x, l.y)
    }
    if (L.chips) {
      ctx.font = `500 28px ${UI}`
      ctx.textBaseline = 'middle'
      for (const c of L.chips) {
        ctx.fillStyle = 'rgba(255,255,255,0.09)'
        ctx.beginPath()
        ctx.roundRect(c.x, c.y, c.w, 56, 28)
        ctx.fill()
        ctx.fillStyle = C.body
        ctx.fillText(c.text, c.x + 24, c.y + 29)
      }
    }
    ctx.restore()

    if (max > 0) {
      const trackTop = top
      const trackH = CH - top - 40
      const th = Math.max(60, (viewH / L.height) * trackH)
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.beginPath()
      ctx.roundRect(CW - 18, trackTop, 6, trackH, 3)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.beginPath()
      ctx.roundRect(CW - 18, trackTop + (scroll / max) * (trackH - th), 6, th, 3)
      ctx.fill()
    }
  }

  private layoutText(kind: 'about' | 'toolkit'): { lines: TextLine[]; height: number; chips?: ChipLayout } {
    const hit = this.textCache.get(kind)
    if (hit) return hit
    const ctx = this.ctx
    const lines: TextLine[] = []
    let y = 0
    const maxW = CW - PAD * 2 - 24
    if (kind === 'about') {
      const font = `400 31px ${UI}`
      ctx.font = font
      for (const para of profile.about) {
        for (const t of wrap(ctx, para, maxW)) {
          lines.push({ text: t, font, color: C.body, x: PAD, y })
          y += 46
        }
        y += 26
      }
      const ff = `500 24px ${UI}`
      lines.push({ text: 'Scroll for more · MENU to go back', font: ff, color: C.faint, x: PAD, y: y + 6 })
      y += 50
      const res = { lines, height: y }
      this.textCache.set(kind, res)
      return res
    }
    const chips: ChipLayout = []
    const labelFont = `650 22px ${UI}`
    for (const g of toolkit) {
      lines.push({ text: g.group.toUpperCase(), font: labelFont, color: C.dim, x: PAD, y })
      y += 44
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
      y += 98
    }
    const res = { lines, height: y, chips }
    this.textCache.set(kind, res)
    return res
  }

  // ------------------------------------------------------------ overlays
  private drawToast(pod: Pod, now: number) {
    const ctx = this.ctx
    const t = now - pod.toast!.at
    const inE = easeOut(t / 260)
    const outE = clamp01((t - 2300) / 380)
    const a = inE * (1 - outE)
    const text = pod.toast!.text
    ctx.save()
    ctx.globalAlpha = a
    ctx.font = `600 29px ${UI}`
    const w = ctx.measureText(text).width + 130
    const x = (CW - w) / 2
    const y = 18 + (1 - inE) * -40 + outE * -20
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 10
    ctx.fillStyle = '#1e2026'
    ctx.beginPath()
    ctx.roundRect(x, y, w, 80, 40)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 2
    ctx.stroke()
    const on = pod.toast!.icon === 'earbuds'
    ctx.fillStyle = on ? hexA(this.accent, 0.25) : 'rgba(255,255,255,0.12)'
    ctx.beginPath()
    ctx.arc(x + 46, y + 40, 26, 0, Math.PI * 2)
    ctx.fill()
    glyph(ctx, on ? 'earbuds' : 'unplugged', x + 46, y + 42, 32)
    ctx.fillStyle = C.text
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + 90, y + 41)
    ctx.restore()
  }

  private drawBoot(pod: Pod, now: number) {
    const ctx = this.ctx
    const t = now - pod.bootAt
    const e = easeOut(t / 700)
    ctx.save()
    ctx.globalAlpha = e
    ctx.translate(CW / 2, CH * 0.46)
    const sc = 0.94 + 0.06 * e
    ctx.scale(sc, sc)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 150px ${DISPLAY}`
    const word = `${profile.short}.`
    const g = ctx.createLinearGradient(-200, -80, 200, 80)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(1, this.accent)
    ctx.fillStyle = g
    ctx.fillText(word, 0, 0)
    ctx.restore()
    const w = 280
    const k = clamp01((t - 250) / (BOOT_MS - 450))
    ctx.globalAlpha = e
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.beginPath()
    ctx.roundRect((CW - w) / 2, CH * 0.46 + 112, w, 6, 3)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.roundRect((CW - w) / 2, CH * 0.46 + 112, w * k, 6, 3)
    ctx.fill()
    ctx.fillStyle = C.dim
    ctx.font = `500 25px ${UI}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`Portfolio ’${YEAR}`, CW / 2, CH * 0.46 + 172)
    ctx.textAlign = 'left'
    ctx.globalAlpha = 1
  }
}

type ChipLayout = { text: string; x: number; y: number; w: number }[]

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

// ---------------------------------------------------------------- material
/** The lit display: the OS texture with a soft edge falloff and rounded corners. */
export function screenMaterial(map: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uPower: { value: 0 },
      uAspect: { value: POD.active.w / POD.active.h },
      uRadius: { value: POD.active.r / POD.active.h },
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
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        vec2 b = vec2(uAspect, 1.0) * 0.5 - uRadius;
        vec2 q = abs(p) - b;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
        float mask = 1.0 - smoothstep(-0.0015, 0.0015, d);
        vec3 col = texture2D(map, vUv).rgb;
        // a little falloff towards the edges, like a real panel under glass
        vec2 c = vUv - 0.5;
        col *= 1.0 - dot(c, c) * 0.35;
        col *= uPower;
        gl_FragColor = vec4(col * mask, 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
}
