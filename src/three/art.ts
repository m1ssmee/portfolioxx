// Generative "album covers" for the projects. Drawn once on a canvas and reused by the
// pod's screen, the 3D album arc and the project panel.
import { projects } from '../content'
import { DISPLAY, UI } from './fonts'

export const ART = 768
const cache = new Map<number, HTMLCanvasElement>()

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function title(ctx: CanvasRenderingContext2D, lines: string[], sub: string, n: number, color = '#fff') {
  const S = ART
  ctx.save()
  ctx.fillStyle = color
  ctx.textBaseline = 'alphabetic'
  ctx.font = `600 ${S * 0.03}px ${UI}`
  ctx.globalAlpha = 0.75
  ctx.fillText(String(n + 1).padStart(2, '0'), S * 0.07, S * 0.1)
  ctx.globalAlpha = 1
  ctx.font = `750 ${S * 0.105}px ${DISPLAY}`
  const lh = S * 0.1
  const top = S * 0.9 - lh * (lines.length - 1) - S * 0.06
  lines.forEach((l, i) => ctx.fillText(l, S * 0.07, top + i * lh))
  ctx.globalAlpha = 0.78
  ctx.font = `500 ${S * 0.032}px ${UI}`
  ctx.fillText(sub, S * 0.072, S * 0.9)
  ctx.restore()
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.globalAlpha = a
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.restore()
}

// ---------------------------------------------------------------- covers
function bodymap(ctx: CanvasRenderingContext2D, n: number) {
  const S = ART
  const bg = ctx.createLinearGradient(0, 0, S, S)
  bg.addColorStop(0, '#4338d8')
  bg.addColorStop(0.55, '#a86ad6')
  bg.addColorStop(1, '#f4a9c8')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, S, S)
  glow(ctx, S * 0.62, S * 0.3, S * 0.5, 'rgba(255,255,255,0.35)')

  // a figure made of dots
  const body = new Path2D()
  const cx = S * 0.62
  body.arc(cx, S * 0.2, S * 0.055, 0, Math.PI * 2)
  body.roundRect(cx - S * 0.1, S * 0.28, S * 0.2, S * 0.27, S * 0.06)
  body.roundRect(cx - S * 0.165, S * 0.29, S * 0.055, S * 0.25, S * 0.03)
  body.roundRect(cx + S * 0.11, S * 0.29, S * 0.055, S * 0.25, S * 0.03)
  body.roundRect(cx - S * 0.09, S * 0.53, S * 0.075, S * 0.32, S * 0.035)
  body.roundRect(cx + S * 0.015, S * 0.53, S * 0.075, S * 0.32, S * 0.035)
  const step = S * 0.018
  ctx.fillStyle = 'rgba(255,255,255,0.62)'
  for (let y = step / 2; y < S; y += step)
    for (let x = step / 2; x < S; x += step) {
      if (ctx.isPointInPath(body, x, y)) {
        ctx.beginPath()
        ctx.arc(x, y, S * 0.0042, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  // findings, glowing on the body
  const marks: [number, number, string][] = [
    [cx - S * 0.03, S * 0.34, '#ffc857'],
    [cx + S * 0.035, S * 0.45, '#ff5d73'],
    [cx - S * 0.05, S * 0.72, '#6ef0b0'],
  ]
  for (const [x, y, c] of marks) {
    glow(ctx, x, y, S * 0.08, c, 0.9)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(x, y, S * 0.012, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = S * 0.003
    ctx.beginPath()
    ctx.arc(x, y, S * 0.028, 0, Math.PI * 2)
    ctx.stroke()
  }
  title(ctx, ['BodyMap'], 'your body, explained', n)
}

function tavern(ctx: CanvasRenderingContext2D, n: number) {
  const S = ART
  const bg = ctx.createLinearGradient(0, S, S, 0)
  bg.addColorStop(0, '#a8360c')
  bg.addColorStop(0.5, '#ef8a32')
  bg.addColorStop(1, '#fcd96b')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, S, S)
  // faint code texture
  const r = rng(7)
  const words = ['const', 'import', '=>', '{ }', 'return', 'await', 'if', 'fix()', '[path:line]', 'retry', '//', '?.']
  ctx.font = `500 ${S * 0.026}px "JetBrains Mono Variable", monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  for (let y = S * 0.05; y < S; y += S * 0.045) {
    let x = S * 0.03 - r() * S * 0.05
    while (x < S) {
      const w = words[Math.floor(r() * words.length)]
      ctx.fillText(w, x, y)
      x += ctx.measureText(w).width + S * (0.02 + r() * 0.05)
    }
  }
  // two characters arguing
  const bubble = (x: number, y: number, w: number, h: number, fill: string, tailLeft: boolean) => {
    ctx.save()
    ctx.shadowColor = 'rgba(80,20,0,0.35)'
    ctx.shadowBlur = S * 0.04
    ctx.shadowOffsetY = S * 0.015
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, h * 0.32)
    const tx = tailLeft ? x + w * 0.22 : x + w * 0.78
    ctx.moveTo(tx - S * 0.03, y + h - 2)
    ctx.lineTo(tx + (tailLeft ? -S * 0.05 : S * 0.05), y + h + S * 0.07)
    ctx.lineTo(tx + S * 0.035, y + h - 2)
    ctx.fill()
    ctx.restore()
  }
  bubble(S * 0.1, S * 0.14, S * 0.5, S * 0.26, '#fffaf1', true)
  ctx.fillStyle = '#7a2a08'
  ctx.font = `800 ${S * 0.15}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('{ }', S * 0.35, S * 0.27)
  bubble(S * 0.48, S * 0.33, S * 0.4, S * 0.21, '#2b1706', false)
  ctx.fillStyle = '#ffc24a'
  ctx.font = `800 ${S * 0.12}px ${DISPLAY}`
  ctx.fillText('?!', S * 0.68, S * 0.435)
  ctx.textAlign = 'left'
  title(ctx, ['Codebase', 'Tavern'], 'modules that argue about your bug', n)
}

function lunar(ctx: CanvasRenderingContext2D, n: number) {
  const S = ART
  const bg = ctx.createRadialGradient(S * 0.3, S * 0.2, 0, S * 0.5, S * 0.5, S * 0.8)
  bg.addColorStop(0, '#26306a')
  bg.addColorStop(1, '#070a1f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, S, S)
  const r = rng(42)
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`
    ctx.beginPath()
    ctx.arc(r() * S, r() * S * 0.7, r() * S * 0.0028 + 0.6, 0, Math.PI * 2)
    ctx.fill()
  }
  // the moon
  const mx = S * 0.66
  const my = S * 0.3
  const mr = S * 0.22
  glow(ctx, mx, my, mr * 1.9, 'rgba(255,214,150,0.25)')
  const mg = ctx.createRadialGradient(mx - mr * 0.35, my - mr * 0.35, mr * 0.1, mx, my, mr)
  mg.addColorStop(0, '#f6f1e6')
  mg.addColorStop(1, '#a7a196')
  ctx.fillStyle = mg
  ctx.beginPath()
  ctx.arc(mx, my, mr, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.clip()
  for (let i = 0; i < 9; i++) {
    const cx = mx + (r() - 0.5) * mr * 1.6
    const cy = my + (r() - 0.5) * mr * 1.6
    const cr = mr * (0.06 + r() * 0.16)
    ctx.fillStyle = 'rgba(110,104,96,0.35)'
    ctx.beginPath()
    ctx.arc(cx, cy, cr, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = S * 0.002
    ctx.beginPath()
    ctx.arc(cx + cr * 0.08, cy + cr * 0.08, cr, Math.PI * 0.9, Math.PI * 1.7)
    ctx.stroke()
  }
  ctx.restore()
  // the yard, the path and the lidar
  ctx.fillStyle = '#1a2148'
  ctx.beginPath()
  ctx.moveTo(0, S * 0.66)
  ctx.quadraticCurveTo(S * 0.5, S * 0.56, S, S * 0.64)
  ctx.lineTo(S, S)
  ctx.lineTo(0, S)
  ctx.fill()
  const rx = S * 0.3
  const ry = S * 0.63
  const fan = ctx.createRadialGradient(rx, ry, 0, rx, ry, S * 0.34)
  fan.addColorStop(0, 'rgba(255,170,40,0.55)')
  fan.addColorStop(1, 'rgba(255,170,40,0)')
  ctx.fillStyle = fan
  ctx.beginPath()
  ctx.moveTo(rx, ry)
  ctx.arc(rx, ry, S * 0.34, -Math.PI * 0.28, Math.PI * 0.05)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#ffb02e'
  ctx.lineWidth = S * 0.006
  ctx.setLineDash([S * 0.018, S * 0.016])
  ctx.beginPath()
  ctx.moveTo(-S * 0.02, S * 0.72)
  ctx.bezierCurveTo(S * 0.1, S * 0.62, S * 0.2, S * 0.7, rx, ry)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.roundRect(rx - S * 0.022, ry - S * 0.016, S * 0.044, S * 0.026, S * 0.006)
  ctx.fill()
  title(ctx, ['Lunar Rover'], 'GPS-denied autonomy, in simulation', n)
}

function cropscan(ctx: CanvasRenderingContext2D, n: number) {
  const S = ART
  const bg = ctx.createLinearGradient(0, S, S, 0)
  bg.addColorStop(0, '#0d3a20')
  bg.addColorStop(0.6, '#2e7a3c')
  bg.addColorStop(1, '#b6ea55')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, S, S)
  glow(ctx, S * 0.7, S * 0.2, S * 0.5, 'rgba(240,255,170,0.35)')
  // a leaf
  ctx.save()
  ctx.translate(S * 0.55, S * 0.38)
  ctx.rotate(-0.55)
  const leaf = new Path2D()
  leaf.moveTo(-S * 0.34, 0)
  leaf.bezierCurveTo(-S * 0.15, -S * 0.24, S * 0.2, -S * 0.22, S * 0.36, 0)
  leaf.bezierCurveTo(S * 0.2, S * 0.22, -S * 0.15, S * 0.24, -S * 0.34, 0)
  const lg = ctx.createLinearGradient(-S * 0.3, -S * 0.2, S * 0.3, S * 0.2)
  lg.addColorStop(0, '#c9f56b')
  lg.addColorStop(1, '#3f9b3e')
  ctx.fillStyle = lg
  ctx.shadowColor = 'rgba(0,30,0,0.35)'
  ctx.shadowBlur = S * 0.05
  ctx.shadowOffsetY = S * 0.02
  ctx.fill(leaf)
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = S * 0.005
  ctx.beginPath()
  ctx.moveTo(-S * 0.42, S * 0.02)
  ctx.lineTo(S * 0.34, 0)
  ctx.stroke()
  ctx.lineWidth = S * 0.0028
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue
    const x = i * S * 0.075
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.quadraticCurveTo(x + S * 0.05, -S * 0.07, x + S * 0.1, -S * 0.15)
    ctx.moveTo(x, 0)
    ctx.quadraticCurveTo(x + S * 0.05, S * 0.07, x + S * 0.1, S * 0.15)
    ctx.stroke()
  }
  // blight spots
  ctx.fillStyle = 'rgba(110,62,20,0.75)'
  for (const [x, y, rr] of [
    [S * 0.12, S * 0.05, S * 0.03],
    [S * 0.17, -S * 0.04, S * 0.018],
    [S * 0.08, -S * 0.02, S * 0.014],
  ]) {
    ctx.beginPath()
    ctx.arc(x, y, rr, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  // the scan
  const bx = S * 0.6
  const by = S * 0.24
  const bw = S * 0.2
  const bh = S * 0.18
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = S * 0.006
  const c = S * 0.04
  ctx.beginPath()
  for (const [x, y, dx, dy] of [
    [bx, by, 1, 1],
    [bx + bw, by, -1, 1],
    [bx, by + bh, 1, -1],
    [bx + bw, by + bh, -1, -1],
  ]) {
    ctx.moveTo(x, y + dy * c)
    ctx.lineTo(x, y)
    ctx.lineTo(x + dx * c, y)
  }
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.roundRect(bx, by - S * 0.065, S * 0.24, S * 0.048, S * 0.024)
  ctx.fill()
  ctx.fillStyle = '#1d4d23'
  ctx.font = `600 ${S * 0.026}px ${UI}`
  ctx.textBaseline = 'middle'
  ctx.fillText('scan · 38 classes', bx + S * 0.02, by - S * 0.041)
  ctx.textBaseline = 'alphabetic'
  title(ctx, ['CropScan'], 'leaf photo in, diagnosis out', n)
}

const PAINTERS: Record<string, (ctx: CanvasRenderingContext2D, n: number) => void> = {
  bodymap,
  'codebase-tavern': tavern,
  'lunar-rover': lunar,
  cropscan,
}

function fallback(ctx: CanvasRenderingContext2D, n: number) {
  const p = projects[n]
  const bg = ctx.createLinearGradient(0, 0, ART, ART)
  bg.addColorStop(0, p.cover[0])
  bg.addColorStop(1, p.cover[1])
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, ART, ART)
  title(ctx, [p.title], p.kind, n)
}

/** The cover art for project n (square, ART px). */
export function cover(n: number): HTMLCanvasElement {
  let c = cache.get(n)
  if (c) return c
  c = document.createElement('canvas')
  c.width = c.height = ART
  const ctx = c.getContext('2d')!
  ;(PAINTERS[projects[n].slug] ?? fallback)(ctx, n)
  cache.set(n, c)
  return c
}

const urls = new Map<number, string>()
/** Cover as a data URL, for <img> tags. */
export function coverUrl(n: number) {
  let u = urls.get(n)
  if (!u) {
    u = cover(n).toDataURL('image/jpeg', 0.86)
    urls.set(n, u)
  }
  return u
}
