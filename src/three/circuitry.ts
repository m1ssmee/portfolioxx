// Procedural textures for the parts you can see through the clear body.
// Each "orm" texture packs roughness in G and metalness in B, the way three.js reads them.
import * as THREE from 'three'
import { profile } from '../content'
import { DISPLAY, UI } from './fonts'

/** The main board sits in the lower half, around the wheel. */
export const BOARD = { x0: -0.276, x1: 0.276, y0: -0.476, y1: -0.126, z: 0.003, t: 0.006 }

/** Where the bigger parts go on the board (pod units, centres). */
export const PARTS = {
  socCan: { x: -0.212, y: -0.226, w: 0.096, h: 0.11, d: 0.014 },
  flash: { x: -0.212, y: -0.385, w: 0.076, h: 0.056, d: 0.006 },
  rfCan: { x: 0.212, y: -0.216, w: 0.094, h: 0.09, d: 0.012 },
  pmic: { x: 0.214, y: -0.303, w: 0.054, h: 0.048, d: 0.005 },
  haptic: { x: 0.208, y: -0.398, r: 0.036, d: 0.012 },
  crystal: { x: -0.226, y: -0.309, w: 0.03, h: 0.022, d: 0.006 },
  dispConn: { x: 0, y: -0.146, w: 0.12, h: 0.026, d: 0.008 },
  usb: { x: 0, y: -0.463, w: 0.1, h: 0.05, d: 0.034 },
}
export const SCREWS: [number, number][] = [
  [-0.25, -0.152],
  [0.25, -0.152],
  [-0.25, -0.452],
  [0.25, -0.452],
  [-0.268, 0.472],
  [0.268, 0.472],
]

type Scheme = { base: string; hatch: string; trace: string; pad: string; silk: string; accent: string }
const SCHEMES: Record<'black' | 'white', Scheme> = {
  black: { base: '#0c0e11', hatch: '#121519', trace: '#1b2027', pad: '#9ba2ab', silk: '#e6e9ed', accent: '#ff3b30' },
  white: { base: '#eceef1', hatch: '#e1e4e8', trace: '#d2d6dc', pad: '#a3a9b1', silk: '#24272c', accent: '#ff3b30' },
}

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, x: c.getContext('2d')! }
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 8
  return t
}

const ROUGH = 'rgb(0,200,0)' // rough, not metal
const METAL = 'rgb(0,75,255)' // fairly smooth metal

// ------------------------------------------------------------------ board
export function boardTextures(kind: 'black' | 'white') {
  const C = SCHEMES[kind]
  const BW = 1600
  const BH = Math.round((BW * (BOARD.y1 - BOARD.y0)) / (BOARD.x1 - BOARD.x0))
  const S = BW / (BOARD.x1 - BOARD.x0) // px per unit
  const P = (x: number, y: number): [number, number] => [(x - BOARD.x0) * S, (BOARD.y1 - y) * S]
  const { c, x: ctx } = canvas(BW, BH)
  const { c: oc, x: orm } = canvas(BW, BH)
  const r = rng(26)

  ctx.fillStyle = C.base
  ctx.fillRect(0, 0, BW, BH)
  orm.fillStyle = ROUGH
  orm.fillRect(0, 0, BW, BH)

  // ground pour hatch
  ctx.strokeStyle = C.hatch
  ctx.lineWidth = 2
  for (let i = -BH; i < BW; i += 12) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + BH, BH)
    ctx.stroke()
  }

  const pad = (x: number, y: number, w: number, h: number, round = false) => {
    for (const [g, col] of [
      [ctx, C.pad],
      [orm, METAL],
    ] as const) {
      g.fillStyle = col
      g.beginPath()
      if (round) g.arc(x, y, w / 2, 0, Math.PI * 2)
      else g.rect(x - w / 2, y - h / 2, w, h)
      g.fill()
    }
  }

  // traces between parts: right-angle routes with a via at each end
  const anchors: [number, number][] = []
  for (const p of Object.values(PARTS)) {
    const [px, py] = P(p.x, p.y)
    const hw = ('w' in p ? p.w : p.r * 2) * S * 0.5
    const hh = ('h' in p ? p.h : p.r * 2) * S * 0.5
    for (let k = 0; k < 14; k++) {
      const side = Math.floor(r() * 4)
      const t = r() * 2 - 1
      anchors.push(
        side === 0
          ? [px - hw - 8, py + t * hh]
          : side === 1
            ? [px + hw + 8, py + t * hh]
            : side === 2
              ? [px + t * hw, py - hh - 8]
              : [px + t * hw, py + hh + 8],
      )
    }
  }
  ctx.strokeStyle = C.trace
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let k = 0; k < 170; k++) {
    const a = anchors[Math.floor(r() * anchors.length)]
    const b = anchors[Math.floor(r() * anchors.length)]
    ctx.lineWidth = r() < 0.2 ? 6 : 3
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    const mid = a[0] + (b[0] - a[0]) * (0.3 + r() * 0.4)
    ctx.lineTo(mid, a[1])
    ctx.lineTo(mid + Math.sign(b[1] - a[1]) * Math.min(30, Math.abs(b[1] - a[1])), b[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()
    pad(a[0], a[1], 9, 9, true)
    if (r() < 0.5) pad(b[0], b[1], 9, 9, true)
  }
  // scattered vias
  for (let k = 0; k < 260; k++) pad(r() * BW, r() * BH, 6 + r() * 4, 0, true)

  // silkscreen
  const silk = (text: string, x: number, y: number, size = 22, weight = 600, align: CanvasTextAlign = 'left') => {
    ctx.fillStyle = C.silk
    ctx.font = `${weight} ${size}px ${UI}`
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x, y)
  }
  const outline = (p: { x: number; y: number; w: number; h: number }, label?: string) => {
    const [cx, cy] = P(p.x, p.y)
    const w = p.w * S + 18
    const h = p.h * S + 18
    ctx.strokeStyle = C.silk
    ctx.lineWidth = 2.5
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h)
    // pin-one corner mark
    ctx.beginPath()
    ctx.arc(cx - w / 2 - 8, cy - h / 2 - 8, 4, 0, Math.PI * 2)
    ctx.fillStyle = C.silk
    ctx.fill()
    if (label) silk(label, cx - w / 2, cy + h / 2 + 18, 20)
  }
  outline(PARTS.socCan, 'U1  SoC')
  outline(PARTS.flash, 'U4  NAND')
  outline(PARTS.rfCan, 'U7  RF')
  outline(PARTS.pmic, 'U9  PMU')
  outline(PARTS.crystal, 'Y1')
  outline(PARTS.dispConn, 'J2  DISPLAY')

  // fine-pitch pads peeking out around the chips
  for (const p of [PARTS.flash, PARTS.pmic]) {
    const [cx, cy] = P(p.x, p.y)
    const w = p.w * S
    const h = p.h * S
    const n = Math.floor(w / 16)
    for (let i = 0; i < n; i++) {
      const xx = cx - w / 2 + 8 + i * 16
      pad(xx, cy - h / 2 - 5, 6, 10)
      pad(xx, cy + h / 2 + 5, 6, 10)
    }
  }

  // mounting holes under the screws
  for (const [sx, sy] of SCREWS) {
    if (sy > BOARD.y1) continue
    const [hx, hy] = P(sx, sy)
    pad(hx, hy, 52, 0, true)
    ctx.fillStyle = C.base
    ctx.beginPath()
    ctx.arc(hx, hy, 17, 0, Math.PI * 2)
    ctx.fill()
  }

  // test points
  for (let k = 0; k < 6; k++) {
    const [tx, ty] = P(-0.255 + (k % 3) * 0.02, -0.27 - Math.floor(k / 3) * 0.02)
    pad(tx, ty, 14, 0, true)
  }

  // the maker's marks
  const [lx, ly] = P(-0.262, -0.448)
  ctx.fillStyle = C.silk
  ctx.font = `800 54px ${DISPLAY}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(profile.short, lx, ly)
  const lw = ctx.measureText(profile.short).width
  ctx.fillStyle = C.accent
  ctx.beginPath()
  ctx.arc(lx + lw + 12, ly - 8, 8, 0, Math.PI * 2)
  ctx.fill()
  silk('KP-0263 · REV B · 2026', ...P(0.262, -0.462), 18, 600, 'right')
  silk('DESIGNED BY ' + profile.name.toUpperCase(), ...P(0.262, -0.44), 16, 700, 'right')
  silk('MAIN BOARD', ...P(-0.262, -0.42), 18, 700)

  // a small QR code
  const [qx, qy] = P(-0.13, -0.47)
  const q = 7
  ctx.fillStyle = C.silk
  for (let i = 0; i < 21; i++)
    for (let j = 0; j < 21; j++) {
      const finder = (i < 7 && j < 7) || (i > 13 && j < 7) || (i < 7 && j > 13)
      const on = finder ? i % 6 === 0 || j % 6 === 0 || (i % 7 > 1 && i % 7 < 5 && j % 7 > 1 && j % 7 < 5) : r() < 0.5
      if (on) ctx.fillRect(qx + i * q, qy - 21 * q + j * q, q, q)
    }

  // plated edge
  for (const [g, col] of [
    [ctx, C.pad],
    [orm, METAL],
  ] as const) {
    g.strokeStyle = col
    g.lineWidth = 8
    g.strokeRect(4, 4, BW - 8, BH - 8)
  }
  return { map: tex(c), orm: tex(oc, false), aspect: BW / BH }
}

// ---------------------------------------------------------- wheel sensor
/** Capacitive electrodes under the clear wheel. Mapped onto a ring (u, v from -r..r). */
export function sensorTextures(kind: 'black' | 'white', outer: number, inner: number) {
  const C = SCHEMES[kind]
  const N = 1024
  const { c, x: ctx } = canvas(N, N)
  const { c: oc, x: orm } = canvas(N, N)
  const k = N / 2 / outer
  const cx = N / 2
  ctx.fillStyle = C.base
  ctx.fillRect(0, 0, N, N)
  orm.fillStyle = ROUGH
  orm.fillRect(0, 0, N, N)
  const seg = 24
  const r0 = (inner + 0.006) * k
  const r1 = (outer - 0.008) * k
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2 + 0.012
    const a1 = ((i + 1) / seg) * Math.PI * 2 - 0.012
    for (const [g, col] of [
      [ctx, C.pad],
      [orm, METAL],
    ] as const) {
      g.fillStyle = col
      g.beginPath()
      // interlocking teeth along the inner and outer edges
      const steps = 6
      for (let s = 0; s <= steps; s++) {
        const a = a0 + ((a1 - a0) * s) / steps
        const rr = r1 - (s % 2 ? 10 : 0)
        g.lineTo(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr)
      }
      for (let s = steps; s >= 0; s--) {
        const a = a0 + ((a1 - a0) * s) / steps
        const rr = r0 + (s % 2 ? 0 : 10)
        g.lineTo(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr)
      }
      g.closePath()
      g.fill()
    }
  }
  // printing around the outer edge
  ctx.fillStyle = C.silk
  ctx.font = `700 15px ${UI}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const label = 'CAP SENSE · 24 CH · WHEEL FPC · KP-0263 · '
  const rr = (outer - 0.004) * k
  for (let i = 0; i < 3; i++)
    [...label].forEach((ch, j) => {
      const a = -Math.PI / 2 + (i * label.length + j) * 0.0198
      ctx.save()
      ctx.translate(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr)
      ctx.rotate(a + Math.PI / 2)
      ctx.fillText(ch, 0, 0)
      ctx.restore()
    })
  return { map: tex(c), orm: tex(oc, false) }
}

// ----------------------------------------------------------------- battery
export function batteryLabel() {
  const W = 1024
  const H = 940
  const { c, x: ctx } = canvas(W, H)
  ctx.fillStyle = '#c3c7cd'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#16181c'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `750 64px ${DISPLAY}`
  ctx.fillText('Li-ion Polymer', 70, 140)
  ctx.font = `500 34px ${UI}`
  ctx.fillText('Nominal 3.87 V ⎓ 1250 mAh  ·  4.84 Wh', 72, 205)
  ctx.fillText('Charge limit 4.45 V  ·  Model KP-B26', 72, 255)
  ctx.font = `500 26px ${UI}`
  ctx.fillStyle = '#3a3e45'
  ctx.fillText('Do not puncture, crush or heat above 60 °C.', 72, 330)
  ctx.fillText('Assembled for ' + profile.name + '. Handle with care.', 72, 370)
  // icons: recycle loop, crossed bin, a warning triangle
  ctx.strokeStyle = '#16181c'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.arc(140, 520, 52, 0.3, Math.PI * 1.85)
  ctx.stroke()
  ctx.strokeRect(250, 470, 80, 100)
  ctx.beginPath()
  ctx.moveTo(240, 460)
  ctx.lineTo(340, 580)
  ctx.moveTo(340, 460)
  ctx.lineTo(240, 580)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(430, 575)
  ctx.lineTo(480, 470)
  ctx.lineTo(530, 575)
  ctx.closePath()
  ctx.stroke()
  ctx.font = `800 54px ${UI}`
  ctx.fillStyle = '#16181c'
  ctx.fillText('!', 470, 562)
  // barcode
  const r = rng(9)
  let x = 70
  while (x < 700) {
    const w = 3 + Math.floor(r() * 9)
    if (r() < 0.55) ctx.fillRect(x, 660, w, 150)
    x += w + 2
  }
  ctx.font = `600 26px ${UI}`
  ctx.fillText('KPB26 0263 2604 11', 70, 850)
  // a red pull-tab print
  ctx.fillStyle = '#ff3b30'
  ctx.fillRect(W - 140, 0, 70, H)
  return tex(c)
}

// ----------------------------------------------------------- small parts
/** Perforated lid for the RF shields. */
export function shieldTextures() {
  const N = 512
  const { c, x: ctx } = canvas(N, N)
  const { c: oc, x: orm } = canvas(N, N)
  ctx.fillStyle = '#c6cad0'
  ctx.fillRect(0, 0, N, N)
  orm.fillStyle = METAL
  orm.fillRect(0, 0, N, N)
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      const x = 48 + i * 60
      const y = 48 + j * 60
      ctx.fillStyle = '#30353c'
      ctx.beginPath()
      ctx.arc(x, y, 9, 0, Math.PI * 2)
      ctx.fill()
      orm.fillStyle = ROUGH
      orm.beginPath()
      orm.arc(x, y, 9, 0, Math.PI * 2)
      orm.fill()
    }
  ctx.strokeStyle = '#9ea4ac'
  ctx.lineWidth = 6
  ctx.strokeRect(10, 10, N - 20, N - 20)
  return { map: tex(c), orm: tex(oc, false) }
}

/** Laser-etched chip markings. */
export function chipTexture(lines: string[]) {
  const N = 256
  const { c, x: ctx } = canvas(N, N)
  ctx.fillStyle = '#15171b'
  ctx.fillRect(0, 0, N, N)
  ctx.fillStyle = '#868d97'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((l, i) => {
    ctx.font = `${i === 0 ? 700 : 500} ${i === 0 ? 34 : 24}px ${UI}`
    ctx.fillText(l, N / 2, N / 2 + (i - (lines.length - 1) / 2) * 38)
  })
  ctx.beginPath()
  ctx.arc(28, 28, 9, 0, Math.PI * 2)
  ctx.fill()
  return tex(c)
}

/** A flat flex cable with fine traces and a printed label. */
export function flexTexture(kind: 'black' | 'white', label: string) {
  const W = 256
  const H = 512
  const { c, x: ctx } = canvas(W, H)
  ctx.fillStyle = kind === 'black' ? '#23272e' : '#cfd3d9'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = kind === 'black' ? '#39404a' : '#b7bcc4'
  ctx.lineWidth = 3
  for (let x = 20; x < W - 10; x += 14) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = kind === 'black' ? '#e6e9ed' : '#24272c'
  ctx.font = `700 30px ${UI}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 0, 0)
  ctx.restore()
  return tex(c)
}

/** The fine mesh over an earbud's speaker. */
export function grilleTexture() {
  const N = 256
  const { c, x: ctx } = canvas(N, N)
  ctx.fillStyle = '#4a4e55'
  ctx.fillRect(0, 0, N, N)
  ctx.fillStyle = '#1b1d21'
  for (let i = 0; i < 26; i++)
    for (let j = 0; j < 26; j++) {
      ctx.beginPath()
      ctx.arc(6 + i * 10 + (j % 2) * 5, 6 + j * 10, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
  return tex(c)
}
